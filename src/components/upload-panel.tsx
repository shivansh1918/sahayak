import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { processSource, registerSource } from "@/lib/sources.functions";
import { sha256Hex } from "@/lib/hash";
import { detectSourceType } from "@/lib/intel-schema";
import { deriveVideoArtifacts } from "@/lib/video-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel, StatusChip } from "@/components/intel-ui";

type Progress = { name: string; stage: string; status: "working" | "done" | "failed"; detail?: string };

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.mp4,.mov,.mkv,.webm,.txt,.md,.log,.csv,.json";
const MAX_BYTES = 200 * 1024 * 1024;

export function UploadPanel({ investigationId }: { investigationId: string }) {
  const register = useServerFn(registerSource);
  const process = useServerFn(processSource);
  const qc = useQueryClient();

  const [items, setItems] = useState<Progress[]>([]);
  const [busy, setBusy] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualText, setManualText] = useState("");

  function update(name: string, patch: Partial<Progress>) {
    setItems((prev) => prev.map((i) => (i.name === name ? { ...i, ...patch } : i)));
  }

  async function ingest(file: File, displayName: string) {
    update(displayName, { stage: "Hashing", status: "working" });
    const bytes = await file.arrayBuffer();
    const contentHash = await sha256Hex(bytes);
    const type = detectSourceType(file.name, file.type);

    const basePath = `${investigationId}/${contentHash}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    update(displayName, { stage: "Uploading" });
    const up = await supabase.storage
      .from("intelligence-sources")
      .upload(basePath, file, { upsert: true, contentType: file.type || "application/octet-stream" });
    if (up.error) throw new Error(up.error.message);

    let videoArtifacts: {
      audioPath: string | null;
      audioMime: string | null;
      durationSeconds: number | null;
      frames: { index: number; timestamp: number; path: string }[];
    } | null = null;

    if (type === "video") {
      update(displayName, { stage: "Extracting audio and frames" });
      const derived = await deriveVideoArtifacts(file);
      let audioPath: string | null = null;
      if (derived.audio) {
        audioPath = `${investigationId}/${contentHash}/audio.wav`;
        const a = await supabase.storage
          .from("video-derived")
          .upload(audioPath, derived.audio, { upsert: true, contentType: "audio/wav" });
        if (a.error) throw new Error(a.error.message);
      }
      const frames: { index: number; timestamp: number; path: string }[] = [];
      for (const frame of derived.frames) {
        const path = `${investigationId}/${contentHash}/frame-${String(frame.index).padStart(3, "0")}.jpg`;
        const f = await supabase.storage
          .from("video-derived")
          .upload(path, frame.blob, { upsert: true, contentType: "image/jpeg" });
        if (f.error) throw new Error(f.error.message);
        frames.push({ index: frame.index, timestamp: frame.timestamp, path });
      }
      if (!audioPath && frames.length === 0) {
        throw new Error("This video could not be decoded in the browser; no audio or frames were produced.");
      }
      if (derived.warnings.length) toast.warning(derived.warnings.join(" "));
      videoArtifacts = {
        audioPath,
        audioMime: audioPath ? "audio/wav" : null,
        durationSeconds: derived.durationSeconds,
        frames,
      };
    }

    update(displayName, { stage: "Registering source" });
    const result = await register({
      data: {
        investigationId,
        title: displayName,
        storageBucket: "intelligence-sources" as const,
        storagePath: basePath,
        originalFilename: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        contentHash,
        language: null,
        videoArtifacts,
      },
    });

    if (result.duplicate) {
      update(displayName, { stage: "Already ingested", status: "done", detail: "Duplicate content hash — existing source kept." });
      return;
    }

    update(displayName, { stage: "Processing", status: "working" });
    try {
      await process({ data: { sourceId: result.id, force: false } });
      update(displayName, { stage: "Processed", status: "done" });
    } catch (err) {
      update(displayName, {
        stage: "Processing failed",
        status: "failed",
        detail: err instanceof Error ? err.message : "Unknown processing error.",
      });
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList).filter((f) => {
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} is larger than 200 MB and was skipped.`);
        return false;
      }
      if (f.size === 0) {
        toast.error(`${f.name} is empty and was skipped.`);
        return false;
      }
      return true;
    });
    if (!files.length) return;

    setBusy(true);
    setItems(files.map((f) => ({ name: f.name, stage: "Queued", status: "working" as const })));
    for (const file of files) {
      try {
        await ingest(file, file.name);
      } catch (err) {
        update(file.name, {
          stage: "Failed",
          status: "failed",
          detail: err instanceof Error ? err.message : "Upload failed.",
        });
      }
    }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["investigation", investigationId] });
  }

  async function submitManualText(e: React.FormEvent) {
    e.preventDefault();
    if (!manualText.trim()) return;
    const name = `${(manualTitle.trim() || "Analyst note").replace(/[^\w \-]/g, "")}.txt`;
    const file = new File([manualText], name, { type: "text/plain" });
    setBusy(true);
    setItems([{ name, stage: "Queued", status: "working" }]);
    try {
      await ingest(file, name);
      setManualText("");
      setManualTitle("");
    } catch (err) {
      update(name, { stage: "Failed", status: "failed", detail: err instanceof Error ? err.message : "Failed." });
    }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["investigation", investigationId] });
  }

  return (
    <Panel className="p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ingest intelligence</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        PDF, images, audio, voice, video, text, CSV, JSON and logs. Originals are preserved in private storage; video
        audio and sampled frames are derived in your browser before secure server-side processing.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Input type="file" multiple accept={ACCEPT} disabled={busy} onChange={(e) => handleFiles(e.target.files)} className="max-w-md" />
        {busy ? <span className="text-xs text-muted-foreground">Processing… you can keep working elsewhere.</span> : null}
      </div>

      <form className="mt-5 space-y-3 border-t border-border/60 pt-5" onSubmit={submitManualText}>
        <Label htmlFor="manual">Manual text source</Label>
        <Input
          id="manual-title"
          placeholder="Title (optional)"
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
        />
        <Textarea
          id="manual"
          rows={4}
          placeholder="Paste a report, message log or field note…"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={busy || !manualText.trim()}>
          Add text source
        </Button>
      </form>

      {items.length ? (
        <ul className="mt-5 space-y-2 border-t border-border/60 pt-4">
          {items.map((i) => (
            <li key={i.name} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="truncate text-foreground">{i.name}</span>
              <span className="flex items-center gap-2">
                {i.detail ? <span className="text-xs text-muted-foreground">{i.detail}</span> : null}
                <StatusChip status={i.status === "done" ? "processed" : i.status === "failed" ? "failed" : "processing"} />
                <span className="text-xs text-muted-foreground">{i.stage}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

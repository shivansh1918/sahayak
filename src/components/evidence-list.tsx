import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { getSourceSignedUrl } from "@/lib/app.functions";
import { Panel } from "@/components/intel-ui";

export type EvidenceRow = {
  id: string;
  evidence_type: string | null;
  evidence_text: string | null;
  location_reference: string | null;
  page_number?: number | null;
  timestamp_seconds?: number | null;
  confidence?: number | null;
  intelligence_sources?: {
    id: string;
    title: string | null;
    source_type: string | null;
    original_filename?: string | null;
  } | null;
};

function formatTime(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Renders the evidence chain: quote, where it came from, and a link to the original file. */
export function EvidenceList({ evidence, openSource }: { evidence: EvidenceRow[]; openSource?: (sourceId: string) => void }) {
  const signed = useServerFn(getSourceSignedUrl);

  if (!evidence.length) {
    return <p className="text-sm text-muted-foreground">No evidence records are linked yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {evidence.map((e) => {
        const locator = [
          e.page_number ? `page ${e.page_number}` : null,
          formatTime(e.timestamp_seconds) ? `at ${formatTime(e.timestamp_seconds)}` : null,
          e.location_reference,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={e.id}>
            <Panel className="p-4">
              <p className="whitespace-pre-wrap text-sm text-foreground">{e.evidence_text ?? "(no quoted text)"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono uppercase tracking-wider">{e.evidence_type ?? "evidence"}</span>
                {e.intelligence_sources ? (
                  <span>
                    {e.intelligence_sources.title ?? e.intelligence_sources.original_filename} (
                    {e.intelligence_sources.source_type})
                  </span>
                ) : null}
                {locator ? <span>{locator}</span> : null}
                {e.intelligence_sources && openSource ? (
                  <button className="text-primary hover:underline" onClick={() => openSource(e.intelligence_sources!.id)}>
                    Open source
                  </button>
                ) : null}
              </div>
            </Panel>
          </li>
        );
      })}
    </ul>
  );
}

export function useOpenOriginal() {
  const signed = useServerFn(getSourceSignedUrl);
  return async (bucket: "intelligence-sources" | "video-derived", path: string) => {
    try {
      const { url } = await signed({ data: { bucket, path } });
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open the original file.");
    }
  };
}

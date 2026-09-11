import { analyzeImage, normalizeToEnglish } from "./ai.server";
import type { Extraction } from "./intel-schema";
import { digitiseDocument, transcribeAudio, ProviderError } from "./sarvam.server";
import { normalizeTextSource, persistExtraction, type Sb } from "./pipeline.server";

type VideoArtifacts = {
  audioPath: string | null;
  audioMime: string | null;
  durationSeconds: number | null;
  frames: { index: number; timestamp: number; path: string }[];
};

async function download(sb: Sb, bucket: string, path: string): Promise<Uint8Array> {
  const { data, error } = await sb.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Could not read the uploaded file: ${error?.message ?? "missing"}`);
  return new Uint8Array(await data.arrayBuffer());
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function startJob(
  sb: Sb,
  sourceId: string,
  provider: string,
  jobType: string,
  requestMetadata: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await sb
    .from("source_processing_jobs")
    .insert({
      source_id: sourceId,
      provider,
      job_type: jobType,
      status: "running",
      request_metadata: requestMetadata,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function finishJob(
  sb: Sb,
  jobId: string,
  status: "succeeded" | "failed",
  payload: { external_job_id?: string | null; response_metadata?: Record<string, unknown>; error_message?: string },
) {
  await sb
    .from("source_processing_jobs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      external_job_id: payload.external_job_id ?? null,
      response_metadata: payload.response_metadata ?? {},
      error_message: payload.error_message ?? null,
    })
    .eq("id", jobId);
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type PipelineResult = {
  status: "processed" | "failed";
  sourceType: string;
  counts: { entities: number; events: number; relationships: number; evidence: number };
  message: string;
};

/** Provider extraction + normalization + structured persistence for a single source. */
export async function runSourcePipeline(
  sb: Sb,
  args: {
    sourceId: string;
    force: boolean;
    extract: (input: { label: string; sourceType: string; content: string }) => Promise<Extraction>;
  },
): Promise<PipelineResult> {
  const { data: source, error } = await sb
    .from("intelligence_sources")
    .select("*")
    .eq("id", args.sourceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!source) throw new Error("Source not found or not accessible.");

  if (source.processing_status === "processed" && !args.force) {
    return {
      status: "processed",
      sourceType: source.source_type,
      counts: { entities: 0, events: 0, relationships: 0, evidence: 0 },
      message: "This source was already processed. Re-run with retry to process it again.",
    };
  }

  await sb
    .from("intelligence_sources")
    .update({ processing_status: "processing", processing_error: null })
    .eq("id", source.id);

  try {
    let originalContent = "";
    let detectedLanguage: string | null = source.original_language ?? null;
    const type = source.source_type;

    if (type === "pdf" || type === "image") {
      const bytes = await download(sb, source.storage_bucket, source.storage_path);
      const jobId = await startJob(sb, source.id, "sarvam", "document_digitise", {
        filename: source.original_filename,
        bytes: bytes.length,
      });
      try {
        const result = await digitiseDocument({
          bytes,
          filename: source.original_filename,
          mime: source.mime_type,
          isPdf: type === "pdf",
          language: source.original_language,
        });
        await finishJob(sb, jobId, "succeeded", {
          external_job_id: result.jobIds[0] ?? null,
          response_metadata: { job_ids: result.jobIds, pages: result.pages.length, partial: result.partial },
        });
        if (!result.pages.length) throw new Error("The document produced no readable pages.");

        await sb.from("document_pages").upsert(
          result.pages.map((p) => ({
            source_id: source.id,
            page_number: p.page_number,
            extracted_content: p.extracted_content,
            structured_content: p.structured_content as never,
            metadata: {},
          })),
          { onConflict: "source_id,page_number" },
        );
        originalContent = result.pages
          .map((p) => `[page ${p.page_number}]\n${p.extracted_content}`)
          .join("\n\n");
      } catch (err) {
        await finishJob(sb, jobId, "failed", { error_message: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    } else if (type === "audio") {
      const bytes = await download(sb, source.storage_bucket, source.storage_path);
      const jobId = await startJob(sb, source.id, "sarvam", "speech_to_text", {
        filename: source.original_filename,
        bytes: bytes.length,
      });
      try {
        const result = await transcribeAudio({
          bytes,
          filename: source.original_filename,
          mime: source.mime_type,
        });
        await finishJob(sb, jobId, "succeeded", {
          response_metadata: { language: result.language, segments: result.segments.length },
        });
        if (!result.transcript.trim()) throw new Error("No speech could be transcribed from this audio.");
        detectedLanguage = result.language ?? detectedLanguage;

        await sb.from("audio_transcripts").delete().eq("source_id", source.id);
        const { data: transcriptRow, error: tErr } = await sb
          .from("audio_transcripts")
          .insert({
            source_id: source.id,
            language: result.language,
            transcript: result.transcript,
            metadata: {},
          })
          .select("id")
          .single();
        if (tErr) throw new Error(tErr.message);
        if (result.segments.length) {
          await sb.from("transcript_segments").insert(
            result.segments.map((s) => ({
              transcript_id: transcriptRow.id,
              speaker_label: s.speaker_label,
              start_time: s.start_time,
              end_time: s.end_time,
              text: s.text,
              metadata: {},
            })),
          );
        }
        originalContent = result.segments.length
          ? result.segments.map((s) => `[${formatTime(s.start_time)}] ${s.text}`).join("\n")
          : result.transcript;
      } catch (err) {
        await finishJob(sb, jobId, "failed", { error_message: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    } else if (type === "video") {
      const artifacts = ((source.metadata as { video?: VideoArtifacts } | null)?.video ?? null) as VideoArtifacts | null;
      if (!artifacts || (!artifacts.audioPath && artifacts.frames.length === 0)) {
        throw new Error(
          "This video has no extracted audio or frames. Re-upload it so the browser can extract them.",
        );
      }

      const parts: string[] = [];

      if (artifacts.audioPath) {
        const audioBytes = await download(sb, "video-derived", artifacts.audioPath);
        const jobId = await startJob(sb, source.id, "sarvam", "speech_to_text", {
          derived_audio: artifacts.audioPath,
          bytes: audioBytes.length,
        });
        try {
          const result = await transcribeAudio({
            bytes: audioBytes,
            filename: "video-audio.wav",
            mime: artifacts.audioMime ?? "audio/wav",
          });
          await finishJob(sb, jobId, "succeeded", {
            response_metadata: { language: result.language, segments: result.segments.length },
          });
          detectedLanguage = result.language ?? detectedLanguage;
          if (result.transcript.trim()) {
            await sb.from("audio_transcripts").delete().eq("source_id", source.id);
            const { data: transcriptRow, error: tErr } = await sb
              .from("audio_transcripts")
              .insert({
                source_id: source.id,
                language: result.language,
                transcript: result.transcript,
                metadata: { derived_from: "video_audio_track" },
              })
              .select("id")
              .single();
            if (tErr) throw new Error(tErr.message);
            if (result.segments.length) {
              await sb.from("transcript_segments").insert(
                result.segments.map((s) => ({
                  transcript_id: transcriptRow.id,
                  speaker_label: s.speaker_label,
                  start_time: s.start_time,
                  end_time: s.end_time,
                  text: s.text,
                  metadata: {},
                })),
              );
            }
            parts.push(
              `SPOKEN CONTENT (timestamped):\n${
                result.segments.length
                  ? result.segments.map((s) => `[${formatTime(s.start_time)}] ${s.text}`).join("\n")
                  : result.transcript
              }`,
            );
          }
        } catch (err) {
          await finishJob(sb, jobId, "failed", { error_message: err instanceof Error ? err.message : String(err) });
          throw err;
        }
      }

      if (artifacts.frames.length) {
        const frameRows = artifacts.frames.map((f) => ({
          source_id: source.id,
          frame_index: f.index,
          timestamp_seconds: f.timestamp,
          storage_bucket: "video-derived",
          storage_path: f.path,
          analysis_status: "pending",
        }));
        const { data: inserted, error: fErr } = await sb
          .from("video_frames")
          .upsert(frameRows, { onConflict: "source_id,frame_index" })
          .select("id, frame_index, timestamp_seconds, storage_path");
        if (fErr) throw new Error(fErr.message);

        const visualLines: string[] = [];
        for (const frame of (inserted ?? []).sort((a, b) => a.frame_index - b.frame_index)) {
          const jobId = await startJob(sb, source.id, "lovable-ai", "frame_analysis", {
            frame_index: frame.frame_index,
          });
          try {
            const bytes = await download(sb, "video-derived", frame.storage_path);
            const analysis = await analyzeImage({
              dataUrl: `data:image/jpeg;base64,${toBase64(bytes)}`,
              hint: `Frame sampled at ${formatTime(frame.timestamp_seconds)} of a video source.`,
            });
            const rows = [
              ...analysis.observations.map((text) => ({
                frame_id: frame.id,
                observation_type: "visual",
                observation_text: text,
                confidence: null,
                metadata: {},
              })),
              ...(analysis.ocr_text
                ? [
                    {
                      frame_id: frame.id,
                      observation_type: "ocr",
                      observation_text: analysis.ocr_text,
                      confidence: null,
                      metadata: {},
                    },
                  ]
                : []),
            ];
            await sb.from("visual_observations").delete().eq("frame_id", frame.id);
            if (rows.length) await sb.from("visual_observations").insert(rows);
            await sb.from("video_frames").update({ analysis_status: "analyzed" }).eq("id", frame.id);
            await finishJob(sb, jobId, "succeeded", { response_metadata: { observations: rows.length } });
            for (const row of rows) {
              visualLines.push(
                `[${formatTime(frame.timestamp_seconds)}] ${row.observation_type === "ocr" ? "visible text" : "visual"}: ${row.observation_text}`,
              );
            }
          } catch (err) {
            await sb.from("video_frames").update({ analysis_status: "failed" }).eq("id", frame.id);
            await finishJob(sb, jobId, "failed", { error_message: err instanceof Error ? err.message : String(err) });
          }
        }
        if (visualLines.length) parts.push(`VISUAL CONTENT (timestamped):\n${visualLines.join("\n")}`);
      }

      if (!parts.length) throw new Error("Neither speech nor visual content could be extracted from this video.");
      originalContent = parts.join("\n\n");
    } else {
      const bytes = await download(sb, source.storage_bucket, source.storage_path);
      const text = new TextDecoder().decode(bytes);
      if (!text.trim()) throw new Error("This file contains no readable text.");
      const normalized = normalizeTextSource(text, type);
      originalContent = normalized.normalized;
      await sb
        .from("intelligence_sources")
        .update({ metadata: { ...(source.metadata as object), ...normalized.metadata } })
        .eq("id", source.id);
    }

    // Optional English normalization for multilingual sources — the original is kept intact.
    let normalizedContent: string | null = null;
    if (detectedLanguage && !/^en/i.test(detectedLanguage)) {
      try {
        normalizedContent = await normalizeToEnglish(originalContent);
      } catch {
        normalizedContent = null;
      }
    }

    const extraction = await args.extract({
      label: source.title,
      sourceType: type,
      content: normalizedContent ?? originalContent,
    });

    const counts = await persistExtraction(sb, {
      investigationId: source.investigation_id,
      sourceId: source.id,
      extraction,
    });

    await sb
      .from("intelligence_sources")
      .update({
        processing_status: "processed",
        processing_error: null,
        original_content: originalContent.slice(0, 400_000),
        normalized_content: normalizedContent?.slice(0, 400_000) ?? null,
        original_language: detectedLanguage ?? extraction.detected_language ?? null,
        normalized_language: normalizedContent ? "en" : null,
      })
      .eq("id", source.id);

    return {
      status: "processed",
      sourceType: type,
      counts,
      message: `Extracted ${counts.entities} entities, ${counts.events} events, ${counts.relationships} relationships and ${counts.evidence} evidence records.`,
    };
  } catch (err) {
    const message =
      err instanceof ProviderError || err instanceof Error ? err.message : "Processing failed unexpectedly.";
    await sb
      .from("intelligence_sources")
      .update({ processing_status: "failed", processing_error: message })
      .eq("id", args.sourceId);
    return {
      status: "failed",
      sourceType: source.source_type,
      counts: { entities: 0, events: 0, relationships: 0, evidence: 0 },
      message,
    };
  }
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractIntelligence } from "./ai.server";
import { detectSourceType } from "./intel-schema";

const uuid = z.string().uuid();

export const listInvestigations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("investigations")
      .select("id, title, description, priority, status, tags, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createInvestigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(4000).nullable().default(null),
        priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
        tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("investigations")
      .insert({
        title: data.title,
        description: data.description,
        priority: data.priority,
        tags: data.tags,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const getInvestigation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ investigationId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const [investigation, sources, counts, run] = await Promise.all([
      sb
        .from("investigations")
        .select("id, title, description, priority, status, tags, created_at, updated_at")
        .eq("id", data.investigationId)
        .maybeSingle(),
      sb
        .from("intelligence_sources")
        .select(
          "id, title, source_type, mime_type, original_filename, file_size, processing_status, processing_error, original_language, created_at",
        )
        .eq("investigation_id", data.investigationId)
        .order("created_at", { ascending: false }),
      Promise.all([
        sb.from("entities").select("id", { count: "exact", head: true }).eq("investigation_id", data.investigationId),
        sb.from("events").select("id", { count: "exact", head: true }).eq("investigation_id", data.investigationId),
        sb.from("relationships").select("id", { count: "exact", head: true }).eq("investigation_id", data.investigationId),
        sb.from("patterns").select("id", { count: "exact", head: true }).eq("investigation_id", data.investigationId),
        sb.from("findings").select("id", { count: "exact", head: true }).eq("investigation_id", data.investigationId),
        sb.from("evidence").select("id", { count: "exact", head: true }).eq("investigation_id", data.investigationId),
      ]),
      sb
        .from("analysis_runs")
        .select("*")
        .eq("investigation_id", data.investigationId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (investigation.error) throw new Error(investigation.error.message);
    if (!investigation.data) throw new Error("Investigation not found or not accessible.");

    return {
      investigation: investigation.data,
      sources: sources.data ?? [],
      counts: {
        entities: counts[0].count ?? 0,
        events: counts[1].count ?? 0,
        relationships: counts[2].count ?? 0,
        patterns: counts[3].count ?? 0,
        findings: counts[4].count ?? 0,
        evidence: counts[5].count ?? 0,
      },
      lastRun: run.data ?? null,
    };
  });

/** Registers an already-uploaded file (and any browser-derived video artifacts) as a source. */
export const registerSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        investigationId: uuid,
        title: z.string().trim().min(1).max(200),
        storageBucket: z.enum(["intelligence-sources"]),
        storagePath: z.string().min(1),
        originalFilename: z.string().min(1),
        mimeType: z.string().min(1),
        fileSize: z.number().int().nonnegative(),
        contentHash: z.string().min(16),
        language: z.string().trim().max(20).nullable().default(null),
        videoArtifacts: z
          .object({
            audioPath: z.string().min(1).nullable(),
            audioMime: z.string().min(1).nullable(),
            durationSeconds: z.number().nonnegative().nullable(),
            frames: z
              .array(z.object({ index: z.number().int().nonnegative(), timestamp: z.number().nonnegative(), path: z.string().min(1) }))
              .max(60)
              .default([]),
          })
          .nullable()
          .default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sourceType = detectSourceType(data.originalFilename, data.mimeType);

    const { data: existing } = await context.supabase
      .from("intelligence_sources")
      .select("id, processing_status")
      .eq("investigation_id", data.investigationId)
      .eq("content_hash", data.contentHash)
      .maybeSingle();
    if (existing) return { id: existing.id, duplicate: true as const };

    const { data: row, error } = await context.supabase
      .from("intelligence_sources")
      .insert({
        investigation_id: data.investigationId,
        title: data.title,
        source_type: sourceType,
        mime_type: data.mimeType,
        storage_bucket: data.storageBucket,
        storage_path: data.storagePath,
        original_filename: data.originalFilename,
        file_size: data.fileSize,
        original_language: data.language,
        processing_status: "pending",
        content_hash: data.contentHash,
        created_by: context.userId,
        metadata: data.videoArtifacts ? { video: data.videoArtifacts } : {},
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, duplicate: false as const };
  });

export const deleteSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sourceId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: source } = await context.supabase
      .from("intelligence_sources")
      .select("storage_bucket, storage_path")
      .eq("id", data.sourceId)
      .maybeSingle();
    const { error } = await context.supabase.from("intelligence_sources").delete().eq("id", data.sourceId);
    if (error) throw new Error(error.message);
    if (source) {
      await context.supabase.storage.from(source.storage_bucket).remove([source.storage_path]);
    }
    return { ok: true };
  });

/**
 * Runs the full extraction pipeline for one source.
 * Provider calls are recorded as processing jobs, so a retry resumes instead of
 * duplicating work, and every derived record keeps its page/timestamp provenance.
 */
export const processSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sourceId: uuid, force: z.boolean().default(false) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { runSourcePipeline } = await import("./process.server");
    return runSourcePipeline(sb, {
      sourceId: data.sourceId,
      force: data.force,
      extract: extractIntelligence,
    });
  });

export const getSourceDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sourceId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const source = await sb
      .from("intelligence_sources")
      .select("*")
      .eq("id", data.sourceId)
      .maybeSingle();
    if (source.error) throw new Error(source.error.message);
    if (!source.data) throw new Error("Source not found or not accessible.");

    const [pages, transcript, frames, jobs, evidence] = await Promise.all([
      sb
        .from("document_pages")
        .select("page_number, extracted_content")
        .eq("source_id", data.sourceId)
        .order("page_number"),
      sb.from("audio_transcripts").select("id, language, transcript").eq("source_id", data.sourceId).maybeSingle(),
      sb
        .from("video_frames")
        .select("id, frame_index, timestamp_seconds, analysis_status, visual_observations(observation_text, observation_type, confidence)")
        .eq("source_id", data.sourceId)
        .order("frame_index"),
      sb
        .from("source_processing_jobs")
        .select("provider, job_type, status, external_job_id, error_message, started_at, completed_at")
        .eq("source_id", data.sourceId)
        .order("created_at", { ascending: false }),
      sb
        .from("evidence")
        .select("id, evidence_type, evidence_text, location_reference, page_number, timestamp_seconds, confidence")
        .eq("source_id", data.sourceId)
        .order("created_at")
        .limit(500),
    ]);

    let segments: { speaker_label: string | null; start_time: number | null; end_time: number | null; text: string }[] = [];
    if (transcript.data?.id) {
      const seg = await sb
        .from("transcript_segments")
        .select("speaker_label, start_time, end_time, text")
        .eq("transcript_id", transcript.data.id)
        .order("start_time", { nullsFirst: true })
        .limit(2000);
      segments = seg.data ?? [];
    }

    return {
      source: source.data,
      pages: pages.data ?? [],
      transcript: transcript.data ?? null,
      segments,
      frames: frames.data ?? [],
      jobs: jobs.data ?? [],
      evidence: evidence.data ?? [],
    };
  });

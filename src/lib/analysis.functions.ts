import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

/** Cross-source correlation, pattern detection and finding generation for one investigation. */
export const runAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ investigationId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: run, error: runError } = await sb
      .from("analysis_runs")
      .insert({
        investigation_id: data.investigationId,
        status: "running",
        created_by: context.userId,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (runError) throw new Error(runError.message);

    try {
      const { correlateInvestigation } = await import("./correlate.server");
      const result = await correlateInvestigation(sb, data.investigationId);
      const { count: sourceCount } = await sb
        .from("intelligence_sources")
        .select("id", { count: "exact", head: true })
        .eq("investigation_id", data.investigationId)
        .eq("processing_status", "processed");

      await sb
        .from("analysis_runs")
        .update({
          status: result.errors.length ? "completed_with_errors" : "completed",
          sources_processed: sourceCount ?? 0,
          patterns_found: result.patterns,
          findings_found: result.findings,
          error_summary: result.errors.length ? result.errors.join("\n") : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      return { ...result, runId: run.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed unexpectedly.";
      await sb
        .from("analysis_runs")
        .update({ status: "failed", error_summary: message, completed_at: new Date().toISOString() })
        .eq("id", run.id);
      throw new Error(message);
    }
  });

export const listEntities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ investigationId: uuid, search: z.string().trim().max(120).default("") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("entities")
      .select("id, name, entity_type, description, confidence, risk_score, first_seen, last_seen")
      .eq("investigation_id", data.investigationId)
      .order("risk_score", { ascending: false, nullsFirst: false })
      .limit(500);
    if (data.search) query = query.ilike("normalized_name", `%${data.search.toLowerCase()}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getEntityDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ entityId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const entity = await sb.from("entities").select("*").eq("id", data.entityId).maybeSingle();
    if (entity.error) throw new Error(entity.error.message);
    if (!entity.data) throw new Error("Entity not found or not accessible.");

    const [aliases, evidence, relationships, events] = await Promise.all([
      sb.from("entity_aliases").select("alias, confidence").eq("entity_id", data.entityId),
      sb
        .from("evidence")
        .select(
          "id, evidence_type, evidence_text, location_reference, page_number, timestamp_seconds, confidence, intelligence_sources(id, title, source_type)",
        )
        .eq("entity_id", data.entityId)
        .limit(300),
      sb
        .from("relationships")
        .select("id, relationship_type, confidence, source_entity_id, target_entity_id")
        .or(`source_entity_id.eq.${data.entityId},target_entity_id.eq.${data.entityId}`),
      sb.from("event_participants").select("role, events(id, title, event_time, event_time_text)").eq("entity_id", data.entityId),
    ]);

    const counterpartIds = Array.from(
      new Set(
        (relationships.data ?? []).flatMap((r) =>
          [r.source_entity_id, r.target_entity_id].filter((id) => id !== data.entityId),
        ),
      ),
    );
    const counterparts = counterpartIds.length
      ? (await sb.from("entities").select("id, name, entity_type").in("id", counterpartIds)).data ?? []
      : [];

    return {
      entity: entity.data,
      aliases: aliases.data ?? [],
      evidence: evidence.data ?? [],
      relationships: relationships.data ?? [],
      counterparts,
      events: events.data ?? [],
    };
  });

export const getGraph = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ investigationId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const [entities, relationships] = await Promise.all([
      sb
        .from("entities")
        .select("id, name, entity_type, risk_score, confidence")
        .eq("investigation_id", data.investigationId)
        .limit(400),
      sb
        .from("relationships")
        .select("id, source_entity_id, target_entity_id, relationship_type, confidence")
        .eq("investigation_id", data.investigationId)
        .limit(1500),
    ]);
    if (entities.error) throw new Error(entities.error.message);
    return { nodes: entities.data ?? [], edges: relationships.data ?? [] };
  });

export const listTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ investigationId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("events")
      .select(
        "id, title, description, event_type, event_time, event_time_text, location_text, confidence, event_participants(role, entities(id, name, entity_type))",
      )
      .eq("investigation_id", data.investigationId)
      .order("event_time", { ascending: true, nullsFirst: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listPatterns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ investigationId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("patterns")
      .select(
        "id, title, description, pattern_type, risk_level, confidence, uncertainty, source_count, evidence_count, created_at, pattern_entities(entities(id, name, entity_type))",
      )
      .eq("investigation_id", data.investigationId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listFindings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        investigationId: uuid,
        status: z.enum(["all", "pending_review", "accepted", "rejected", "needs_more_evidence"]).default("all"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("findings")
      .select(
        "id, title, summary, detection_reason, risk_level, confidence, facts, inference, uncertainty, status, created_at, patterns(id, title, pattern_type, source_count)",
      )
      .eq("investigation_id", data.investigationId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getFindingDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ findingId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const finding = await sb
      .from("findings")
      .select("*, patterns(id, title, pattern_type, description, uncertainty, source_count)")
      .eq("id", data.findingId)
      .maybeSingle();
    if (finding.error) throw new Error(finding.error.message);
    if (!finding.data) throw new Error("Finding not found or not accessible.");

    const [links, reviews] = await Promise.all([
      sb
        .from("finding_evidence")
        .select(
          "evidence(id, evidence_type, evidence_text, location_reference, page_number, timestamp_seconds, confidence, intelligence_sources(id, title, source_type, original_filename))",
        )
        .eq("finding_id", data.findingId)
        .limit(300),
      sb
        .from("analyst_reviews")
        .select("id, decision, notes, created_at, analyst_id, profiles:analyst_id(full_name, email)")
        .eq("finding_id", data.findingId)
        .order("created_at", { ascending: false }),
    ]);

    return {
      finding: finding.data,
      evidence: (links.data ?? []).map((l) => l.evidence).filter(Boolean),
      reviews: reviews.data ?? [],
    };
  });

export const reviewFinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        findingId: uuid,
        decision: z.enum(["accepted", "rejected", "needs_more_evidence"]),
        notes: z.string().trim().max(4000).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { error: reviewError } = await sb.from("analyst_reviews").insert({
      finding_id: data.findingId,
      analyst_id: context.userId,
      decision: data.decision,
      notes: data.notes,
    });
    if (reviewError) throw new Error(reviewError.message);
    const { error } = await sb.from("findings").update({ status: data.decision }).eq("id", data.findingId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMatchCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ investigationId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("entity_match_candidates")
      .select(
        "id, confidence, reason, status, created_at, a:entity_a_id(id, name, entity_type), b:entity_b_id(id, name, entity_type)",
      )
      .eq("investigation_id", data.investigationId)
      .order("confidence", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const decideMatchCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ candidateId: uuid, status: z.enum(["confirmed", "rejected"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: candidate, error: readError } = await sb
      .from("entity_match_candidates")
      .select("entity_a_id, entity_b_id, investigation_id")
      .eq("id", data.candidateId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!candidate) throw new Error("Match candidate not found.");

    const { error } = await sb
      .from("entity_match_candidates")
      .update({ status: data.status, decided_by: context.userId })
      .eq("id", data.candidateId);
    if (error) throw new Error(error.message);

    if (data.status === "confirmed") {
      // A confirmed match records the alias link only; the analyst's decision is auditable
      // and the underlying records keep their own provenance.
      const { data: b } = await sb.from("entities").select("name").eq("id", candidate.entity_b_id).maybeSingle();
      if (b) {
        await sb
          .from("entity_aliases")
          .upsert({ entity_id: candidate.entity_a_id, alias: b.name, source_id: null, confidence: 1 }, { onConflict: "entity_id,alias" });
      }
    }
    return { ok: true };
  });

export const searchInvestigation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ investigationId: uuid, query: z.string().trim().min(1).max(160) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const term = `%${data.query}%`;
    const [entities, events, findings, evidence] = await Promise.all([
      sb
        .from("entities")
        .select("id, name, entity_type")
        .eq("investigation_id", data.investigationId)
        .ilike("normalized_name", `%${data.query.toLowerCase()}%`)
        .limit(30),
      sb.from("events").select("id, title, event_time_text").eq("investigation_id", data.investigationId).ilike("title", term).limit(30),
      sb.from("findings").select("id, title, risk_level").eq("investigation_id", data.investigationId).ilike("title", term).limit(30),
      sb
        .from("evidence")
        .select("id, evidence_text, location_reference, intelligence_sources(id, title)")
        .eq("investigation_id", data.investigationId)
        .ilike("evidence_text", term)
        .limit(50),
    ]);
    return {
      entities: entities.data ?? [],
      events: events.data ?? [],
      findings: findings.data ?? [],
      evidence: evidence.data ?? [],
    };
  });

/** Assembles a report strictly from persisted, evidence-backed records. */
export const buildReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        investigationId: uuid,
        onlyAccepted: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const investigation = await sb
      .from("investigations")
      .select("id, title, description, priority, status, created_at")
      .eq("id", data.investigationId)
      .maybeSingle();
    if (!investigation.data) throw new Error("Investigation not found or not accessible.");

    let findingQuery = sb
      .from("findings")
      .select(
        "id, title, summary, detection_reason, risk_level, confidence, facts, inference, uncertainty, status, finding_evidence(evidence(evidence_text, location_reference, intelligence_sources(title, source_type, original_filename)))",
      )
      .eq("investigation_id", data.investigationId)
      .order("risk_level");
    if (data.onlyAccepted) findingQuery = findingQuery.eq("status", "accepted");
    const findings = await findingQuery;
    if (findings.error) throw new Error(findings.error.message);

    const sources = await sb
      .from("intelligence_sources")
      .select("id, title, source_type, original_filename, original_language, processing_status, created_at")
      .eq("investigation_id", data.investigationId)
      .order("created_at");

    return {
      investigation: investigation.data,
      findings: findings.data ?? [],
      sources: sources.data ?? [],
      generatedAt: new Date().toISOString(),
    };
  });

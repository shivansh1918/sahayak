import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

/** Dashboard metrics computed live from persisted rows the caller may access. */
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const count = (table: string, apply?: (q: any) => any) => {
      let q = sb.from(table as any).select("id", { count: "exact", head: true });
      if (apply) q = apply(q);
      return q;
    };

    const [investigations, activeInv, sources, entities, events, patterns, pending, recentSources, priorityFindings, runs] =
      await Promise.all([
        count("investigations"),
        count("investigations", (q) => q.in("status", ["active", "monitoring"])),
        count("intelligence_sources", (q) => q.eq("processing_status", "processed")),
        count("entities"),
        count("events"),
        count("patterns"),
        count("findings", (q) => q.eq("status", "pending_review")),
        sb
          .from("intelligence_sources")
          .select("id, title, source_type, processing_status, created_at, investigation_id, investigations(title)")
          .order("created_at", { ascending: false })
          .limit(8),
        sb
          .from("findings")
          .select("id, title, risk_level, confidence, status, created_at, investigation_id, investigations(title)")
          .in("risk_level", ["critical", "high"])
          .order("created_at", { ascending: false })
          .limit(6),
        sb
          .from("analysis_runs")
          .select("id, status, investigation_id, patterns_found, findings_found, sources_processed, started_at, completed_at, investigations(title)")
          .order("started_at", { ascending: false })
          .limit(6),
      ]);

    return {
      metrics: {
        investigations: investigations.count ?? 0,
        activeInvestigations: activeInv.count ?? 0,
        sourcesProcessed: sources.count ?? 0,
        entities: entities.count ?? 0,
        events: events.count ?? 0,
        patterns: patterns.count ?? 0,
        pendingFindings: pending.count ?? 0,
      },
      recentSources: recentSources.data ?? [],
      priorityFindings: priorityFindings.data ?? [],
      runs: runs.data ?? [],
    };
  });

export const updateInvestigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        investigationId: uuid,
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().trim().max(4000).nullable().optional(),
        priority: z.enum(["critical", "high", "medium", "low"]).optional(),
        status: z.enum(["active", "monitoring", "closed", "archived"]).optional(),
        tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { investigationId, ...patch } = data;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (!Object.keys(clean).length) return { ok: true };
    const { error } = await context.supabase
      .from("investigations")
      .update({ ...clean, updated_at: new Date().toISOString() })
      .eq("id", investigationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Short-lived signed URL so the analyst can open the original evidence file. */
export const getSourceSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ bucket: z.enum(["intelligence-sources", "video-derived"]), path: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from(data.bucket)
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const listAllFindings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(["all", "draft", "pending_review", "accepted", "rejected", "needs_more_evidence"]).default("all"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("findings")
      .select("id, title, summary, risk_level, confidence, status, created_at, investigation_id, investigations(title)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, roles] = await Promise.all([
      context.supabase.from("profiles").select("id, email, full_name").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    return {
      profile: profile.data ?? { id: context.userId, email: null, full_name: null },
      roles: (roles.data ?? []).map((r) => r.role as string),
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ fullName: z.string().trim().max(120).nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.fullName })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

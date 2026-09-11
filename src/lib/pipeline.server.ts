import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { fingerprint, normalizeName } from "./hash";
import type { Extraction } from "./intel-schema";

export type Sb = SupabaseClient<Database>;

export type PersistCounts = {
  entities: number;
  events: number;
  relationships: number;
  evidence: number;
};

function parseLocation(reference: string | null): {
  page_number: number | null;
  timestamp_seconds: number | null;
} {
  if (!reference) return { page_number: null, timestamp_seconds: null };
  const page = /page\s*(\d+)/i.exec(reference);
  const clock = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(reference);
  const secs = /(\d+(?:\.\d+)?)\s*s(?:ec|econds)?\b/i.exec(reference);
  let timestamp: number | null = null;
  if (clock) {
    const a = Number(clock[1]);
    const b = Number(clock[2]);
    const c = clock[3] ? Number(clock[3]) : null;
    timestamp = c === null ? a * 60 + b : a * 3600 + b * 60 + c;
  } else if (secs) {
    timestamp = Number(secs[1]);
  }
  return { page_number: page ? Number(page[1]) : null, timestamp_seconds: timestamp };
}

/**
 * Persists a validated extraction into the common intelligence model.
 * Every write is deterministic and idempotent: re-running analysis over the same
 * source updates the same rows instead of duplicating them, and provenance
 * (evidence -> source) is always written alongside.
 */
export async function persistExtraction(
  sb: Sb,
  args: {
    investigationId: string;
    sourceId: string;
    extraction: Extraction;
    defaultLocation?: string | null;
  },
): Promise<PersistCounts> {
  const { investigationId, sourceId, extraction } = args;
  const counts: PersistCounts = { entities: 0, events: 0, relationships: 0, evidence: 0 };
  const now = new Date().toISOString();
  const entityIdByName = new Map<string, string>();

  // ---- entities ----
  const entityRows = extraction.entities
    .filter((e) => e.name.trim().length > 0)
    .map((e) => ({
      investigation_id: investigationId,
      name: e.name.trim(),
      normalized_name: normalizeName(e.name),
      entity_type: e.entity_type,
      description: e.description,
      confidence: e.confidence,
      risk_score: e.risk_score,
      first_seen: now,
      last_seen: now,
    }));

  if (entityRows.length) {
    const { data, error } = await sb
      .from("entities")
      .upsert(entityRows, {
        onConflict: "investigation_id,entity_type,normalized_name",
        ignoreDuplicates: false,
      })
      .select("id, name, normalized_name, entity_type");
    if (error) throw new Error(`Saving entities failed: ${error.message}`);
    counts.entities = data?.length ?? 0;
    for (const row of data ?? []) {
      entityIdByName.set(`${row.entity_type}|${row.normalized_name}`, row.id);
      entityIdByName.set(row.normalized_name, row.id);
    }

    const aliasRows = extraction.entities
      .map((e) => {
        const id = entityIdByName.get(`${e.entity_type}|${normalizeName(e.name)}`);
        return id ? { entity_id: id, alias: e.name.trim(), source_id: sourceId, confidence: e.confidence } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (aliasRows.length) {
      await sb.from("entity_aliases").upsert(aliasRows, { onConflict: "entity_id,alias" });
    }
  }

  const evidenceRows: Database["public"]["Tables"]["evidence"]["Insert"][] = [];
  const pushEvidence = (row: Omit<Database["public"]["Tables"]["evidence"]["Insert"], "investigation_id" | "dedupe_key">) => {
    const dedupe = fingerprint(
      [
        sourceId,
        row.evidence_type,
        row.entity_id ?? "",
        row.event_id ?? "",
        row.relationship_id ?? "",
        row.evidence_text ?? "",
        row.location_reference ?? "",
      ].join("|"),
    );
    evidenceRows.push({ ...row, investigation_id: investigationId, dedupe_key: dedupe });
  };

  for (const e of extraction.entities) {
    const id = entityIdByName.get(`${e.entity_type}|${normalizeName(e.name)}`);
    if (!id) continue;
    const loc = parseLocation(e.location_reference ?? args.defaultLocation ?? null);
    pushEvidence({
      source_id: sourceId,
      entity_id: id,
      evidence_type: "entity_mention",
      evidence_text: e.evidence_quote ?? e.description ?? e.name,
      location_reference: e.location_reference ?? args.defaultLocation ?? null,
      page_number: loc.page_number,
      timestamp_seconds: loc.timestamp_seconds,
      confidence: e.confidence,
    });
  }

  // ---- events ----
  for (const ev of extraction.events) {
    const dedupe = fingerprint(
      [normalizeName(ev.title), ev.event_time_iso ?? ev.event_time_text ?? "", normalizeName(ev.location_text ?? "")].join("|"),
    );
    let eventTime: string | null = null;
    if (ev.event_time_iso) {
      const parsed = new Date(ev.event_time_iso);
      if (!Number.isNaN(parsed.getTime())) eventTime = parsed.toISOString();
    }
    const { data, error } = await sb
      .from("events")
      .upsert(
        {
          investigation_id: investigationId,
          title: ev.title.slice(0, 240),
          description: ev.description,
          event_type: ev.event_type,
          event_time: eventTime,
          event_time_text: ev.event_time_text,
          location_text: ev.location_text,
          confidence: ev.confidence,
          dedupe_key: dedupe,
        },
        { onConflict: "investigation_id,dedupe_key" },
      )
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Saving events failed: ${error.message}`);
    if (!data) continue;
    counts.events += 1;

    const participantRows = ev.participants
      .map((p) => entityIdByName.get(normalizeName(p)))
      .filter((id): id is string => Boolean(id))
      .map((entity_id) => ({ event_id: data.id, entity_id, role: "participant" }));
    if (participantRows.length) {
      await sb.from("event_participants").upsert(participantRows, { onConflict: "event_id,entity_id" });
    }

    const loc = parseLocation(ev.location_reference ?? args.defaultLocation ?? null);
    pushEvidence({
      source_id: sourceId,
      event_id: data.id,
      evidence_type: "event_record",
      evidence_text: ev.evidence_quote ?? ev.description ?? ev.title,
      location_reference: ev.location_reference ?? args.defaultLocation ?? null,
      page_number: loc.page_number,
      timestamp_seconds: loc.timestamp_seconds,
      confidence: ev.confidence,
    });
  }

  // ---- relationships ----
  for (const rel of extraction.relationships) {
    const sourceEntity = entityIdByName.get(normalizeName(rel.source_entity));
    const targetEntity = entityIdByName.get(normalizeName(rel.target_entity));
    if (!sourceEntity || !targetEntity || sourceEntity === targetEntity) continue;
    const { data, error } = await sb
      .from("relationships")
      .upsert(
        {
          investigation_id: investigationId,
          source_entity_id: sourceEntity,
          target_entity_id: targetEntity,
          relationship_type: rel.relationship_type,
          confidence: rel.confidence,
        },
        { onConflict: "source_entity_id,target_entity_id,relationship_type" },
      )
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Saving relationships failed: ${error.message}`);
    if (!data) continue;
    counts.relationships += 1;
    const loc = parseLocation(rel.location_reference ?? args.defaultLocation ?? null);
    pushEvidence({
      source_id: sourceId,
      relationship_id: data.id,
      evidence_type: "relationship_basis",
      evidence_text: rel.evidence_quote ?? `${rel.source_entity} ${rel.relationship_type} ${rel.target_entity}`,
      location_reference: rel.location_reference ?? args.defaultLocation ?? null,
      page_number: loc.page_number,
      timestamp_seconds: loc.timestamp_seconds,
      confidence: rel.confidence,
    });
  }

  // ---- observations ----
  for (const obs of extraction.observations) {
    const loc = parseLocation(obs.location_reference ?? args.defaultLocation ?? null);
    pushEvidence({
      source_id: sourceId,
      evidence_type: obs.observation_type ? `observation:${obs.observation_type}` : "observation",
      evidence_text: obs.observation_text,
      location_reference: obs.location_reference ?? args.defaultLocation ?? null,
      page_number: loc.page_number,
      timestamp_seconds: loc.timestamp_seconds,
      confidence: obs.confidence,
    });
  }

  if (evidenceRows.length) {
    const { data, error } = await sb
      .from("evidence")
      .upsert(evidenceRows, { onConflict: "investigation_id,dedupe_key" })
      .select("id");
    if (error) throw new Error(`Saving evidence failed: ${error.message}`);
    counts.evidence = data?.length ?? 0;
  }

  return counts;
}

/** Parses text, CSV, JSON and log sources into a normalized, line-referenced representation. */
export function normalizeTextSource(
  content: string,
  sourceType: string,
): { normalized: string; metadata: Record<string, unknown> } {
  const lines = content.split(/\r?\n/);
  if (sourceType === "log" || sourceType === "csv") {
    const referenced = lines
      .map((line, i) => (line.trim() ? `[line ${i + 1}] ${line}` : ""))
      .filter(Boolean)
      .join("\n");
    const ips = Array.from(
      new Set(content.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) ?? []),
    );
    const domains = Array.from(
      new Set(content.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi) ?? []),
    ).slice(0, 200);
    return {
      normalized: referenced,
      metadata: { line_count: lines.length, detected_ips: ips.slice(0, 200), detected_domains: domains },
    };
  }
  if (sourceType === "json") {
    try {
      const parsed: unknown = JSON.parse(content);
      return {
        normalized: JSON.stringify(parsed, null, 2),
        metadata: { valid_json: true },
      };
    } catch {
      return { normalized: content, metadata: { valid_json: false } };
    }
  }
  return { normalized: content, metadata: { line_count: lines.length } };
}

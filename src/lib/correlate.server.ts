import { fingerprint } from "./hash";
import { explainFinding } from "./ai.server";
import type { Sb } from "./pipeline.server";

type EntityRow = {
  id: string;
  name: string;
  normalized_name: string;
  entity_type: string;
  confidence: number | null;
  risk_score: number | null;
};

type EvidenceRow = {
  id: string;
  source_id: string | null;
  entity_id: string | null;
  event_id: string | null;
  relationship_id: string | null;
  evidence_text: string | null;
  location_reference: string | null;
};

type RelRow = {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
};

type EventRow = { id: string; title: string; event_time: string | null; location_text: string | null };

export type CorrelationResult = {
  patterns: number;
  findings: number;
  matchCandidates: number;
  errors: string[];
};

type PatternDraft = {
  key: string;
  title: string;
  description: string;
  pattern_type: string;
  risk_level: "critical" | "high" | "medium" | "low" | "informational";
  confidence: number;
  uncertainty: string;
  entityIds: string[];
  eventIds: string[];
  relationshipIds: string[];
  evidenceIds: string[];
  sourceIds: string[];
};

function tokens(name: string): string[] {
  return name.split(/[\s.]+/).filter((t) => t.length > 1);
}

/** Flags possible references to the same real-world entity without merging anything automatically. */
async function buildMatchCandidates(
  sb: Sb,
  investigationId: string,
  entities: EntityRow[],
): Promise<number> {
  const rows: {
    investigation_id: string;
    entity_a_id: string;
    entity_b_id: string;
    confidence: number;
    reason: string;
  }[] = [];

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i]!;
      const b = entities[j]!;
      if (a.entity_type !== b.entity_type) continue;
      const ta = tokens(a.normalized_name);
      const tb = tokens(b.normalized_name);
      if (!ta.length || !tb.length) continue;

      const lastA = ta[ta.length - 1];
      const lastB = tb[tb.length - 1];
      const shared = ta.filter((t) => tb.includes(t));
      let confidence = 0;
      let reason = "";

      if (lastA === lastB && shared.length >= 1 && a.normalized_name !== b.normalized_name) {
        const initialsMatch = ta[0]?.[0] === tb[0]?.[0];
        confidence = initialsMatch ? 0.7 : 0.45;
        reason = `Similar name: shared surname "${lastA}"${initialsMatch ? " and matching initial" : ""}. Not merged automatically.`;
      } else if (shared.length >= 2) {
        confidence = 0.55;
        reason = `Similar name: shared name parts (${shared.join(", ")}).`;
      }

      if (confidence > 0) {
        const [first, second] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
        rows.push({
          investigation_id: investigationId,
          entity_a_id: first,
          entity_b_id: second,
          confidence,
          reason,
        });
      }
    }
  }

  if (!rows.length) return 0;
  const { data } = await sb
    .from("entity_match_candidates")
    .upsert(rows, { onConflict: "entity_a_id,entity_b_id", ignoreDuplicates: true })
    .select("id");
  return data?.length ?? 0;
}

/**
 * Cross-source correlation and weak-signal detection.
 * Patterns are derived only from persisted records: an entity, relationship or event
 * has to be supported by evidence from more than one source before it becomes a pattern.
 */
export async function correlateInvestigation(
  sb: Sb,
  investigationId: string,
): Promise<CorrelationResult> {
  const errors: string[] = [];

  const [entitiesRes, evidenceRes, relRes, eventsRes] = await Promise.all([
    sb
      .from("entities")
      .select("id, name, normalized_name, entity_type, confidence, risk_score")
      .eq("investigation_id", investigationId),
    sb
      .from("evidence")
      .select("id, source_id, entity_id, event_id, relationship_id, evidence_text, location_reference")
      .eq("investigation_id", investigationId),
    sb
      .from("relationships")
      .select("id, source_entity_id, target_entity_id, relationship_type")
      .eq("investigation_id", investigationId),
    sb
      .from("events")
      .select("id, title, event_time, location_text")
      .eq("investigation_id", investigationId),
  ]);

  const entities = (entitiesRes.data ?? []) as EntityRow[];
  const evidence = (evidenceRes.data ?? []) as EvidenceRow[];
  const relationships = (relRes.data ?? []) as RelRow[];
  const events = (eventsRes.data ?? []) as EventRow[];
  if (!entities.length) return { patterns: 0, findings: 0, matchCandidates: 0, errors };

  const entityById = new Map(entities.map((e) => [e.id, e]));
  const matchCandidates = await buildMatchCandidates(sb, investigationId, entities);

  const sourcesByEntity = new Map<string, Set<string>>();
  const evidenceByEntity = new Map<string, string[]>();
  for (const ev of evidence) {
    if (!ev.entity_id) continue;
    if (ev.source_id) {
      const set = sourcesByEntity.get(ev.entity_id) ?? new Set<string>();
      set.add(ev.source_id);
      sourcesByEntity.set(ev.entity_id, set);
    }
    const list = evidenceByEntity.get(ev.entity_id) ?? [];
    list.push(ev.id);
    evidenceByEntity.set(ev.entity_id, list);
  }
  const evidenceByRelationship = new Map<string, string[]>();
  const sourcesByRelationship = new Map<string, Set<string>>();
  for (const ev of evidence) {
    if (!ev.relationship_id) continue;
    const list = evidenceByRelationship.get(ev.relationship_id) ?? [];
    list.push(ev.id);
    evidenceByRelationship.set(ev.relationship_id, list);
    if (ev.source_id) {
      const set = sourcesByRelationship.get(ev.relationship_id) ?? new Set<string>();
      set.add(ev.source_id);
      sourcesByRelationship.set(ev.relationship_id, set);
    }
  }
  const evidenceByEvent = new Map<string, string[]>();
  const sourcesByEvent = new Map<string, Set<string>>();
  for (const ev of evidence) {
    if (!ev.event_id) continue;
    const list = evidenceByEvent.get(ev.event_id) ?? [];
    list.push(ev.id);
    evidenceByEvent.set(ev.event_id, list);
    if (ev.source_id) {
      const set = sourcesByEvent.get(ev.event_id) ?? new Set<string>();
      set.add(ev.source_id);
      sourcesByEvent.set(ev.event_id, set);
    }
  }

  const drafts: PatternDraft[] = [];

  // 1. Recurring entity across independent sources.
  for (const entity of entities) {
    const sources = sourcesByEntity.get(entity.id);
    if (!sources || sources.size < 2) continue;
    drafts.push({
      key: fingerprint(`recurring|${entity.id}`),
      title: `${entity.name} appears across ${sources.size} independent sources`,
      description: `The ${entity.entity_type.replace("_", " ")} "${entity.name}" is referenced by ${sources.size} separately uploaded sources within this investigation.`,
      pattern_type: "recurring_entity",
      risk_level: sources.size >= 3 ? "high" : "medium",
      confidence: Math.min(0.5 + sources.size * 0.12, 0.9),
      uncertainty:
        "Cross-source recurrence establishes repeated reference only. It does not establish intent, coordination or that the references are the same real-world entity.",
      entityIds: [entity.id],
      eventIds: [],
      relationshipIds: relationships
        .filter((r) => r.source_entity_id === entity.id || r.target_entity_id === entity.id)
        .map((r) => r.id),
      evidenceIds: evidenceByEntity.get(entity.id) ?? [],
      sourceIds: Array.from(sources),
    });
  }

  // 2. Shared infrastructure / shared asset (device, ip, domain, vehicle, account) used by 2+ entities.
  const infraTypes = new Set(["ip_address", "domain", "device", "vehicle", "account", "phone", "email"]);
  for (const entity of entities) {
    if (!infraTypes.has(entity.entity_type)) continue;
    const linked = relationships.filter(
      (r) => r.source_entity_id === entity.id || r.target_entity_id === entity.id,
    );
    const counterparts = new Set(
      linked.map((r) => (r.source_entity_id === entity.id ? r.target_entity_id : r.source_entity_id)),
    );
    if (counterparts.size < 2) continue;
    const names = Array.from(counterparts)
      .map((id) => entityById.get(id)?.name)
      .filter(Boolean);
    drafts.push({
      key: fingerprint(`shared-infra|${entity.id}`),
      title: `Shared ${entity.entity_type.replace("_", " ")}: ${entity.name}`,
      description: `${counterparts.size} separate entities (${names.join(", ")}) are connected to the same ${entity.entity_type.replace("_", " ")} "${entity.name}".`,
      pattern_type: "shared_infrastructure",
      risk_level: "high",
      confidence: 0.65,
      uncertainty:
        "Shared use of an asset or identifier does not establish a relationship between the entities themselves, nor its purpose.",
      entityIds: [entity.id, ...Array.from(counterparts)],
      eventIds: [],
      relationshipIds: linked.map((r) => r.id),
      evidenceIds: [
        ...(evidenceByEntity.get(entity.id) ?? []),
        ...linked.flatMap((r) => evidenceByRelationship.get(r.id) ?? []),
      ],
      sourceIds: Array.from(
        new Set([
          ...Array.from(sourcesByEntity.get(entity.id) ?? []),
          ...linked.flatMap((r) => Array.from(sourcesByRelationship.get(r.id) ?? [])),
        ]),
      ),
    });
  }

  // 3. Repeated communication between the same pair, evidenced by more than one source.
  const pairCounts = new Map<string, RelRow[]>();
  for (const rel of relationships) {
    if (rel.relationship_type !== "communicated_with" && rel.relationship_type !== "connected_to") continue;
    const [a, b] =
      rel.source_entity_id < rel.target_entity_id
        ? [rel.source_entity_id, rel.target_entity_id]
        : [rel.target_entity_id, rel.source_entity_id];
    const key = `${a}|${b}`;
    pairCounts.set(key, [...(pairCounts.get(key) ?? []), rel]);
  }
  for (const [key, rels] of pairCounts) {
    const sourceSet = new Set(rels.flatMap((r) => Array.from(sourcesByRelationship.get(r.id) ?? [])));
    if (sourceSet.size < 2) continue;
    const [a, b] = key.split("|");
    drafts.push({
      key: fingerprint(`repeat-comm|${key}`),
      title: `Repeated contact between ${entityById.get(a!)?.name ?? "entity"} and ${entityById.get(b!)?.name ?? "entity"}`,
      description: `Contact between these two entities is evidenced by ${sourceSet.size} independent sources.`,
      pattern_type: "repeated_communication",
      risk_level: "medium",
      confidence: 0.6,
      uncertainty: "Repetition of contact does not establish the content, nature or purpose of the contact.",
      entityIds: [a!, b!],
      eventIds: [],
      relationshipIds: rels.map((r) => r.id),
      evidenceIds: rels.flatMap((r) => evidenceByRelationship.get(r.id) ?? []),
      sourceIds: Array.from(sourceSet),
    });
  }

  // 4. Common location across sources.
  const locationEntities = entities.filter((e) => e.entity_type === "location");
  for (const loc of locationEntities) {
    const linked = relationships.filter(
      (r) =>
        (r.source_entity_id === loc.id || r.target_entity_id === loc.id) &&
        ["located_at", "observed_at", "connected_to", "associated_with"].includes(r.relationship_type),
    );
    const counterparts = new Set(
      linked.map((r) => (r.source_entity_id === loc.id ? r.target_entity_id : r.source_entity_id)),
    );
    const sourceSet = new Set([
      ...Array.from(sourcesByEntity.get(loc.id) ?? []),
      ...linked.flatMap((r) => Array.from(sourcesByRelationship.get(r.id) ?? [])),
    ]);
    if (counterparts.size < 2 || sourceSet.size < 2) continue;
    drafts.push({
      key: fingerprint(`common-location|${loc.id}`),
      title: `Multiple entities placed at ${loc.name}`,
      description: `${counterparts.size} entities are associated with the location "${loc.name}" across ${sourceSet.size} sources.`,
      pattern_type: "common_location",
      risk_level: "medium",
      confidence: 0.6,
      uncertainty:
        "Co-location in the available records does not establish that the entities were present at the same time or interacted.",
      entityIds: [loc.id, ...Array.from(counterparts)],
      eventIds: [],
      relationshipIds: linked.map((r) => r.id),
      evidenceIds: [
        ...(evidenceByEntity.get(loc.id) ?? []),
        ...linked.flatMap((r) => evidenceByRelationship.get(r.id) ?? []),
      ],
      sourceIds: Array.from(sourceSet),
    });
  }

  // 5. Temporal cluster: 3+ dated events inside 24h evidenced by 2+ sources.
  const dated = events
    .filter((e) => e.event_time)
    .sort((a, b) => new Date(a.event_time!).getTime() - new Date(b.event_time!).getTime());
  for (let i = 0; i < dated.length; i++) {
    const window = dated.filter((e) => {
      const delta = new Date(e.event_time!).getTime() - new Date(dated[i]!.event_time!).getTime();
      return delta >= 0 && delta <= 24 * 3600 * 1000;
    });
    if (window.length < 3) continue;
    const sourceSet = new Set(window.flatMap((e) => Array.from(sourcesByEvent.get(e.id) ?? [])));
    if (sourceSet.size < 2) continue;
    const ids = window.map((e) => e.id).sort();
    drafts.push({
      key: fingerprint(`temporal|${ids.join(",")}`),
      title: `${window.length} events cluster within 24 hours`,
      description: `${window.length} extracted events fall inside a single 24-hour window, evidenced by ${sourceSet.size} sources: ${window.map((e) => e.title).join("; ")}.`,
      pattern_type: "temporal_cluster",
      risk_level: "medium",
      confidence: 0.55,
      uncertainty: "Temporal proximity alone does not establish that the events are related or coordinated.",
      entityIds: [],
      eventIds: ids,
      relationshipIds: [],
      evidenceIds: window.flatMap((e) => evidenceByEvent.get(e.id) ?? []),
      sourceIds: Array.from(sourceSet),
    });
    i += window.length - 1;
  }

  // ---- persist patterns ----
  const patternIdByKey = new Map<string, string>();
  for (const draft of drafts) {
    const { data, error } = await sb
      .from("patterns")
      .upsert(
        {
          investigation_id: investigationId,
          title: draft.title,
          description: draft.description,
          pattern_type: draft.pattern_type,
          risk_level: draft.risk_level,
          confidence: draft.confidence,
          uncertainty: draft.uncertainty,
          source_count: draft.sourceIds.length,
          evidence_count: draft.evidenceIds.length,
          dedupe_key: draft.key,
        },
        { onConflict: "investigation_id,dedupe_key" },
      )
      .select("id")
      .maybeSingle();
    if (error) {
      errors.push(`Pattern "${draft.title}": ${error.message}`);
      continue;
    }
    if (!data) continue;
    patternIdByKey.set(draft.key, data.id);

    if (draft.entityIds.length) {
      await sb
        .from("pattern_entities")
        .upsert(
          Array.from(new Set(draft.entityIds)).map((entity_id) => ({ pattern_id: data.id, entity_id })),
          { onConflict: "pattern_id,entity_id", ignoreDuplicates: true },
        );
    }
    if (draft.eventIds.length) {
      await sb
        .from("pattern_events")
        .upsert(
          Array.from(new Set(draft.eventIds)).map((event_id) => ({ pattern_id: data.id, event_id })),
          { onConflict: "pattern_id,event_id", ignoreDuplicates: true },
        );
    }
    if (draft.relationshipIds.length) {
      await sb
        .from("pattern_relationships")
        .upsert(
          Array.from(new Set(draft.relationshipIds)).map((relationship_id) => ({
            pattern_id: data.id,
            relationship_id,
          })),
          { onConflict: "pattern_id,relationship_id", ignoreDuplicates: true },
        );
    }
    // Attach the pattern to the evidence that supports it, preserving each record's own links.
    if (draft.evidenceIds.length) {
      await sb
        .from("evidence")
        .update({ pattern_id: data.id })
        .in("id", Array.from(new Set(draft.evidenceIds)))
        .is("pattern_id", null);
    }
  }

  // ---- findings ----
  let findingCount = 0;
  const { data: existingFindings } = await sb
    .from("findings")
    .select("id, dedupe_key")
    .eq("investigation_id", investigationId);
  const existingKeys = new Set((existingFindings ?? []).map((f) => f.dedupe_key));

  for (const draft of drafts) {
    const patternId = patternIdByKey.get(draft.key);
    if (!patternId) continue;
    const findingKey = fingerprint(`finding|${draft.key}`);
    if (existingKeys.has(findingKey)) continue;

    const supportingEvidence = evidence
      .filter((e) => draft.evidenceIds.includes(e.id))
      .slice(0, 40)
      .map(
        (e) =>
          `- ${e.evidence_text ?? ""}${e.location_reference ? ` (${e.location_reference})` : ""}`,
      )
      .join("\n");
    const supportingEntities = draft.entityIds
      .map((id) => entityById.get(id))
      .filter(Boolean)
      .map((e) => `- ${e!.name} (${e!.entity_type})`)
      .join("\n");
    const supportingEvents = draft.eventIds
      .map((id) => events.find((e) => e.id === id))
      .filter(Boolean)
      .map((e) => `- ${e!.title}${e!.event_time ? ` @ ${e!.event_time}` : ""}`)
      .join("\n");

    try {
      const explanation = await explainFinding({
        patternTitle: draft.title,
        patternType: draft.pattern_type,
        patternDescription: `${draft.description}\nSources involved: ${draft.sourceIds.length}\nKnown uncertainty: ${draft.uncertainty}`,
        supporting: `ENTITIES:\n${supportingEntities}\n\nEVENTS:\n${supportingEvents}\n\nEVIDENCE:\n${supportingEvidence}`,
      });

      const { data: finding, error } = await sb
        .from("findings")
        .upsert(
          {
            investigation_id: investigationId,
            title: explanation.title.slice(0, 240),
            summary: explanation.summary,
            detection_reason: explanation.detection_reason,
            risk_level: explanation.risk_level,
            confidence: explanation.confidence,
            facts: explanation.facts,
            inference: explanation.inference,
            uncertainty: explanation.uncertainty,
            status: "pending_review",
            pattern_id: patternId,
            dedupe_key: findingKey,
          },
          { onConflict: "investigation_id,dedupe_key" },
        )
        .select("id")
        .maybeSingle();
      if (error) {
        errors.push(`Finding for "${draft.title}": ${error.message}`);
        continue;
      }
      if (!finding) continue;
      findingCount += 1;

      if (draft.evidenceIds.length) {
        await sb.from("finding_evidence").upsert(
          Array.from(new Set(draft.evidenceIds)).map((evidence_id) => ({
            finding_id: finding.id,
            evidence_id,
          })),
          { onConflict: "finding_id,evidence_id", ignoreDuplicates: true },
        );
      }
    } catch (err) {
      errors.push(
        `Finding generation for "${draft.title}" failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { patterns: patternIdByKey.size, findings: findingCount, matchCandidates, errors };
}

import { z } from "zod";

export const ENTITY_TYPES = [
  "person",
  "organization",
  "location",
  "vehicle",
  "device",
  "ip_address",
  "domain",
  "email",
  "phone",
  "account",
  "malware",
  "threat_actor",
  "other",
] as const;

export const RELATIONSHIP_TYPES = [
  "communicated_with",
  "associated_with",
  "connected_to",
  "located_at",
  "used",
  "accessed",
  "observed_at",
  "mentioned_in",
  "linked_through",
] as const;

export const RISK_LEVELS = ["critical", "high", "medium", "low", "informational"] as const;

/** Structured contract every AI extraction step must satisfy before persistence. */
export const extractedEntitySchema = z.object({
  name: z.string().min(1).max(200),
  entity_type: z.enum(ENTITY_TYPES),
  description: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  risk_score: z.number().min(0).max(1).nullable(),
  evidence_quote: z.string().nullable(),
  location_reference: z.string().nullable(),
});

export const extractedEventSchema = z.object({
  title: z.string().min(1).max(240),
  description: z.string().nullable(),
  event_type: z.string().nullable(),
  event_time_text: z.string().nullable(),
  event_time_iso: z.string().nullable(),
  location_text: z.string().nullable(),
  participants: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).nullable(),
  evidence_quote: z.string().nullable(),
  location_reference: z.string().nullable(),
});

export const extractedObservationSchema = z.object({
  observation_text: z.string().min(1),
  observation_type: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  location_reference: z.string().nullable(),
});

export const extractedRelationshipSchema = z.object({
  source_entity: z.string().min(1),
  target_entity: z.string().min(1),
  relationship_type: z.enum(RELATIONSHIP_TYPES),
  confidence: z.number().min(0).max(1).nullable(),
  evidence_quote: z.string().nullable(),
  location_reference: z.string().nullable(),
});

export const extractionSchema = z.object({
  detected_language: z.string().nullable(),
  entities: z.array(extractedEntitySchema).default([]),
  events: z.array(extractedEventSchema).default([]),
  observations: z.array(extractedObservationSchema).default([]),
  relationships: z.array(extractedRelationshipSchema).default([]),
});

export type Extraction = z.infer<typeof extractionSchema>;
export type ExtractedEntity = z.infer<typeof extractedEntitySchema>;

export const findingExplanationSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  detection_reason: z.string().min(1),
  risk_level: z.enum(RISK_LEVELS),
  confidence: z.number().min(0).max(1),
  facts: z.array(z.string()).default([]),
  inference: z.array(z.string()).default([]),
  uncertainty: z.array(z.string()).default([]),
});

export type FindingExplanation = z.infer<typeof findingExplanationSchema>;

export const frameAnalysisSchema = z.object({
  observations: z.array(z.string()).default([]),
  ocr_text: z.string().nullable(),
});

export const SOURCE_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "pdf",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  mp3: "audio",
  wav: "audio",
  m4a: "audio",
  aac: "audio",
  ogg: "audio",
  opus: "audio",
  flac: "audio",
  webm: "audio",
  mp4: "video",
  mov: "video",
  mkv: "video",
  avi: "video",
  txt: "text",
  md: "text",
  log: "log",
  csv: "csv",
  json: "json",
};

export function detectSourceType(filename: string, mime: string | undefined): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "webm" && mime?.startsWith("video/")) return "video";
  const byExt = SOURCE_TYPE_BY_EXTENSION[ext];
  if (byExt) return byExt;
  if (mime?.startsWith("image/")) return "image";
  if (mime?.startsWith("audio/")) return "audio";
  if (mime?.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "text";
}

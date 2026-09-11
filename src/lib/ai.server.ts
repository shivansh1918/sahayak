import {
  extractionSchema,
  findingExplanationSchema,
  frameAnalysisSchema,
  type Extraction,
  type FindingExplanation,
} from "./intel-schema";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.8-flash";

export class AiError extends Error {
  status: number;
  retryable: boolean;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

async function callGateway(
  system: string,
  content: string | ContentPart[],
): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("AI is not configured on the server.", 401);

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AiError(`AI analysis failed (${res.status}): ${body.slice(0, 300)}`, res.status);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new AiError("The AI returned output that could not be validated as structured data.", 422);
  }
}

const EXTRACTION_SYSTEM = `You are an intelligence analysis extraction engine. You convert one source's content into strictly structured intelligence.

HARD RULES:
- Extract ONLY what the supplied content supports. Never invent names, identities, places, times, relationships, threats or intent.
- If a value is not stated, use null. Never guess.
- Every entity, event and relationship must include evidence_quote: a short verbatim excerpt from the content that supports it, and location_reference (page number, timestamp, log line, or section) when the content provides one.
- Speaker labels are not identities. Do not equate "speaker 1" with a named person unless the content states it.
- confidence is 0..1 and reflects how directly the content supports the item.
- relationship source_entity/target_entity must exactly match a name in your entities array.

Return ONLY a JSON object of this shape:
{"detected_language": string|null,
 "entities":[{"name":string,"entity_type":"person|organization|location|vehicle|device|ip_address|domain|email|phone|account|malware|threat_actor|other","description":string|null,"confidence":number|null,"risk_score":number|null,"evidence_quote":string|null,"location_reference":string|null}],
 "events":[{"title":string,"description":string|null,"event_type":string|null,"event_time_text":string|null,"event_time_iso":string|null,"location_text":string|null,"participants":[string],"confidence":number|null,"evidence_quote":string|null,"location_reference":string|null}],
 "observations":[{"observation_text":string,"observation_type":string|null,"confidence":number|null,"location_reference":string|null}],
 "relationships":[{"source_entity":string,"target_entity":string,"relationship_type":"communicated_with|associated_with|connected_to|located_at|used|accessed|observed_at|mentioned_in|linked_through","confidence":number|null,"evidence_quote":string|null,"location_reference":string|null}]}`;

/** Extracts structured intelligence from normalized source text. Validated before it is returned. */
export async function extractIntelligence(args: {
  label: string;
  sourceType: string;
  content: string;
}): Promise<Extraction> {
  const content = args.content.slice(0, 120_000);
  const raw = await callGateway(
    EXTRACTION_SYSTEM,
    `SOURCE TYPE: ${args.sourceType}\nSOURCE LABEL: ${args.label}\n\nCONTENT (verbatim, may be multilingual):\n"""\n${content}\n"""`,
  );
  const parsed = extractionSchema.safeParse(parseJson(raw));
  if (!parsed.success) {
    throw new AiError("Extracted intelligence did not match the required structure.", 422);
  }
  return parsed.data;
}

/** Vision + OCR for one sampled video frame or image. */
export async function analyzeImage(args: {
  dataUrl: string;
  hint: string;
}): Promise<{ observations: string[]; ocr_text: string | null }> {
  const raw = await callGateway(
    `You describe only what is visibly present in an image for an intelligence analyst.
HARD RULES: never name or identify people, never infer intent, never guess locations. Describe observable objects, text, vehicles, counts and setting only.
Transcribe visible text verbatim into ocr_text (null if none).
Return ONLY {"observations":[string],"ocr_text":string|null}.`,
    [
      { type: "text", text: args.hint },
      { type: "image_url", image_url: { url: args.dataUrl } },
    ],
  );
  const parsed = frameAnalysisSchema.safeParse(parseJson(raw));
  if (!parsed.success) return { observations: [], ocr_text: null };
  return parsed.data;
}

/** Turns a detected cross-source pattern into an explainable finding. */
export async function explainFinding(args: {
  patternTitle: string;
  patternType: string;
  patternDescription: string;
  supporting: string;
}): Promise<FindingExplanation> {
  const raw = await callGateway(
    `You write explainable intelligence findings for a human analyst who makes the final decision.

HARD RULES:
- "facts" contains ONLY statements directly supported by the supplied evidence records. Quote or paraphrase them tightly; no new information.
- "inference" contains analytical interpretation, always phrased as possibility ("may indicate", "is consistent with").
- "uncertainty" states what is unknown, ambiguous or not established, including what the evidence cannot show (intent, coordination, identity).
- Never convert inference into fact. Never invent evidence, names, times or places.
- detection_reason explains in plain language why this was surfaced.
Return ONLY {"title":string,"summary":string,"detection_reason":string,"risk_level":"critical|high|medium|low|informational","confidence":number,"facts":[string],"inference":[string],"uncertainty":[string]}`,
    `PATTERN: ${args.patternTitle}\nTYPE: ${args.patternType}\nDESCRIPTION: ${args.patternDescription}\n\nSUPPORTING RECORDS AND EVIDENCE:\n${args.supporting.slice(0, 60_000)}`,
  );
  const parsed = findingExplanationSchema.safeParse(parseJson(raw));
  if (!parsed.success) {
    throw new AiError("Finding explanation did not match the required structure.", 422);
  }
  return parsed.data;
}

/** Optional normalized (English) representation for multilingual sources. Original is never replaced. */
export async function normalizeToEnglish(content: string): Promise<string | null> {
  const raw = await callGateway(
    `Translate the supplied content into English for machine analysis. Preserve names, numbers, identifiers and timestamps exactly. Do not summarize, add or remove information. Return ONLY {"text": string}.`,
    content.slice(0, 60_000),
  );
  const parsed = parseJson(raw) as { text?: unknown };
  return typeof parsed.text === "string" ? parsed.text : null;
}

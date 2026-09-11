import { PDFDocument } from "pdf-lib";

const SARVAM_BASE = "https://api.sarvam.ai";
const DOC_PAGE_LIMIT = 10;

export class ProviderError extends Error {
  status: number;
  retryable: boolean;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

function key(): string {
  const k = process.env["SARVAM_API_KEY"];
  if (!k) throw new ProviderError("Sarvam API key is not configured on the server.", 401);
  return k;
}

async function readError(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string };
      detail?: string;
      title?: string;
    };
    return parsed.error?.message ?? parsed.detail ?? parsed.title ?? body.slice(0, 400);
  } catch {
    return body.slice(0, 400);
  }
}

export type DigitisedPage = {
  page_number: number;
  extracted_content: string;
  structured_content: unknown;
};

function blocksToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(blocksToText).filter(Boolean).join("\n");
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    for (const field of ["text", "content", "markdown", "html"]) {
      if (typeof rec[field] === "string") return rec[field] as string;
    }
    const nested = rec["blocks"] ?? rec["sections"] ?? rec["elements"];
    if (nested) return blocksToText(nested);
  }
  return "";
}

function stripMarkup(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Splits a PDF into <=10-page chunks (Sarvam Document AI limit) preserving page offsets. */
export async function splitPdf(
  bytes: Uint8Array,
): Promise<{ chunks: { bytes: Uint8Array; startPage: number }[]; pageCount: number }> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();
  if (pageCount <= DOC_PAGE_LIMIT) return { chunks: [{ bytes, startPage: 1 }], pageCount };

  const chunks: { bytes: Uint8Array; startPage: number }[] = [];
  for (let start = 0; start < pageCount; start += DOC_PAGE_LIMIT) {
    const out = await PDFDocument.create();
    const indices = Array.from(
      { length: Math.min(DOC_PAGE_LIMIT, pageCount - start) },
      (_, i) => start + i,
    );
    const copied = await out.copyPages(doc, indices);
    copied.forEach((p) => out.addPage(p));
    chunks.push({ bytes: await out.save(), startPage: start + 1 });
  }
  return { chunks, pageCount };
}

async function createDigitiseJob(
  bytes: Uint8Array,
  filename: string,
  mime: string,
  language: string | null,
): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([bytes as unknown as BlobPart], { type: mime }), filename);
  form.append("output_format", "json");
  if (language) form.append("language", language);

  const res = await fetch(`${SARVAM_BASE}/doc-ai/v1/job/digitise`, {
    method: "POST",
    headers: { "api-subscription-key": key() },
    body: form,
  });
  if (!res.ok) throw new ProviderError(`Sarvam Document AI: ${await readError(res)}`, res.status);
  const json = (await res.json()) as { job_id: string };
  return json.job_id;
}

async function waitForJob(jobId: string): Promise<{ status: string; usage: unknown }> {
  // Sarvam document jobs are asynchronous; poll until terminal. No wall-clock abort:
  // long documents legitimately take minutes.
  for (let attempt = 0; attempt < 150; attempt++) {
    const res = await fetch(`${SARVAM_BASE}/doc-ai/v1/job/${jobId}/status`, {
      headers: { "api-subscription-key": key() },
    });
    if (!res.ok) throw new ProviderError(`Sarvam job status: ${await readError(res)}`, res.status);
    const json = (await res.json()) as { status: string; usage: unknown };
    if (["completed", "partially_completed", "failed", "rejected"].includes(json.status)) {
      return json;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new ProviderError("Sarvam document job did not finish in time.", 504);
}

async function fetchJobResults(jobId: string): Promise<unknown> {
  const res = await fetch(`${SARVAM_BASE}/doc-ai/v1/job/${jobId}/results?format=json`, {
    headers: { "api-subscription-key": key() },
  });
  if (!res.ok) throw new ProviderError(`Sarvam job results: ${await readError(res)}`, res.status);
  return res.json();
}

/**
 * Runs Sarvam Document AI (Sarvam Vision) over a PDF or image.
 * PDFs longer than the provider's 10-page job limit are chunked, and the original
 * page numbering is restored when results are merged.
 */
export async function digitiseDocument(args: {
  bytes: Uint8Array;
  filename: string;
  mime: string;
  isPdf: boolean;
  language: string | null;
}): Promise<{ pages: DigitisedPage[]; jobIds: string[]; partial: boolean; pageCount: number }> {
  const chunks = args.isPdf
    ? await splitPdf(args.bytes)
    : { chunks: [{ bytes: args.bytes, startPage: 1 }], pageCount: 1 };

  const pages: DigitisedPage[] = [];
  const jobIds: string[] = [];
  let partial = false;

  for (const chunk of chunks.chunks) {
    const jobId = await createDigitiseJob(chunk.bytes, args.filename, args.mime, args.language);
    jobIds.push(jobId);
    const status = await waitForJob(jobId);
    if (status.status === "failed" || status.status === "rejected") {
      throw new ProviderError(
        `Sarvam Document AI job ${status.status} for ${args.filename}.`,
        422,
      );
    }
    if (status.status === "partially_completed") partial = true;

    const results = (await fetchJobResults(jobId)) as {
      documents?: { pages?: { page_number?: number; content?: string }[] }[];
    };
    const docs = results.documents ?? [];
    for (const doc of docs) {
      for (const [index, page] of (doc.pages ?? []).entries()) {
        let structured: unknown = page.content ?? null;
        if (typeof page.content === "string") {
          const trimmed = page.content.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
              structured = JSON.parse(trimmed);
            } catch {
              structured = page.content;
            }
          }
        }
        const text = stripMarkup(blocksToText(structured) || (page.content ?? ""));
        pages.push({
          page_number: chunk.startPage + ((page.page_number ?? index + 1) - 1),
          extracted_content: text,
          structured_content: structured,
        });
      }
    }
  }

  pages.sort((a, b) => a.page_number - b.page_number);
  return { pages, jobIds, partial, pageCount: chunks.pageCount };
}

export type TranscriptSegment = {
  speaker_label: string | null;
  start_time: number | null;
  end_time: number | null;
  text: string;
};

/** Sarvam Speech-to-Text with chunk-level timestamps. */
export async function transcribeAudio(args: {
  bytes: Uint8Array;
  filename: string;
  mime: string;
  languageCode?: string;
}): Promise<{
  transcript: string;
  language: string | null;
  segments: TranscriptSegment[];
  raw: unknown;
}> {
  const form = new FormData();
  form.append("file", new Blob([args.bytes as unknown as BlobPart], { type: args.mime }), args.filename);
  form.append("model", "saaras:v4");
  form.append("with_timestamps", "true");
  form.append("language_code", args.languageCode ?? "unknown");

  const res = await fetch(`${SARVAM_BASE}/speech-to-text`, {
    method: "POST",
    headers: { "api-subscription-key": key() },
    body: form,
  });
  if (!res.ok) throw new ProviderError(`Sarvam Speech-to-Text: ${await readError(res)}`, res.status);

  const json = (await res.json()) as {
    transcript: string;
    language_code: string | null;
    timestamps?: {
      words?: string[];
      start_time_seconds?: number[];
      end_time_seconds?: number[];
    } | null;
  };

  const chunks = json.timestamps?.words ?? [];
  const starts = json.timestamps?.start_time_seconds ?? [];
  const ends = json.timestamps?.end_time_seconds ?? [];
  const segments: TranscriptSegment[] = chunks.map((text, i) => ({
    speaker_label: null,
    start_time: starts[i] ?? null,
    end_time: ends[i] ?? null,
    text,
  }));

  return {
    transcript: json.transcript ?? "",
    language: json.language_code ?? null,
    segments,
    raw: json,
  };
}

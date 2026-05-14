import { openai } from "@workspace/integrations-openai-ai-server";

const MODEL = process.env.AI_INTEGRATIONS_OLLAMA_MODEL || "models/gemini-2.5-flash";

// How many chars roughly correspond to one page in a dense Indian judgment
const CHARS_PER_PAGE_ESTIMATE = 2000;
const CHUNK_SIZE = 6000;
const CHUNK_OVERLAP = 600;

const MIN_CHUNKS = 30;
const MAX_CHUNKS = 180;

export interface ExtractedDirective {
  type: "compliance_order" | "stay" | "direction" | "limitation_period" | "appeal" | "observation" | "other";
  classification: "mandatory" | "advisory";
  sourceText: string;
  pageNumber: number;
  paragraphRef: string | null;
  deadline: string | null;
  deadlineInferred: boolean;
  deadlineSource: string | null;
  responsibleDepartment: string;
  actionRequired: string;
  isNovel: boolean;
  confidenceScore: number;
}

interface Chunk {
  text: string;
  estStartPage: number;
  estEndPage: number;
  index: number;
}

interface PassPlan {
  name: string;
  startRatio: number;
  endRatio: number;
  budget: number;
}

interface ExtractionProgress {
  processedChunks: number;
  totalChunks: number;
  currentPass: number;
  totalPasses: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeChunkBudget(estimatedPages: number): number {
  const target = Math.ceil(estimatedPages / 8);
  return clamp(target, MIN_CHUNKS, MAX_CHUNKS);
}

function buildPasses(estimatedPages: number, totalChunks: number): PassPlan[] {
  if (estimatedPages <= 120) {
    return [{ name: "full", startRatio: 0, endRatio: 1, budget: totalChunks }];
  }

  if (estimatedPages <= 400) {
    const head = Math.floor(totalChunks * 0.45);
    const tail = totalChunks - head;
    return [
      { name: "head", startRatio: 0, endRatio: 0.55, budget: head },
      { name: "tail", startRatio: 0.55, endRatio: 1, budget: tail },
    ];
  }

  const head = Math.floor(totalChunks * 0.33);
  const mid = Math.floor(totalChunks * 0.34);
  const tail = totalChunks - head - mid;
  return [
    { name: "head", startRatio: 0, endRatio: 0.34, budget: head },
    { name: "middle", startRatio: 0.34, endRatio: 0.67, budget: mid },
    { name: "tail", startRatio: 0.67, endRatio: 1, budget: tail },
  ];
}

function buildChunksForPass(fullText: string, pageCount: number, pass: PassPlan): Chunk[] {
  const textLen = fullText.length;
  const startChar = Math.floor(textLen * pass.startRatio);
  const endChar = Math.floor(textLen * pass.endRatio);
  const segment = fullText.slice(startChar, endChar);

  if (segment.trim().length < 300) return [];

  const step = Math.max(CHUNK_SIZE - CHUNK_OVERLAP, Math.ceil(segment.length / pass.budget));
  const chunks: Chunk[] = [];

  for (let i = 0; i < segment.length && chunks.length < pass.budget; i += step) {
    const slice = segment.slice(i, i + CHUNK_SIZE);
    if (slice.trim().length < 300) continue;
    const globalOffset = startChar + i;
    const startRatio = globalOffset / textLen;
    const endRatio = Math.min(1, (globalOffset + CHUNK_SIZE) / textLen);
    chunks.push({
      text: slice,
      estStartPage: Math.max(1, Math.round(startRatio * pageCount)),
      estEndPage: Math.min(pageCount, Math.round(endRatio * pageCount) + 1),
      index: chunks.length,
    });
  }

  return chunks;
}

/** Deduplicate directives — two are considered the same if their sourceTexts
 *  share >70% of significant words (length > 3). */
function deduplicateDirectives(directives: ExtractedDirective[]): ExtractedDirective[] {
  const sig = (s: string) =>
    new Set(s.toLowerCase().split(/\W+/).filter((w) => w.length > 3));

  const unique: ExtractedDirective[] = [];
  for (const d of directives) {
    const wordsD = sig(d.sourceText);
    const isDup = unique.some((u) => {
      const wordsU = sig(u.sourceText);
      const smaller = Math.min(wordsD.size, wordsU.size);
      if (smaller === 0) return false;
      let overlap = 0;
      for (const w of wordsD) if (wordsU.has(w)) overlap++;
      return overlap / smaller > 0.7;
    });
    if (!isDup) unique.push(d);
  }
  return unique;
}

/** Parse the raw AI response string into an array of ExtractedDirective objects. */
function parseDirectivesResponse(content: string): ExtractedDirective[] {
  let parsed: { directives?: ExtractedDirective[] } = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    try {
      const match = content.match(/\[[\s\S]*\]/);
      parsed = { directives: JSON.parse(match?.[0] ?? "[]") };
    } catch {
      return [];
    }
  }
  return parsed.directives ?? (Array.isArray(parsed) ? (parsed as unknown as ExtractedDirective[]) : []);
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const anyErr = error as { status?: number; response?: { status?: number } };
  return anyErr.status ?? anyErr.response?.status;
}

async function withRetry<T>(fn: () => Promise<T>, retries: number, delayMs: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);
      if (status !== 429 && status !== 408 && status !== 503) {
        throw error;
      }
      const backoff = delayMs * Math.pow(2, attempt);
      await sleep(backoff);
    }
  }
  throw lastError;
}

/** Single AI call for one text chunk. Returns [] on any error (chunk may have no directives). */
async function extractChunk(
  chunk: Chunk,
  caseContext: string,
  dateOfOrder: string | null
): Promise<ExtractedDirective[]> {
  const systemPrompt = `You are VerdictIQ, a specialized legal AI for Indian government compliance. You are given a SINGLE EXCERPT from a larger court judgment. Your task is to extract every court-ordered directive, compliance obligation, stay order, deadline, and direction found in this excerpt.

IMPORTANT RULES:
- Only extract actual court orders and directions — not arguments of counsel, factual recitals, or pure observations.
- Look for operative language: "is directed to", "shall", "is ordered to", "we direct", "we order", "ORDERED THAT", "In the result", "Accordingly", "is required to", "must comply".
- If this excerpt contains NO directives, return {"directives": []}.
- Do NOT invent directives not present in this excerpt.
- Source text must be verbatim from the excerpt.
- Page numbers: use the provided start/end page range as context.

For each directive found, return:
{
  "type": "compliance_order" | "stay" | "direction" | "limitation_period" | "appeal" | "observation" | "other",
  "classification": "mandatory" | "advisory",
  "sourceText": "<verbatim text from excerpt>",
  "pageNumber": <integer within provided range>,
  "paragraphRef": "<e.g. Para 12>" | null,
  "deadline": "<YYYY-MM-DD>" | null,
  "deadlineInferred": true | false,
  "deadlineSource": "<how determined>" | null,
  "responsibleDepartment": "<specific Indian govt department/authority>",
  "actionRequired": "<one sentence imperative>",
  "isNovel": true | false,
  "confidenceScore": 0.0-1.0
}

Return a JSON object with key "directives" containing the array — e.g. {"directives": [...]}. May be empty.`;

  const userPrompt = `CASE CONTEXT:
${caseContext}

DOCUMENT EXCERPT (pages ${chunk.estStartPage}–${chunk.estEndPage}):
${chunk.text}`;

  const response = await withRetry(
    () => openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
    4,
    2000
  );

  const content = response.choices[0]?.message?.content ?? "{}";
  return parseDirectivesResponse(content);
}

/** Metadata-only extraction (no PDF text). Used when no document has been uploaded. */
export async function extractDirectivesWithAI(caseRow: {
  caseNumber: string;
  court: string;
  bench: string | null;
  benchType: string | null;
  dateOfOrder: string | null;
  petitioner: string | null;
  respondent: string | null;
  governmentRole: string | null;
  notes: string | null;
}): Promise<ExtractedDirective[]> {
  const caseContext = `Case Number: ${caseRow.caseNumber}
Court: ${caseRow.court}
Bench: ${caseRow.bench ?? "Not specified"} (${caseRow.benchType ?? "single"} bench)
Date of Order: ${caseRow.dateOfOrder ?? "Not specified"}
Petitioner: ${caseRow.petitioner ?? "Not specified"}
Respondent: ${caseRow.respondent ?? "Not specified"}
Government Role: ${caseRow.governmentRole ?? "Not specified"}
Case Notes/Nature: ${caseRow.notes ?? "No notes provided"}`;

  const systemPrompt = `You are VerdictIQ, a specialized legal AI for Indian government compliance. No PDF has been provided. Infer realistic directives based solely on the case metadata.

Extract 5–9 plausible directives a court would typically issue in a case of this nature. Make each directive realistic, legally precise, and specific to the facts provided.

For each directive return:
{ "type", "classification", "sourceText", "pageNumber", "paragraphRef", "deadline", "deadlineInferred", "deadlineSource", "responsibleDepartment", "actionRequired", "isNovel", "confidenceScore" }

Return a JSON object: {"directives": [...]}.
`;

  const response = await withRetry(
    () => openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this case and generate plausible directives:\n\n${caseContext}` },
      ],
      response_format: { type: "json_object" },
    }),
    4,
    2000
  );

  const content = response.choices[0]?.message?.content ?? "{}";
  return parseDirectivesResponse(content);
}

/** Full-document chunked extraction. Processes chunks in multi-pass batches. */
export async function extractDirectivesFromFullText(
  caseRow: {
    caseNumber: string;
    court: string;
    bench: string | null;
    benchType: string | null;
    dateOfOrder: string | null;
    petitioner: string | null;
    respondent: string | null;
    governmentRole: string | null;
    notes: string | null;
  },
  fullText: string,
  pageCount: number,
  logger: { info: (obj: object, msg: string) => void },
  onProgress?: (progress: ExtractionProgress) => Promise<void> | void
): Promise<ExtractedDirective[]> {
  const estimatedPages = pageCount > 0 ? pageCount : Math.ceil(fullText.length / CHARS_PER_PAGE_ESTIMATE);
  const plannedChunks = computeChunkBudget(estimatedPages);
  const passes = buildPasses(estimatedPages, plannedChunks);
  const passChunks = passes.map((pass) => buildChunksForPass(fullText, estimatedPages, pass));
  const totalChunks = passChunks.reduce((sum, chunks) => sum + chunks.length, 0);

  const caseContext = `Case: ${caseRow.caseNumber} | Court: ${caseRow.court} | Date: ${caseRow.dateOfOrder ?? "unknown"} | Petitioner: ${caseRow.petitioner ?? "unknown"} | Respondent: ${caseRow.respondent ?? "unknown"} | Notes: ${caseRow.notes ?? "none"}`;

  logger.info(
    { totalChunks, docChars: fullText.length, estimatedPages, passes: passes.map((p) => p.name) },
    "Starting multi-pass extraction"
  );

  const allDirectives: ExtractedDirective[] = [];
  let processedChunks = 0;

  const baseURL = process.env.AI_INTEGRATIONS_OLLAMA_BASE_URL ?? "";
  const isGemini = baseURL.includes("generativelanguage.googleapis.com");
  const batchSize = isGemini
    ? 1
    : estimatedPages > 600
      ? 1
      : estimatedPages > 300
        ? 2
        : estimatedPages > 150
          ? 3
          : 4;
  const batchDelayMs = isGemini ? 1200 : estimatedPages > 300 ? 1200 : 400;

  for (let passIndex = 0; passIndex < passes.length; passIndex += 1) {
    const pass = passes[passIndex];
    const chunks = passChunks[passIndex] ?? [];

    logger.info({ pass: pass.name, chunkCount: chunks.length }, "Starting extraction pass");

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((chunk) => extractChunk(chunk, caseContext, caseRow.dateOfOrder))
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          allDirectives.push(...result.value);
        } else {
          logger.info(
            { pass: pass.name, batchStart: i, error: String(result.reason), stack: result.reason?.stack?.slice(0, 500) },
            "Chunk extraction error"
          );
        }
      }

      processedChunks += batch.length;
      await onProgress?.({
        processedChunks,
        totalChunks,
        currentPass: passIndex + 1,
        totalPasses: passes.length,
      });

      logger.info(
        { pass: pass.name, batchStart: i, batchSize: batch.length, processedChunks, totalChunks },
        "Chunk batch complete"
      );

      if (batchDelayMs > 0) {
        await sleep(batchDelayMs);
      }
    }
  }

  const unique = deduplicateDirectives(allDirectives);

  logger.info(
    { total: allDirectives.length, afterDedup: unique.length },
    "Multi-pass extraction complete"
  );

  return unique;
}

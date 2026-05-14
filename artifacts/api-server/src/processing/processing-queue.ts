import { eq, and, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  casesTable,
  judgmentsTable,
  directivesTable,
  actionItemsTable,
  auditLogTable,
  processingJobsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import {
  ExtractedDirective,
  extractDirectivesFromFullText,
  extractDirectivesWithAI,
} from "./extraction";

const POLL_INTERVAL_MS = 3000;

let workerActive = false;

export async function enqueueProcessingJob(caseId: number): Promise<void> {
  await db.insert(processingJobsTable).values({
    caseId,
    status: "queued",
    totalChunks: 0,
    processedChunks: 0,
    totalPasses: 1,
    currentPass: 0,
    updatedAt: new Date(),
  });
}

export function startProcessingWorker(): void {
  setInterval(() => {
    void runNextJob();
  }, POLL_INTERVAL_MS);
}

async function runNextJob(): Promise<void> {
  if (workerActive) return;

  const job = await db
    .select()
    .from(processingJobsTable)
    .where(and(eq(processingJobsTable.status, "queued")))
    .orderBy(asc(processingJobsTable.createdAt))
    .then((rows) => rows[0]);

  if (!job) return;

  workerActive = true;
  try {
    await db
      .update(processingJobsTable)
      .set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
      .where(eq(processingJobsTable.id, job.id));

    await processJob(job.caseId, job.id);

    await db
      .update(processingJobsTable)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(processingJobsTable.id, job.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ err: error }, "Processing job failed");

    await db
      .update(processingJobsTable)
      .set({ status: "failed", lastError: message, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(processingJobsTable.id, job.id));

    await db
      .update(casesTable)
      .set({ status: "pending", updatedAt: new Date() })
      .where(eq(casesTable.id, job.caseId));

    const failedCase = await db
      .select({ caseNumber: casesTable.caseNumber })
      .from(casesTable)
      .where(eq(casesTable.id, job.caseId))
      .then((rows) => rows[0]);

    await db.insert(auditLogTable).values({
      caseId: job.caseId,
      caseNumber: failedCase?.caseNumber ?? "unknown",
      eventType: "processing_failed",
      description: `AI processing failed: ${message}`,
    });
  } finally {
    workerActive = false;
  }
}

async function processJob(caseId: number, jobId: number): Promise<void> {
  const caseRow = await db
    .select()
    .from(casesTable)
    .where(eq(casesTable.id, caseId))
    .then((r) => r[0]);

  if (!caseRow) {
    throw new Error(`Case ${caseId} not found`);
  }

  let judgment = await db
    .select()
    .from(judgmentsTable)
    .where(eq(judgmentsTable.caseId, caseId))
    .then((r) => r[0] ?? null);

  if (!judgment) {
    const crypto = await import("node:crypto");
    const hash = crypto.createHash("sha256").update(caseRow.caseNumber + Date.now()).digest("hex").slice(0, 16);
    [judgment] = await db
      .insert(judgmentsTable)
      .values({
        caseId,
        pdfHash: `sha256:${hash}`,
        pageCount: 0,
        isScanned: false,
        overallOcrConfidence: null,
        lowConfidencePages: "[]",
        modelVersion: process.env.AI_INTEGRATIONS_OLLAMA_MODEL ?? "models/gemini-2.5-flash",
        rawTextPreview: null,
      })
      .returning()
      .then((rows) => rows);
  }

  const storedFullText: string = judgment?.rawTextPreview ?? "";
  const storedPageCount: number = judgment?.pageCount ?? 0;
  const hasRealText = storedFullText.trim().length > 500;

  await db.insert(auditLogTable).values({
    caseId,
    caseNumber: caseRow.caseNumber,
    eventType: "processing_started",
    description: hasRealText
      ? `AI processing started: ${storedPageCount} pages, ${storedFullText.length.toLocaleString()} chars, multi-pass extraction`
      : "AI processing started (no PDF — metadata-only extraction)",
  });

  let extracted: ExtractedDirective[] = [];

  if (hasRealText) {
    extracted = await extractDirectivesFromFullText(
      caseRow,
      storedFullText,
      storedPageCount,
      logger,
      async (progress) => {
        await db
          .update(processingJobsTable)
          .set({
            totalChunks: progress.totalChunks,
            processedChunks: progress.processedChunks,
            totalPasses: progress.totalPasses,
            currentPass: progress.currentPass,
            updatedAt: new Date(),
          })
          .where(eq(processingJobsTable.id, jobId));
      }
    );
  } else {
    extracted = await extractDirectivesWithAI(caseRow);
  }

  await db.delete(actionItemsTable).where(eq(actionItemsTable.caseId, caseId));
  await db.delete(directivesTable).where(eq(directivesTable.caseId, caseId));

  let inserted = 0;
  for (const d of extracted) {
    const safePageNumber = sanitizePageNumber(d.pageNumber, storedPageCount);
    const [directive] = await db
      .insert(directivesTable)
      .values({
        caseId,
        judgmentId: judgment.id,
        type: sanitizeDirectiveType(d.type),
        classification: sanitizeClassification(d.classification),
        sourceText: d.sourceText,
        pageNumber: safePageNumber,
        paragraphRef: d.paragraphRef ?? null,
        deadline: sanitizeDate(d.deadline),
        deadlineInferred: d.deadlineInferred,
        deadlineSource: d.deadlineSource ?? null,
        responsibleDepartment: normalizeDepartment(d.responsibleDepartment),
        actionRequired: d.actionRequired,
        isNovel: d.isNovel,
        confidenceScore: Math.min(1, Math.max(0, d.confidenceScore)),
        verificationStatus: "pending",
      })
      .returning();

    await db.insert(actionItemsTable).values({
      caseId,
      directiveId: directive.id,
      title: d.actionRequired.length > 80 ? d.actionRequired.slice(0, 77) + "..." : d.actionRequired,
      description: d.actionRequired,
      department: normalizeDepartment(d.responsibleDepartment) ?? "Unassigned",
      priority:
        d.classification === "mandatory"
          ? d.type === "stay" || d.type === "compliance_order"
            ? "critical"
            : "high"
          : "medium",
      classification: d.classification,
      deadline: sanitizeDate(d.deadline),
      deadlineInferred: d.deadlineInferred,
      status: "pending",
      sourcePageNumber: safePageNumber,
      sourceText: d.sourceText,
    });

    inserted += 1;
  }

  await db
    .update(casesTable)
    .set({ status: "under_review", processingCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(casesTable.id, caseId));

  const avgConf =
    extracted.length > 0
      ? (extracted.reduce((s, d) => s + d.confidenceScore, 0) / extracted.length).toFixed(2)
      : "N/A";

  await db.insert(auditLogTable).values({
    caseId,
    caseNumber: caseRow.caseNumber,
    eventType: "processing_completed",
    description: `${inserted} directives extracted (avg confidence ${avgConf}). ${extracted.filter((d) => d.isNovel).length} flagged for expert review. ${hasRealText ? `Source: full PDF (${storedPageCount} pages, multi-pass)` : "Source: metadata inference"}`,
    modelVersion: judgment.modelVersion ?? null,
    pdfHash: judgment.pdfHash ?? null,
  });
}

function sanitizeDate(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim().split("T")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function sanitizePageNumber(val: unknown, pageCount: number): number {
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num) || num <= 0) return 1;
  const rounded = Math.round(num);
  return pageCount > 0 ? Math.min(pageCount, Math.max(1, rounded)) : Math.max(1, rounded);
}

const VALID_DIRECTIVE_TYPES = new Set([
  "compliance_order",
  "stay",
  "direction",
  "limitation_period",
  "appeal",
  "observation",
  "other",
]);
function sanitizeDirectiveType(
  val: string
): "compliance_order" | "stay" | "direction" | "limitation_period" | "appeal" | "observation" | "other" {
  if (VALID_DIRECTIVE_TYPES.has(val)) return val as ReturnType<typeof sanitizeDirectiveType>;
  const lower = val.toLowerCase();
  if (lower.includes("stay") || lower.includes("interim") || lower.includes("injunct")) return "stay";
  if (lower.includes("comply") || lower.includes("compliance")) return "compliance_order";
  if (lower.includes("appeal")) return "appeal";
  if (lower.includes("limit") || lower.includes("period")) return "limitation_period";
  if (lower.includes("direct") || lower.includes("order")) return "direction";
  if (lower.includes("observ")) return "observation";
  return "other";
}

const VALID_CLASSIFICATIONS = new Set(["mandatory", "advisory", "unknown"]);
function sanitizeClassification(val: string): "mandatory" | "advisory" | "unknown" {
  if (VALID_CLASSIFICATIONS.has(val)) return val as ReturnType<typeof sanitizeClassification>;
  const lower = val.toLowerCase();
  if (lower.includes("mandatory") || lower.includes("order") || lower.includes("direct") || lower.includes("shall")) return "mandatory";
  if (lower.includes("advisory") || lower.includes("suggest") || lower.includes("recommend")) return "advisory";
  return "unknown";
}

function normalizeDepartment(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

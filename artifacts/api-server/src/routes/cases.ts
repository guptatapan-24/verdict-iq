import { Router } from "express";
import { requireRole } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  casesTable,
  judgmentsTable,
  directivesTable,
  actionItemsTable,
  auditLogTable,
  processingJobsTable,
} from "@workspace/db";
import {
  ListCasesQueryParams,
  CreateCaseBody,
  GetCaseParams,
  UpdateCaseParams,
  UpdateCaseBody,
  ProcessCaseParams,
  GetComplianceTimelineParams,
} from "@workspace/api-zod";
import { eq, and, or, ilike, desc, asc, sql, inArray } from "drizzle-orm";
import { enqueueProcessingJob } from "../processing/processing-queue";

const router = Router();

router.get("/cases", async (req, res) => {
  const parsed = ListCasesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }
  const { status, court, department, search } = parsed.data;

  const conditions = [];
  if (status) conditions.push(eq(casesTable.status, status));
  if (court) conditions.push(ilike(casesTable.court, `%${court}%`));
  if (search) {
    conditions.push(
      or(
        ilike(casesTable.caseNumber, `%${search}%`),
        ilike(casesTable.petitioner, `%${search}%`),
        ilike(casesTable.respondent, `%${search}%`),
        ilike(casesTable.court, `%${search}%`)
      )!
    );
  }

  const cases = await db
    .select()
    .from(casesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(casesTable.updatedAt));

  const caseIds = cases.map((c) => c.id);

  let directiveCounts: Record<number, { total: number; mandatory: number; advisory: number; verified: number; pending: number }> = {};

  if (caseIds.length > 0) {
    const counts = await db
      .select({
        caseId: directivesTable.caseId,
        total: sql<number>`count(*)::int`,
        mandatory: sql<number>`count(*) filter (where ${directivesTable.classification} = 'mandatory')::int`,
        advisory: sql<number>`count(*) filter (where ${directivesTable.classification} = 'advisory')::int`,
        verified: sql<number>`count(*) filter (where ${directivesTable.verificationStatus} in ('approved','edited'))::int`,
        pending: sql<number>`count(*) filter (where ${directivesTable.verificationStatus} = 'pending')::int`,
      })
      .from(directivesTable)
      .where(sql`${directivesTable.caseId} = ANY(${sql.raw(`ARRAY[${caseIds.join(",")}]`)})`)
      .groupBy(directivesTable.caseId);

    for (const row of counts) {
      directiveCounts[row.caseId] = {
        total: row.total,
        mandatory: row.mandatory,
        advisory: row.advisory,
        verified: row.verified,
        pending: row.pending,
      };
    }
  }

  const result = cases.map((c) => {
    const dc = directiveCounts[c.id] ?? { total: 0, mandatory: 0, advisory: 0, verified: 0, pending: 0 };
    return {
      ...c,
      totalDirectives: dc.total,
      mandatoryCount: dc.mandatory,
      advisoryCount: dc.advisory,
      verifiedCount: dc.verified,
      pendingVerificationCount: dc.pending,
    };
  });

  return res.json(result);
});

router.post("/cases", requireRole(["admin"]), async (req, res) => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }
  const data = parsed.data;
  const [newCase] = await db
    .insert(casesTable)
    .values({
      caseNumber: data.caseNumber,
      court: data.court,
      bench: data.bench,
      benchType: data.benchType,
      dateOfOrder: data.dateOfOrder ? (data.dateOfOrder as Date).toISOString().split("T")[0] : undefined,
      petitioner: data.petitioner,
      respondent: data.respondent,
      governmentRole: data.governmentRole,
      urgencyLevel: data.urgencyLevel ?? "medium",
      notes: data.notes,
    })
    .returning();

  await db.insert(auditLogTable).values({
    caseId: newCase.id,
    caseNumber: newCase.caseNumber,
    eventType: "case_created",
    description: `Case ${newCase.caseNumber} registered`,
  });

  return res.status(201).json({
    ...newCase,
    totalDirectives: 0,
    mandatoryCount: 0,
    advisoryCount: 0,
    verifiedCount: 0,
    pendingVerificationCount: 0,
  });
});

router.get("/cases/:id", async (req, res) => {
  const parsed = GetCaseParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const caseRow = await db
    .select()
    .from(casesTable)
    .where(eq(casesTable.id, parsed.data.id))
    .then((r) => r[0]);

  if (!caseRow) return res.status(404).json({ error: "Case not found" });

  const judgment = await db
    .select()
    .from(judgmentsTable)
    .where(eq(judgmentsTable.caseId, caseRow.id))
    .then((r) => r[0] ?? null);

  const directives = await db
    .select()
    .from(directivesTable)
    .where(eq(directivesTable.caseId, caseRow.id))
    .orderBy(asc(directivesTable.pageNumber));

  const actionItems = await db
    .select()
    .from(actionItemsTable)
    .where(eq(actionItemsTable.caseId, caseRow.id))
    .orderBy(desc(actionItemsTable.createdAt));

  const totalDirectives = directives.length;
  const mandatoryCount = directives.filter((d) => d.classification === "mandatory").length;
  const advisoryCount = directives.filter((d) => d.classification === "advisory").length;
  const verifiedCount = directives.filter((d) => ["approved", "edited"].includes(d.verificationStatus)).length;
  const pendingVerificationCount = directives.filter((d) => d.verificationStatus === "pending").length;

  const parsedJudgment = judgment
    ? {
        ...judgment,
        lowConfidencePages: JSON.parse(judgment.lowConfidencePages ?? "[]"),
      }
    : null;

  return res.json({
    ...caseRow,
    totalDirectives,
    mandatoryCount,
    advisoryCount,
    verifiedCount,
    pendingVerificationCount,
    judgment: parsedJudgment,
    directives: directives.map((d) => ({ ...d })),
    actionItems: actionItems.map((a) => ({ ...a })),
  });
});

router.patch("/cases/:id", requireRole(["admin", "reviewer"]), async (req, res) => {
  const paramParsed = UpdateCaseParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = UpdateCaseBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error });

  const data = bodyParsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.bench !== undefined) updates.bench = data.bench;
  if (data.benchType !== undefined) updates.benchType = data.benchType;
  if (data.dateOfOrder !== undefined) updates.dateOfOrder = data.dateOfOrder ? (data.dateOfOrder as Date).toISOString().split("T")[0] : null;
  if (data.petitioner !== undefined) updates.petitioner = data.petitioner;
  if (data.respondent !== undefined) updates.respondent = data.respondent;
  if (data.governmentRole !== undefined) updates.governmentRole = data.governmentRole;
  if (data.urgencyLevel !== undefined) updates.urgencyLevel = data.urgencyLevel;
  if (data.status !== undefined) updates.status = data.status;
  if (data.notes !== undefined) updates.notes = data.notes;

  const [updated] = await db
    .update(casesTable)
    .set(updates)
    .where(eq(casesTable.id, paramParsed.data.id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Case not found" });

  return res.json({
    ...updated,
    totalDirectives: 0,
    mandatoryCount: 0,
    advisoryCount: 0,
    verifiedCount: 0,
    pendingVerificationCount: 0,
  });
});

router.delete("/cases/:id", requireRole(["admin"]), async (req, res) => {
  const parsed = GetCaseParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const caseRow = await db
    .select()
    .from(casesTable)
    .where(eq(casesTable.id, parsed.data.id))
    .then((r) => r[0]);

  if (!caseRow) return res.status(404).json({ error: "Case not found" });

  // Delete in FK-safe order: action_items → directives → audit_log → judgments → case
  await db.delete(actionItemsTable).where(eq(actionItemsTable.caseId, caseRow.id));
  await db.delete(directivesTable).where(eq(directivesTable.caseId, caseRow.id));
  await db.delete(auditLogTable).where(eq(auditLogTable.caseId, caseRow.id));
  await db.delete(judgmentsTable).where(eq(judgmentsTable.caseId, caseRow.id));
  await db.delete(casesTable).where(eq(casesTable.id, caseRow.id));

  req.log.info({ caseId: caseRow.id, caseNumber: caseRow.caseNumber }, "Case deleted");

  return res.json({ success: true, message: `Case ${caseRow.caseNumber} and all related data deleted` });
});

router.post("/cases/:id/process", requireRole(["admin"]), async (req, res) => {
  const parsed = ProcessCaseParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const caseRow = await db
    .select()
    .from(casesTable)
    .where(eq(casesTable.id, parsed.data.id))
    .then((r) => r[0]);

  if (!caseRow) return res.status(404).json({ error: "Case not found" });

  const existingJob = await db
    .select()
    .from(processingJobsTable)
    .where(
      and(
        eq(processingJobsTable.caseId, caseRow.id),
        inArray(processingJobsTable.status, ["queued", "running"])
      )
    )
    .then((rows) => rows[0]);

  if (existingJob) {
    return res.json({
      caseId: caseRow.id,
      status: "processing",
      message: "AI processing already queued or running.",
      directivesExtracted: null,
    });
  }

  await db
    .update(casesTable)
    .set({ status: "processing", processingStartedAt: new Date(), updatedAt: new Date() })
    .where(eq(casesTable.id, caseRow.id));

  await enqueueProcessingJob(caseRow.id);

  await db.insert(auditLogTable).values({
    caseId: caseRow.id,
    caseNumber: caseRow.caseNumber,
    eventType: "processing_queued",
    description: "AI processing queued and will continue in the background.",
  });

  return res.json({
    caseId: caseRow.id,
    status: "started",
    message: "AI processing queued. You can continue working while it runs.",
    directivesExtracted: null,
  });
});

router.get("/cases/:id/compliance-timeline", async (req, res) => {
  const parsed = GetComplianceTimelineParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const now = new Date();
  const items = await db
    .select()
    .from(actionItemsTable)
    .where(
      and(
        eq(actionItemsTable.caseId, parsed.data.id),
        sql`${actionItemsTable.deadline} IS NOT NULL`
      )
    )
    .orderBy(asc(actionItemsTable.deadline));

  const timeline = items.map((item) => {
    const deadline = item.deadline ? new Date(item.deadline) : null;
    const daysRemaining = deadline
      ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      date: item.deadline,
      title: item.title,
      description: item.description,
      type: "compliance_order",
      classification: item.classification,
      department: item.department,
      isInferred: item.deadlineInferred,
      directiveId: item.directiveId,
      daysRemaining,
      isOverdue: daysRemaining !== null && daysRemaining < 0,
    };
  });

  return res.json(timeline);
});

router.get("/cases/:id/judgment-text", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const judgment = await db
    .select({ rawTextPreview: judgmentsTable.rawTextPreview, pageCount: judgmentsTable.pageCount })
    .from(judgmentsTable)
    .where(eq(judgmentsTable.caseId, id))
    .then((r) => r[0]);

  if (!judgment) return res.status(404).json({ error: "No judgment uploaded yet" });

  return res.json(judgment);
});

export default router;

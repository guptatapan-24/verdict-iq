import { pgTable, serial, integer, timestamp, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const processingJobStatusEnum = pgEnum("processing_job_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);

export const processingJobsTable = pgTable("processing_jobs", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id).notNull(),
  status: processingJobStatusEnum("status").notNull().default("queued"),
  totalChunks: integer("total_chunks").notNull().default(0),
  processedChunks: integer("processed_chunks").notNull().default(0),
  totalPasses: integer("total_passes").notNull().default(1),
  currentPass: integer("current_pass").notNull().default(0),
  lastError: text("last_error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProcessingJobSchema = createInsertSchema(processingJobsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;
export type ProcessingJob = typeof processingJobsTable.$inferSelect;

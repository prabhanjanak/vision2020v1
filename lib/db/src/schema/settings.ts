import { pgTable, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const submissionSettingsTable = pgTable("submission_settings", {
  id: serial("id").primaryKey(),
  submissionsOpen: boolean("submissions_open").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubmissionSettingsSchema = createInsertSchema(submissionSettingsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertSubmissionSettings = z.infer<typeof insertSubmissionSettingsSchema>;
export type SubmissionSettings = typeof submissionSettingsTable.$inferSelect;

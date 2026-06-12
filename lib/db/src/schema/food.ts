import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { participantsTable } from "./participants";
import { systemUsersTable } from "./system-users";

export const foodSessionsTable = pgTable("food_sessions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const foodLogsTable = pgTable("food_logs", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  foodSessionId: integer("food_session_id").notNull().references(() => foodSessionsTable.id, { onDelete: "cascade" }),
  coordinatorId: integer("coordinator_id").references(() => systemUsersTable.id),
  collectedAt: timestamp("collected_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFoodSessionSchema = createInsertSchema(foodSessionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFoodLogSchema = createInsertSchema(foodLogsTable).omit({
  id: true,
  collectedAt: true,
});
export type InsertFoodSession = z.infer<typeof insertFoodSessionSchema>;
export type FoodSession = typeof foodSessionsTable.$inferSelect;
export type InsertFoodLog = z.infer<typeof insertFoodLogSchema>;
export type FoodLog = typeof foodLogsTable.$inferSelect;

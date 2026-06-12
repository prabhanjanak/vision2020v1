import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemUsersTable = pgTable("system_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  userType: text("user_type").notNull(), // admin | track_coordinator | food_coordinator | scientific_committee
  passwordHash: text("password_hash").notNull(),
  assignedTrack: text("assigned_track"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSystemUserSchema = createInsertSchema(systemUsersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSystemUser = z.infer<typeof insertSystemUserSchema>;
export type SystemUser = typeof systemUsersTable.$inferSelect;

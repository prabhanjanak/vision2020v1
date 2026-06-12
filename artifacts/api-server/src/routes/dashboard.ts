import { Router } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, participantsTable, attendanceLogsTable, uploadedFilesTable, foodLogsTable, foodSessionsTable, submissionSettingsTable, activityLogsTable, assignmentsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /dashboard/stats
router.get("/dashboard/stats", requireAuth(["admin", "track_coordinator", "scientific_committee"]), async (_req, res): Promise<void> => {
  const [totalRegs] = await db.select({ count: count() }).from(participantsTable);
  const [totalAttendance] = await db.select({ count: count() }).from(attendanceLogsTable);

  // PPT submissions
  const pptFiles = await db.select({ count: count() }).from(uploadedFilesTable).where(eq(uploadedFilesTable.fileType, "pptx"));
  const posterFiles = await db.select({ count: count() }).from(uploadedFilesTable).where(eq(uploadedFilesTable.fileType, "jpg"));

  // Food stats per session
  const foodStats = await db
    .select({
      sessionName: foodSessionsTable.name,
      count: count(foodLogsTable.id),
    })
    .from(foodSessionsTable)
    .leftJoin(foodLogsTable, eq(foodLogsTable.foodSessionId, foodSessionsTable.id))
    .groupBy(foodSessionsTable.id, foodSessionsTable.name);

  // Submission settings
  const [settings] = await db.select().from(submissionSettingsTable).limit(1);

  // Role breakdown
  const roleBreakdown = await db
    .select({
      role: assignmentsTable.role,
      count: count(),
    })
    .from(assignmentsTable)
    .groupBy(assignmentsTable.role);

  // Track breakdown
  const trackBreakdown = await db
    .select({
      track: assignmentsTable.track,
      count: count(),
    })
    .from(assignmentsTable)
    .groupBy(assignmentsTable.track);

  res.json({
    totalRegistrations: totalRegs?.count ?? 0,
    totalAttendance: totalAttendance?.count ?? 0,
    pptSubmissions: pptFiles[0]?.count ?? 0,
    posterSubmissions: posterFiles[0]?.count ?? 0,
    foodStats: foodStats.map((s) => ({ sessionName: s.sessionName, count: Number(s.count) })),
    submissionsOpen: settings?.submissionsOpen ?? true,
    roleBreakdown: roleBreakdown.map((r) => ({ role: r.role, count: Number(r.count) })),
    trackBreakdown: trackBreakdown.map((t) => ({ track: t.track, count: Number(t.count) })),
  });
});

// GET /dashboard/recent-activity
router.get("/dashboard/recent-activity", requireAuth(["admin", "track_coordinator", "scientific_committee"]), async (_req, res): Promise<void> => {
  const logs = await db
    .select()
    .from(activityLogsTable)
    .orderBy(sql`${activityLogsTable.timestamp} desc`)
    .limit(20);
  res.json(
    logs.map((l) => ({
      id: l.id,
      type: l.type,
      message: l.message,
      timestamp: l.timestamp.toISOString(),
    }))
  );
});

export default router;

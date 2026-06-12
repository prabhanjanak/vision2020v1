import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, participantsTable, attendanceLogsTable, activityLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { ScanAttendanceBody, ListAttendanceLogsQueryParams } from "@workspace/api-zod";

const router = Router();

// POST /attendance/scan
router.post("/attendance/scan", requireAuth(["admin", "food_coordinator"]), async (req, res): Promise<void> => {
  const parsed = ScanAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { registrationNumber } = parsed.data;

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.registrationNumber, registrationNumber));

  if (!participant) {
    res.json({ success: false, message: "Participant not found", participant: null });
    return;
  }

  const scannedBy = req.user?.id;
  await db.insert(attendanceLogsTable).values({ participantId: participant.id, scannedBy });
  await db.insert(activityLogsTable).values({
    type: "attendance",
    message: `Attendance marked: ${participant.name} (${participant.registrationNumber})`,
  });

  res.json({
    success: true,
    message: "Attendance recorded successfully",
    participant: {
      id: participant.id,
      registrationNumber: participant.registrationNumber,
      name: participant.name,
      email: participant.email,
      mobile: participant.mobile,
      institution: participant.institution,
      createdAt: participant.createdAt.toISOString(),
      hasPassword: !!participant.passwordHash,
    },
  });
});

// GET /attendance/logs
router.get("/attendance/logs", requireAuth(["admin", "food_coordinator"]), async (req, res): Promise<void> => {
  const parsed = ListAttendanceLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const logs = await db
    .select({
      id: attendanceLogsTable.id,
      participantId: attendanceLogsTable.participantId,
      participantName: participantsTable.name,
      registrationNumber: participantsTable.registrationNumber,
      institution: participantsTable.institution,
      scannedAt: attendanceLogsTable.scannedAt,
    })
    .from(attendanceLogsTable)
    .innerJoin(participantsTable, eq(attendanceLogsTable.participantId, participantsTable.id))
    .orderBy(attendanceLogsTable.scannedAt);

  const { search } = parsed.data;
  let result = logs;
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(
      (l) =>
        l.participantName.toLowerCase().includes(s) ||
        l.registrationNumber.toLowerCase().includes(s)
    );
  }

  res.json(
    result.map((l) => ({
      id: l.id,
      participantId: l.participantId,
      participantName: l.participantName,
      registrationNumber: l.registrationNumber,
      institution: l.institution,
      scannedAt: l.scannedAt.toISOString(),
    }))
  );
});

export default router;

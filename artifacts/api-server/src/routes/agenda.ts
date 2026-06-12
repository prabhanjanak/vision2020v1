import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, participantsTable, assignmentsTable } from "@workspace/db";
import { GetPersonalAgendaParams } from "@workspace/api-zod";

const router = Router();

// GET /agenda/:registrationNumber — public
router.get("/agenda/:registrationNumber", async (req, res): Promise<void> => {
  const params = GetPersonalAgendaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.registrationNumber, params.data.registrationNumber));
  if (!participant) {
    res.status(404).json({ error: "Participant not found" });
    return;
  }
  const assignments = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.participantId, participant.id))
    .orderBy(asc(assignmentsTable.date), asc(assignmentsTable.time));

  res.json({
    registrationNumber: participant.registrationNumber,
    name: participant.name,
    institution: participant.institution,
    assignments: assignments.map((a) => ({
      id: a.id,
      participantId: a.participantId,
      role: a.role,
      track: a.track,
      sessionName: a.sessionName,
      hall: a.hall,
      date: a.date,
      time: a.time,
      presentationTitle: a.presentationTitle,
      fileId: null,
      uploadedFile: null,
    })),
  });
});

export default router;

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, assignmentsTable, uploadedFilesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  ListAssignmentsParams,
  CreateAssignmentParams,
  CreateAssignmentBody,
  UpdateAssignmentParams,
  UpdateAssignmentBody,
  DeleteAssignmentParams,
} from "@workspace/api-zod";

const router = Router();

function buildAssignment(a: typeof assignmentsTable.$inferSelect, file?: typeof uploadedFilesTable.$inferSelect | null) {
  return {
    id: a.id,
    participantId: a.participantId,
    role: a.role,
    track: a.track,
    sessionName: a.sessionName,
    hall: a.hall,
    date: a.date,
    time: a.time,
    presentationTitle: a.presentationTitle,
    fileId: file?.id ?? null,
    uploadedFile: file
      ? {
          id: file.id,
          assignmentId: file.assignmentId,
          filename: file.filename,
          originalName: file.originalName,
          fileType: file.fileType,
          version: file.version,
          size: file.size,
          uploadedAt: file.uploadedAt.toISOString(),
        }
      : null,
  };
}

// GET /participants/:participantId/assignments
router.get(
  "/participants/:participantId/assignments",
  requireAuth(),
  async (req, res): Promise<void> => {
    const params = ListAssignmentsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = req.user!;
    if (user.userType === "participant" && user.participantId !== params.data.participantId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const assignments = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.participantId, params.data.participantId));

    const result = await Promise.all(
      assignments.map(async (a) => {
        const [file] = await db
          .select()
          .from(uploadedFilesTable)
          .where(eq(uploadedFilesTable.assignmentId, a.id))
          .orderBy(uploadedFilesTable.version);
        return buildAssignment(a, file ?? null);
      })
    );
    res.json(result);
  }
);

// POST /participants/:participantId/assignments
router.post(
  "/participants/:participantId/assignments",
  requireAuth(["admin"]),
  async (req, res): Promise<void> => {
    const params = CreateAssignmentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = CreateAssignmentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [assignment] = await db
      .insert(assignmentsTable)
      .values({ participantId: params.data.participantId, ...parsed.data })
      .returning();
    res.status(201).json(buildAssignment(assignment, null));
  }
);

// PATCH /assignments/:id
router.patch(
  "/assignments/:id",
  requireAuth(["admin"]),
  async (req, res): Promise<void> => {
    const params = UpdateAssignmentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateAssignmentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [assignment] = await db
      .update(assignmentsTable)
      .set(parsed.data)
      .where(eq(assignmentsTable.id, params.data.id))
      .returning();
    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    res.json(buildAssignment(assignment, null));
  }
);

// DELETE /assignments/:id
router.delete(
  "/assignments/:id",
  requireAuth(["admin"]),
  async (req, res): Promise<void> => {
    const params = DeleteAssignmentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [deleted] = await db
      .delete(assignmentsTable)
      .where(eq(assignmentsTable.id, params.data.id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    res.sendStatus(204);
  }
);

export default router;

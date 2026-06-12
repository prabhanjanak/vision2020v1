import { Router } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db, foodSessionsTable, foodLogsTable, participantsTable, systemUsersTable, activityLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  CreateFoodSessionBody,
  UpdateFoodSessionParams,
  UpdateFoodSessionBody,
  DeleteFoodSessionParams,
  ToggleFoodSessionParams,
  ToggleFoodSessionBody,
  ScanFoodQRBody,
  ListFoodLogsQueryParams,
} from "@workspace/api-zod";

const router = Router();

// GET /food-sessions
router.get("/food-sessions", requireAuth(), async (_req, res): Promise<void> => {
  const sessions = await db.select().from(foodSessionsTable).orderBy(foodSessionsTable.date);
  res.json(sessions.map((s) => ({
    id: s.id,
    name: s.name,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    enabled: s.enabled,
    createdAt: s.createdAt.toISOString(),
  })));
});

// POST /food-sessions
router.post("/food-sessions", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const parsed = CreateFoodSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [session] = await db.insert(foodSessionsTable).values(parsed.data).returning();
  res.status(201).json({
    id: session.id,
    name: session.name,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    enabled: session.enabled,
    createdAt: session.createdAt.toISOString(),
  });
});

// PATCH /food-sessions/:id
router.patch("/food-sessions/:id", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const params = UpdateFoodSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateFoodSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [session] = await db
    .update(foodSessionsTable)
    .set(parsed.data)
    .where(eq(foodSessionsTable.id, params.data.id))
    .returning();
  if (!session) {
    res.status(404).json({ error: "Food session not found" });
    return;
  }
  res.json({ id: session.id, name: session.name, date: session.date, startTime: session.startTime, endTime: session.endTime, enabled: session.enabled, createdAt: session.createdAt.toISOString() });
});

// DELETE /food-sessions/:id
router.delete("/food-sessions/:id", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const params = DeleteFoodSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(foodSessionsTable).where(eq(foodSessionsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Food session not found" });
    return;
  }
  res.sendStatus(204);
});

// POST /food-sessions/:id/toggle
router.post("/food-sessions/:id/toggle", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const params = ToggleFoodSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ToggleFoodSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [session] = await db
    .update(foodSessionsTable)
    .set({ enabled: parsed.data.enabled })
    .where(eq(foodSessionsTable.id, params.data.id))
    .returning();
  if (!session) {
    res.status(404).json({ error: "Food session not found" });
    return;
  }
  res.json({ id: session.id, name: session.name, date: session.date, startTime: session.startTime, endTime: session.endTime, enabled: session.enabled, createdAt: session.createdAt.toISOString() });
});

// POST /food/scan
router.post("/food/scan", requireAuth(["admin", "food_coordinator"]), async (req, res): Promise<void> => {
  const parsed = ScanFoodQRBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { registrationNumber, foodSessionId } = parsed.data;

  // Find participant
  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.registrationNumber, registrationNumber));
  if (!participant) {
    res.json({ success: false, message: "Participant not found", status: "not_found", participant: null });
    return;
  }

  // Check session exists and is enabled
  const [session] = await db.select().from(foodSessionsTable).where(eq(foodSessionsTable.id, foodSessionId));
  if (!session || !session.enabled) {
    res.json({ success: false, message: "Food session is not active", status: "session_closed", participant: null });
    return;
  }

  // Check if already collected
  const [existing] = await db
    .select()
    .from(foodLogsTable)
    .where(and(eq(foodLogsTable.participantId, participant.id), eq(foodLogsTable.foodSessionId, foodSessionId)));
  if (existing) {
    res.json({ success: false, message: "Food already collected for this session", status: "already_collected", participant: {
      id: participant.id, registrationNumber: participant.registrationNumber, name: participant.name, email: participant.email, mobile: participant.mobile, institution: participant.institution, createdAt: participant.createdAt.toISOString(), hasPassword: !!participant.passwordHash
    }});
    return;
  }

  const coordinatorId = req.user?.userType !== "participant" ? req.user?.id : undefined;
  await db.insert(foodLogsTable).values({ participantId: participant.id, foodSessionId, coordinatorId });
  await db.insert(activityLogsTable).values({
    type: "food",
    message: `Food issued to ${participant.name} (${participant.registrationNumber}) - ${session.name}`,
  });

  res.json({
    success: true,
    message: "Food issued successfully",
    status: "issued",
    participant: {
      id: participant.id, registrationNumber: participant.registrationNumber, name: participant.name, email: participant.email, mobile: participant.mobile, institution: participant.institution, createdAt: participant.createdAt.toISOString(), hasPassword: !!participant.passwordHash
    }
  });
});

// GET /food/logs
router.get("/food/logs", requireAuth(["admin", "food_coordinator"]), async (req, res): Promise<void> => {
  const parsed = ListFoodLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const logs = await db
    .select({
      id: foodLogsTable.id,
      participantId: foodLogsTable.participantId,
      participantName: participantsTable.name,
      registrationNumber: participantsTable.registrationNumber,
      foodSessionId: foodLogsTable.foodSessionId,
      foodSessionName: foodSessionsTable.name,
      coordinatorId: foodLogsTable.coordinatorId,
      collectedAt: foodLogsTable.collectedAt,
    })
    .from(foodLogsTable)
    .innerJoin(participantsTable, eq(foodLogsTable.participantId, participantsTable.id))
    .innerJoin(foodSessionsTable, eq(foodLogsTable.foodSessionId, foodSessionsTable.id))
    .orderBy(foodLogsTable.collectedAt);

  const { foodSessionId, search } = parsed.data;
  let result = logs;
  if (foodSessionId) {
    result = result.filter((l) => l.foodSessionId === foodSessionId);
  }
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
      foodSessionId: l.foodSessionId,
      foodSessionName: l.foodSessionName,
      coordinatorName: null,
      collectedAt: l.collectedAt.toISOString(),
    }))
  );
});

export default router;

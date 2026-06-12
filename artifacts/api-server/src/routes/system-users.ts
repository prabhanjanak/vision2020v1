import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, systemUsersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { hashPassword } from "../lib/auth";
import {
  CreateSystemUserBody,
  UpdateSystemUserParams,
  UpdateSystemUserBody,
  DeleteSystemUserParams,
} from "@workspace/api-zod";

const router = Router();

// GET /system-users
router.get("/system-users", requireAuth(["admin"]), async (_req, res): Promise<void> => {
  const users = await db.select().from(systemUsersTable).orderBy(systemUsersTable.createdAt);
  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      mobile: u.mobile,
      userType: u.userType,
      assignedTrack: u.assignedTrack,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

// POST /system-users
router.post("/system-users", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const parsed = CreateSystemUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await db
    .insert(systemUsersTable)
    .values({
      name: parsed.data.name,
      mobile: parsed.data.mobile,
      userType: parsed.data.userType,
      passwordHash,
      assignedTrack: parsed.data.assignedTrack ?? null,
    })
    .returning();
  res.status(201).json({
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    userType: user.userType,
    assignedTrack: user.assignedTrack,
    createdAt: user.createdAt.toISOString(),
  });
});

// PATCH /system-users/:id
router.patch("/system-users/:id", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const params = UpdateSystemUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSystemUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {
    name: parsed.data.name,
    mobile: parsed.data.mobile,
    userType: parsed.data.userType,
    assignedTrack: parsed.data.assignedTrack,
  };
  if (parsed.data.password) {
    updateData.passwordHash = await hashPassword(parsed.data.password);
  }
  const [user] = await db
    .update(systemUsersTable)
    .set(updateData)
    .where(eq(systemUsersTable.id, params.data.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    userType: user.userType,
    assignedTrack: user.assignedTrack,
    createdAt: user.createdAt.toISOString(),
  });
});

// DELETE /system-users/:id
router.delete("/system-users/:id", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const params = DeleteSystemUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(systemUsersTable)
    .where(eq(systemUsersTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;

import { Router } from "express";
import { eq, or } from "drizzle-orm";
import { db, systemUsersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { hashPassword, comparePassword } from "../lib/auth";
import {
  CreateSystemUserBody,
  UpdateSystemUserParams,
  UpdateSystemUserBody,
  DeleteSystemUserParams,
} from "@workspace/api-zod";
import { z } from "zod/v4";

const router = Router();

function buildUser(u: typeof systemUsersTable.$inferSelect) {
  return {
    id: u.id,
    empId: u.empId,
    name: u.name,
    email: u.email,
    mobile: u.mobile,
    userType: u.userType,
    assignedTrack: u.assignedTrack,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt.toISOString(),
  };
}

// GET /system-users
router.get("/system-users", requireAuth(["admin"]), async (_req, res): Promise<void> => {
  const users = await db.select().from(systemUsersTable).orderBy(systemUsersTable.createdAt);
  res.json(users.map(buildUser));
});

// POST /system-users
router.post("/system-users", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const parsed = CreateSystemUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Check EMP ID uniqueness
  const [existing] = await db
    .select({ id: systemUsersTable.id })
    .from(systemUsersTable)
    .where(eq(systemUsersTable.empId, parsed.data.empId));
  if (existing) {
    res.status(400).json({ error: "EMP ID already exists" });
    return;
  }

  const rawPassword = parsed.data.password || "Welcome@123";
  const passwordHash = await hashPassword(rawPassword);
  const [user] = await db
    .insert(systemUsersTable)
    .values({
      empId: parsed.data.empId,
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      mobile: parsed.data.mobile ?? null,
      userType: parsed.data.userType,
      passwordHash,
      assignedTrack: parsed.data.assignedTrack ?? null,
      mustChangePassword: true,
    })
    .returning();
  res.status(201).json(buildUser(user));
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
  const updateData: Record<string, unknown> = {};
  if (parsed.data.empId !== undefined) updateData.empId = parsed.data.empId;
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.mobile !== undefined) updateData.mobile = parsed.data.mobile;
  if (parsed.data.userType !== undefined) updateData.userType = parsed.data.userType;
  if (parsed.data.assignedTrack !== undefined) updateData.assignedTrack = parsed.data.assignedTrack;
  if (parsed.data.password) {
    updateData.passwordHash = await hashPassword(parsed.data.password);
    updateData.mustChangePassword = true;
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
  res.json(buildUser(user));
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

// POST /system-users/:id/reset-password  — admin resets to Welcome@123 + force change
router.post("/system-users/:id/reset-password", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const passwordHash = await hashPassword("Welcome@123");
  const [user] = await db
    .update(systemUsersTable)
    .set({ passwordHash, mustChangePassword: true })
    .where(eq(systemUsersTable.id, id))
    .returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ message: "Password reset to Welcome@123, user must change on next login" });
});

// POST /auth/staff/change-password  — staff member changes their own password after force reset
router.post("/auth/staff/change-password", requireAuth(), async (req, res): Promise<void> => {
  const user = req.user!;
  const parsed = z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [sysUser] = await db.select().from(systemUsersTable).where(eq(systemUsersTable.id, user.id));
  if (!sysUser) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await comparePassword(parsed.data.currentPassword, sysUser.passwordHash);
  if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.update(systemUsersTable).set({ passwordHash, mustChangePassword: false }).where(eq(systemUsersTable.id, user.id));
  res.json({ message: "Password changed successfully" });
});

export default router;

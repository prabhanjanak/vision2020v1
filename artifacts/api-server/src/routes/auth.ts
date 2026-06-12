import { Router } from "express";
import { eq, or } from "drizzle-orm";
import { db, participantsTable, systemUsersTable } from "@workspace/db";
import { hashPassword, comparePassword, signToken } from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";
import {
  LoginBody,
  SetPasswordBody,
  ForgotPasswordBody,
  ResetPasswordBody,
} from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { mobile, password, userType } = parsed.data;

  // Try participant login
  if (!userType || userType === "participant") {
    const [participant] = await db
      .select()
      .from(participantsTable)
      .where(eq(participantsTable.mobile, mobile));

    if (participant) {
      if (!participant.passwordHash) {
        res.status(401).json({ error: "PASSWORD_NOT_SET", message: "Please set your password first" });
        return;
      }
      const valid = await comparePassword(password, participant.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const token = signToken({
        id: participant.id,
        userType: "participant",
        participantId: participant.id,
      });
      res.json({
        token,
        user: {
          id: participant.id,
          name: participant.name,
          mobile: participant.mobile,
          userType: "participant",
          participantId: participant.id,
          assignedTrack: null,
        },
      });
      return;
    }
  }

  // Try system user login — match by empId OR mobile
  const [sysUser] = await db
    .select()
    .from(systemUsersTable)
    .where(
      or(
        eq(systemUsersTable.empId, mobile),
        eq(systemUsersTable.mobile, mobile)
      )
    );

  if (!sysUser) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (userType && userType !== sysUser.userType) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, sysUser.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({
    id: sysUser.id,
    userType: sysUser.userType,
    assignedTrack: sysUser.assignedTrack,
  });
  res.json({
    token,
    mustChangePassword: sysUser.mustChangePassword,
    user: {
      id: sysUser.id,
      name: sysUser.name,
      empId: sysUser.empId,
      email: sysUser.email,
      mobile: sysUser.mobile,
      userType: sysUser.userType,
      assignedTrack: sysUser.assignedTrack,
      mustChangePassword: sysUser.mustChangePassword,
      participantId: null,
    },
  });
});

router.post("/auth/set-password", async (req, res): Promise<void> => {
  const parsed = SetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { mobile, password } = parsed.data;

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.mobile, mobile));

  if (!participant) {
    res.status(404).json({ error: "Mobile number not registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(participantsTable)
    .set({ passwordHash })
    .where(eq(participantsTable.id, participant.id));

  const token = signToken({
    id: participant.id,
    userType: "participant",
    participantId: participant.id,
  });
  res.json({
    token,
    user: {
      id: participant.id,
      name: participant.name,
      mobile: participant.mobile,
      userType: "participant",
      participantId: participant.id,
      assignedTrack: null,
    },
  });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { mobile } = parsed.data;

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.mobile, mobile));

  if (!participant) {
    res.status(404).json({ error: "Mobile number not registered" });
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db
    .update(participantsTable)
    .set({ resetToken, resetTokenExpiry: expiry })
    .where(eq(participantsTable.id, participant.id));

  res.json({
    message: "Reset token generated",
    resetToken,
  });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { resetToken, newPassword } = parsed.data;

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.resetToken, resetToken));

  if (!participant || !participant.resetTokenExpiry || participant.resetTokenExpiry < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(participantsTable)
    .set({ passwordHash, resetToken: null, resetTokenExpiry: null })
    .where(eq(participantsTable.id, participant.id));

  const token = signToken({
    id: participant.id,
    userType: "participant",
    participantId: participant.id,
  });
  res.json({
    token,
    user: {
      id: participant.id,
      name: participant.name,
      mobile: participant.mobile,
      userType: "participant",
      participantId: participant.id,
      assignedTrack: null,
    },
  });
});

router.get("/auth/me", requireAuth(), async (req, res): Promise<void> => {
  const user = req.user!;
  if (user.userType === "participant") {
    const [participant] = await db
      .select()
      .from(participantsTable)
      .where(eq(participantsTable.id, user.id));
    if (!participant) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: participant.id,
      name: participant.name,
      mobile: participant.mobile,
      userType: "participant",
      participantId: participant.id,
      assignedTrack: null,
    });
  } else {
    const [sysUser] = await db
      .select()
      .from(systemUsersTable)
      .where(eq(systemUsersTable.id, user.id));
    if (!sysUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: sysUser.id,
      name: sysUser.name,
      mobile: sysUser.mobile,
      userType: sysUser.userType,
      assignedTrack: sysUser.assignedTrack,
      participantId: null,
    });
  }
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ message: "Logged out" });
});

export default router;

import { Router } from "express";
import { db, submissionSettingsTable, activityLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { UpdateSubmissionSettingsBody } from "@workspace/api-zod";

const router = Router();

// GET /settings/submissions
router.get("/settings/submissions", requireAuth(), async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(submissionSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(submissionSettingsTable).values({ submissionsOpen: true }).returning();
  }
  res.json({
    submissionsOpen: settings.submissionsOpen,
    updatedAt: settings.updatedAt.toISOString(),
  });
});

// PATCH /settings/submissions
router.patch("/settings/submissions", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const parsed = UpdateSubmissionSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let [settings] = await db.select().from(submissionSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(submissionSettingsTable).values({ submissionsOpen: parsed.data.submissionsOpen }).returning();
  } else {
    const { eq } = await import("drizzle-orm");
    [settings] = await db.update(submissionSettingsTable).set({ submissionsOpen: parsed.data.submissionsOpen }).where(eq(submissionSettingsTable.id, settings.id)).returning();
  }

  await db.insert(activityLogsTable).values({
    type: "submission_status",
    message: `Submissions ${parsed.data.submissionsOpen ? "opened" : "closed"} by admin`,
  });

  res.json({
    submissionsOpen: settings.submissionsOpen,
    updatedAt: settings.updatedAt.toISOString(),
  });
});

export default router;

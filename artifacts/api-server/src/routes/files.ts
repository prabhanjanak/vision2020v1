import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, assignmentsTable, uploadedFilesTable, participantsTable, submissionSettingsTable, activityLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  UploadFileParams,
  GetFileParams,
  DownloadFileParams,
} from "@workspace/api-zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".pptx" || ext === ".jpg" || ext === ".jpeg") {
      cb(null, true);
    } else {
      cb(new Error("Only PPTX and JPG files are allowed"));
    }
  },
});

// POST /assignments/:assignmentId/file
router.post(
  "/assignments/:assignmentId/file",
  requireAuth(["admin", "participant"]),
  upload.single("file"),
  async (req, res): Promise<void> => {
    const params = UploadFileParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // Check if submissions are open
    const [settings] = await db.select().from(submissionSettingsTable).limit(1);
    if (settings && !settings.submissionsOpen) {
      fs.unlinkSync(req.file.path);
      res.status(403).json({ error: "Submissions are closed" });
      return;
    }

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, params.data.assignmentId));
    if (!assignment) {
      fs.unlinkSync(req.file.path);
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    // Validate file type based on role
    const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");
    const isPoster = assignment.role === "PosterPresenter";
    if (isPoster && !["jpg", "jpeg"].includes(ext)) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: "Poster presenters must upload JPG files only" });
      return;
    }
    if (!isPoster && ext !== "pptx") {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: "Speakers and presenters must upload PPTX files only" });
      return;
    }

    // Get participant info for naming
    const [participant] = await db
      .select()
      .from(participantsTable)
      .where(eq(participantsTable.id, assignment.participantId));

    // Determine version
    const existingFiles = await db
      .select()
      .from(uploadedFilesTable)
      .where(eq(uploadedFilesTable.assignmentId, params.data.assignmentId));
    const version = existingFiles.length + 1;

    // Build standardized filename
    const firstName = participant?.name.split(" ")[0] || "Unknown";
    const regNum = participant?.registrationNumber || "REGXXX";
    const track = (assignment.track || "Track").replace(/\s/g, "");
    const session = (assignment.sessionName || "Session").replace(/\s/g, "");
    const posterSuffix = isPoster ? "_POSTER" : "";
    const fileExt = isPoster ? "jpg" : "pptx";
    const standardFilename = `${regNum}_${firstName}_${track}_${session}${posterSuffix}_V${version}.${fileExt}`;

    // Rename file on disk
    const newPath = path.join(uploadsDir, standardFilename);
    fs.renameSync(req.file.path, newPath);

    const [uploadedFile] = await db
      .insert(uploadedFilesTable)
      .values({
        assignmentId: params.data.assignmentId,
        filename: standardFilename,
        originalName: req.file.originalname,
        fileType: isPoster ? "jpg" : "pptx",
        version,
        size: req.file.size,
      })
      .returning();

    await db.insert(activityLogsTable).values({
      type: "upload",
      message: `File uploaded: ${standardFilename}`,
    });

    res.json({
      id: uploadedFile.id,
      assignmentId: uploadedFile.assignmentId,
      filename: uploadedFile.filename,
      originalName: uploadedFile.originalName,
      fileType: uploadedFile.fileType,
      version: uploadedFile.version,
      size: uploadedFile.size,
      uploadedAt: uploadedFile.uploadedAt.toISOString(),
    });
  }
);

// GET /assignments/:assignmentId/file
router.get(
  "/assignments/:assignmentId/file",
  requireAuth(),
  async (req, res): Promise<void> => {
    const params = GetFileParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const files = await db
      .select()
      .from(uploadedFilesTable)
      .where(eq(uploadedFilesTable.assignmentId, params.data.assignmentId))
      .orderBy(uploadedFilesTable.version);
    const file = files[files.length - 1]; // Latest version
    if (!file) {
      res.status(404).json({ error: "No file found" });
      return;
    }
    res.json({
      id: file.id,
      assignmentId: file.assignmentId,
      filename: file.filename,
      originalName: file.originalName,
      fileType: file.fileType,
      version: file.version,
      size: file.size,
      uploadedAt: file.uploadedAt.toISOString(),
    });
  }
);

// GET /files/:fileId/download
router.get(
  "/files/:fileId/download",
  requireAuth(),
  async (req, res): Promise<void> => {
    const params = DownloadFileParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [file] = await db
      .select()
      .from(uploadedFilesTable)
      .where(eq(uploadedFilesTable.id, params.data.fileId));
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const filePath = path.join(uploadsDir, file.filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found on disk" });
      return;
    }
    res.download(filePath, file.originalName);
  }
);

export default router;

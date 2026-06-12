import { Router } from "express";
import { eq, or, ilike, sql, and } from "drizzle-orm";
import { db, participantsTable, assignmentsTable, uploadedFilesTable, activityLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  ListParticipantsQueryParams,
  CreateParticipantBody,
  GetParticipantParams,
  UpdateParticipantParams,
  UpdateParticipantBody,
  DeleteParticipantParams,
  GetParticipantByMobileParams,
  GetParticipantQRParams,
} from "@workspace/api-zod";
import multer from "multer";
import * as xlsx from "xlsx";
import path from "path";
import QRCode from "qrcode";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

function buildParticipantResponse(p: typeof participantsTable.$inferSelect) {
  return {
    id: p.id,
    registrationNumber: p.registrationNumber,
    name: p.name,
    email: p.email,
    mobile: p.mobile,
    institution: p.institution,
    createdAt: p.createdAt.toISOString(),
    hasPassword: !!p.passwordHash,
  };
}

// GET /participants
router.get(
  "/participants",
  requireAuth(["admin", "track_coordinator", "scientific_committee"]),
  async (req, res): Promise<void> => {
    const parsed = ListParticipantsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { search, track, role, page = 1, limit = 50 } = parsed.data;
    const offset = (page - 1) * limit;

    let query = db
      .selectDistinctOn([participantsTable.id], {
        id: participantsTable.id,
        registrationNumber: participantsTable.registrationNumber,
        name: participantsTable.name,
        email: participantsTable.email,
        mobile: participantsTable.mobile,
        institution: participantsTable.institution,
        createdAt: participantsTable.createdAt,
        passwordHash: participantsTable.passwordHash,
      })
      .from(participantsTable)
      .$dynamic();

    if (track || role) {
      query = query.innerJoin(
        assignmentsTable,
        eq(participantsTable.id, assignmentsTable.participantId)
      );
    }

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(participantsTable.name, `%${search}%`),
          ilike(participantsTable.registrationNumber, `%${search}%`),
          ilike(participantsTable.institution, `%${search}%`),
          ilike(participantsTable.mobile, `%${search}%`)
        )
      );
    }
    if (track) {
      conditions.push(ilike(assignmentsTable.track, `%${track}%`));
    }
    if (role) {
      conditions.push(eq(assignmentsTable.role, role));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const all = await query;
    const total = all.length;
    const participants = all.slice(offset, offset + limit).map(buildParticipantResponse);

    res.json({ participants, total, page, limit });
  }
);

// POST /participants
router.post(
  "/participants",
  requireAuth(["admin"]),
  async (req, res): Promise<void> => {
    const parsed = CreateParticipantBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const existing = await db
      .select({ id: participantsTable.id })
      .from(participantsTable)
      .where(
        or(
          eq(participantsTable.registrationNumber, parsed.data.registrationNumber),
          eq(participantsTable.mobile, parsed.data.mobile)
        )
      );
    if (existing.length > 0) {
      res.status(400).json({ error: "Registration number or mobile already exists" });
      return;
    }
    const [participant] = await db
      .insert(participantsTable)
      .values(parsed.data)
      .returning();

    await db.insert(activityLogsTable).values({
      type: "registration",
      message: `New participant registered: ${participant.name} (${participant.registrationNumber})`,
    });

    res.status(201).json(buildParticipantResponse(participant));
  }
);

// POST /participants/import
router.post(
  "/participants/import",
  requireAuth(["admin"]),
  upload.single("file"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<Record<string, string>>(sheet);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Support both the real Vision2020 Excel format and a simple generic format
    const ROLE_COL = "Role (Chair/Co-Chair/Moderator/\r\nPanellist/Speaker)";
    const isVision2020Format = rows.length > 0 && ROLE_COL in rows[0];

    function mapRole(raw: string): string {
      const r = (raw || "").trim().toLowerCase();
      if (r === "poster") return "PosterPresenter";
      if (r === "co-chair") return "CoChair";
      if (r === "panelist" || r === "panellist") return "Panelist";
      if (r === "speaker") return "Speaker";
      if (r === "presenter") return "Presenter";
      if (r === "moderator") return "Moderator";
      if (r === "judge") return "Judge";
      if (r === "chair") return "Chair";
      if (r === "warp-up" || r === "wrap-up") return "Moderator";
      return "Speaker";
    }

    function mapDay(day: string | number): string {
      const d = Number(day);
      if (d === 1) return "2026-07-10";
      if (d === 2) return "2026-07-11";
      if (d === 3) return "2026-07-12";
      // If already a date string, pass through
      if (typeof day === "string" && day.includes("-")) return day;
      return "2026-07-10";
    }

    function mapTrack(t: string | number): string {
      if (typeof t === "number") return `Track ${t}`;
      return String(t || "").trim() || "General";
    }

    // Track mobile counter for auto-generation
    const existingCount = await db.select({ id: participantsTable.id }).from(participantsTable);
    let mobileCounter = existingCount.length + 1;
    const participantKeyMap = new Map<string, number>(); // "name|institution" → participantId

    for (const row of rows) {
      try {
        let name: string, institution: string, mobile: string, email: string;
        let regNum: string, role: string, track: string, sessionName: string;
        let hall: string, date: string, time: string, presentationTitle: string;

        if (isVision2020Format) {
          // Real Vision2020 Excel format
          name = String(row["Name"] || "").trim();
          institution = String(row["Hospital Name"] || "").trim();
          mobile = String(row["Mobile Number"] || "").trim();
          const rawRole = String(row[ROLE_COL] || "").trim();
          const rawTrack = row["Track number"];
          const rawDay = row["Day"];

          role = mapRole(rawRole);
          track = mapTrack(rawTrack as string | number);
          sessionName = String(row["Session name"] || "").trim();
          hall = "";
          date = mapDay(rawDay as string | number);
          time = String(row["Time"] || "").trim();
          presentationTitle = String(row["Tittle"] || "").trim();

          // Registration number: use Poster/Paper No as suffix if present
          const paperNo = row["Poster / Paper No"] || row["Sr. No"] || "";
          regNum = String(row["Registration Number"] || row["registrationNumber"] || "").trim();

          if (!name) { skipped++; continue; }

          // Group by name+institution — same person may appear multiple times
          const key = `${name}|${institution}`;
          let participantId = participantKeyMap.get(key);

          if (participantId === undefined) {
            // Check DB by name+institution (rough match)
            const existing = await db
              .select()
              .from(participantsTable)
              .where(eq(participantsTable.name, name));
            const match = existing.find(p => p.institution === institution);

            if (match) {
              participantId = match.id;
            } else {
              // Auto-generate mobile and reg number if missing
              if (!mobile) {
                mobile = `98${String(mobileCounter + 10000000).slice(-8)}`;
                mobileCounter++;
              }
              if (!regNum) {
                const count = await db.select({ id: participantsTable.id }).from(participantsTable);
                regNum = `V2020-${String(count.length + 1).padStart(5, "0")}`;
              }
              const emailBase = name.toLowerCase().replace(/[^a-z0-9]/g, ".").replace(/\.+/g, ".").replace(/^\.|\.$/, "");
              email = `${emailBase}@conference.vision2020india.org`;

              // Ensure mobile uniqueness
              const mobileExists = await db.select({ id: participantsTable.id }).from(participantsTable).where(eq(participantsTable.mobile, mobile));
              if (mobileExists.length > 0) {
                mobile = `98${String(Date.now()).slice(-8)}`;
              }

              const [newP] = await db
                .insert(participantsTable)
                .values({ registrationNumber: regNum, name, email, mobile, institution: institution || "Unknown Institution" })
                .returning();
              participantId = newP.id;
              await db.insert(activityLogsTable).values({
                type: "registration",
                message: `Imported: ${name} (${newP.registrationNumber})`,
              });
            }
            participantKeyMap.set(key, participantId);
          }

          // Insert assignment
          await db.insert(assignmentsTable).values({
            participantId,
            role,
            track,
            sessionName: sessionName || null,
            hall: null,
            date,
            time: time || null,
            presentationTitle: presentationTitle || null,
          });
          imported++;

        } else {
          // Generic/simple format
          regNum = String(row["Registration Number"] || row["registrationNumber"] || "").trim();
          name = String(row["Name"] || row["name"] || "").trim();
          email = String(row["Email"] || row["email"] || "").trim();
          mobile = String(row["Mobile Number"] || row["mobile"] || "").trim();
          institution = String(row["Institution"] || row["institution"] || "").trim();
          role = String(row["Role"] || row["role"] || "").trim();
          track = String(row["Track"] || row["track"] || "").trim();
          sessionName = String(row["Session"] || row["session"] || "").trim();
          hall = String(row["Hall"] || row["hall"] || "").trim();
          date = String(row["Date"] || row["date"] || "").trim();
          time = String(row["Time"] || row["time"] || "").trim();
          presentationTitle = String(row["Presentation Title"] || row["presentationTitle"] || "").trim();

          if (!regNum || !name || !mobile) {
            errors.push(`Row missing required fields (need Registration Number, Name, Mobile Number)`);
            skipped++;
            continue;
          }

          const [existing] = await db
            .select()
            .from(participantsTable)
            .where(eq(participantsTable.registrationNumber, regNum));

          let participantId: number;
          if (existing) {
            participantId = existing.id;
          } else {
            const [newP] = await db
              .insert(participantsTable)
              .values({ registrationNumber: regNum, name, email, mobile, institution })
              .returning();
            participantId = newP.id;
            await db.insert(activityLogsTable).values({
              type: "registration",
              message: `Imported: ${name} (${regNum})`,
            });
          }

          if (role) {
            await db.insert(assignmentsTable).values({
              participantId,
              role,
              track: track || "General",
              sessionName: sessionName || null,
              hall: hall || null,
              date: date || null,
              time: time || null,
              presentationTitle: presentationTitle || null,
            });
          }
          imported++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Error processing row: ${msg}`);
        skipped++;
      }
    }

    res.json({ imported, skipped, errors });
  }
);

// GET /participants/:id
router.get(
  "/participants/:id",
  requireAuth(["admin", "track_coordinator", "scientific_committee", "participant"]),
  async (req, res): Promise<void> => {
    const params = GetParticipantParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = req.user!;
    // Participant can only see their own record
    if (user.userType === "participant" && user.participantId !== params.data.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [participant] = await db
      .select()
      .from(participantsTable)
      .where(eq(participantsTable.id, params.data.id));

    if (!participant) {
      res.status(404).json({ error: "Participant not found" });
      return;
    }

    const assignments = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.participantId, params.data.id));

    const assignmentsWithFiles = await Promise.all(
      assignments.map(async (a) => {
        const [file] = await db
          .select()
          .from(uploadedFilesTable)
          .where(eq(uploadedFilesTable.assignmentId, a.id))
          .orderBy(uploadedFilesTable.version);
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
      })
    );

    res.json({
      id: participant.id,
      registrationNumber: participant.registrationNumber,
      name: participant.name,
      email: participant.email,
      mobile: participant.mobile,
      institution: participant.institution,
      createdAt: participant.createdAt.toISOString(),
      hasPassword: !!participant.passwordHash,
      assignments: assignmentsWithFiles,
    });
  }
);

// PATCH /participants/:id
router.patch(
  "/participants/:id",
  requireAuth(["admin"]),
  async (req, res): Promise<void> => {
    const params = UpdateParticipantParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateParticipantBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [participant] = await db
      .update(participantsTable)
      .set(parsed.data)
      .where(eq(participantsTable.id, params.data.id))
      .returning();
    if (!participant) {
      res.status(404).json({ error: "Participant not found" });
      return;
    }
    res.json(buildParticipantResponse(participant));
  }
);

// DELETE /participants/:id
router.delete(
  "/participants/:id",
  requireAuth(["admin"]),
  async (req, res): Promise<void> => {
    const params = DeleteParticipantParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [deleted] = await db
      .delete(participantsTable)
      .where(eq(participantsTable.id, params.data.id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Participant not found" });
      return;
    }
    res.sendStatus(204);
  }
);

// GET /participants/by-mobile/:mobile
router.get(
  "/participants/by-mobile/:mobile",
  requireAuth(),
  async (req, res): Promise<void> => {
    const params = GetParticipantByMobileParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [participant] = await db
      .select()
      .from(participantsTable)
      .where(eq(participantsTable.mobile, params.data.mobile));

    if (!participant) {
      res.status(404).json({ error: "Participant not found" });
      return;
    }

    const assignments = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.participantId, participant.id));

    res.json({
      ...buildParticipantResponse(participant),
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
  }
);

// GET /participants/:id/qr
router.get(
  "/participants/:id/qr",
  requireAuth(),
  async (req, res): Promise<void> => {
    const params = GetParticipantQRParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = req.user!;
    if (user.userType === "participant" && user.participantId !== params.data.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [participant] = await db
      .select()
      .from(participantsTable)
      .where(eq(participantsTable.id, params.data.id));
    if (!participant) {
      res.status(404).json({ error: "Participant not found" });
      return;
    }

    const baseDomain = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost";
    const baseUrl = baseDomain.startsWith("localhost") ? `http://${baseDomain}` : `https://${baseDomain}`;

    const [qr1DataUrl, qr2DataUrl, qr3DataUrl] = await Promise.all([
      QRCode.toDataURL(participant.registrationNumber, { width: 300, margin: 2 }),
      QRCode.toDataURL(`${baseUrl}/api/agenda-pdf`, { width: 300, margin: 2 }),
      QRCode.toDataURL(`${baseUrl}/agenda/${participant.registrationNumber}`, { width: 300, margin: 2 }),
    ]);

    const firstName = participant.name.split(" ")[0];
    res.json({
      qr1: {
        type: "registration",
        dataUrl: qr1DataUrl,
        label: "Registration QR (for attendance & food)",
        downloadName: `${firstName}QR1.png`,
      },
      qr2: {
        type: "general_agenda",
        dataUrl: qr2DataUrl,
        label: "General Agenda QR",
        downloadName: `${firstName}QR2.png`,
      },
      qr3: {
        type: "personal_agenda",
        dataUrl: qr3DataUrl,
        label: "Personal Agenda QR",
        downloadName: `${firstName}QR3.png`,
      },
    });
  }
);

export default router;

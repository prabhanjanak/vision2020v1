import { db, participantsTable, systemUsersTable, submissionSettingsTable, foodSessionsTable, assignmentsTable } from "@workspace/db";
import * as xlsx from "xlsx";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROLE_COL = "Role (Chair/Co-Chair/Moderator/\r\nPanellist/Speaker)";

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

function mapDay(day: number | string): string {
  const d = Number(day);
  if (d === 1) return "2026-07-10";
  if (d === 2) return "2026-07-11";
  if (d === 3) return "2026-07-12";
  return "2026-07-10";
}

function mapTrack(track: string | number): string {
  if (typeof track === "number") return `Track ${track}`;
  return String(track || "").trim() || "General";
}

function generateMobile(index: number): string {
  return `98${String(index + 10000000).slice(-8)}`;
}

function generateRegNumber(index: number): string {
  return `V2020-${String(index).padStart(5, "0")}`;
}

async function seed() {
  console.log("Starting Excel-based seed...");

  // Read Excel file
  const excelPath = path.resolve(__dirname, "../../attached_assets/Vision2020-Test-PPTposter_database_1781260419496.xlsx");
  if (!fs.existsSync(excelPath)) {
    console.error("Excel file not found at:", excelPath);
    process.exit(1);
  }
  const buf = fs.readFileSync(excelPath);
  const wb = xlsx.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: "" });
  console.log(`Read ${rows.length} rows from Excel`);

  // Clear existing participant/assignment data (keep system users and food sessions)
  await db.delete(assignmentsTable);
  await db.delete(participantsTable);
  console.log("Cleared existing participant/assignment data");

  // Ensure submission settings
  const [existingSettings] = await db.select().from(submissionSettingsTable).limit(1);
  if (!existingSettings) {
    await db.insert(submissionSettingsTable).values({ submissionsOpen: true });
  }

  // Upsert admin user
  const adminMobile = "9999900000";
  const [existingAdmin] = await db.select().from(systemUsersTable).where(eq(systemUsersTable.mobile, adminMobile));
  if (!existingAdmin) {
    const ph = await bcrypt.hash("Admin@2026", 10);
    await db.insert(systemUsersTable).values({ name: "Admin", mobile: adminMobile, userType: "admin", passwordHash: ph });
    console.log("Created admin: 9999900000 / Admin@2026");
  }

  // Upsert food coordinator
  const fcMobile = "9999900001";
  const [existingFC] = await db.select().from(systemUsersTable).where(eq(systemUsersTable.mobile, fcMobile));
  if (!existingFC) {
    const ph = await bcrypt.hash("Food@2026", 10);
    await db.insert(systemUsersTable).values({ name: "Food Coordinator", mobile: fcMobile, userType: "food_coordinator", passwordHash: ph });
    console.log("Created food coordinator: 9999900001 / Food@2026");
  }

  // Seed food sessions
  const existingSessions = await db.select().from(foodSessionsTable);
  if (existingSessions.length === 0) {
    await db.insert(foodSessionsTable).values([
      { name: "Breakfast Day 1", date: "2026-07-10", startTime: "07:30", endTime: "08:30", enabled: false },
      { name: "Lunch Day 1", date: "2026-07-10", startTime: "13:00", endTime: "14:00", enabled: false },
      { name: "Dinner Day 1", date: "2026-07-10", startTime: "19:00", endTime: "20:30", enabled: false },
      { name: "Breakfast Day 2", date: "2026-07-11", startTime: "07:30", endTime: "08:30", enabled: false },
      { name: "Lunch Day 2", date: "2026-07-11", startTime: "13:00", endTime: "14:00", enabled: false },
      { name: "Dinner Day 2", date: "2026-07-11", startTime: "19:00", endTime: "20:30", enabled: false },
      { name: "Breakfast Day 3", date: "2026-07-12", startTime: "07:30", endTime: "08:30", enabled: false },
      { name: "Lunch Day 3", date: "2026-07-12", startTime: "13:00", endTime: "14:00", enabled: false },
    ]);
    console.log("Created food sessions");
  }

  // Build participant map: key = "name|institution" → { regNum, mobile, participantId }
  const participantMap = new Map<string, { regNum: string; mobile: string; participantId: number }>();
  let participantCounter = 1;
  let mobileCounter = 1;

  // Also build track coordinator users from unique tracks
  const uniqueTracks = new Set<string>();

  for (const row of rows) {
    const name = String(row["Name"] || "").trim();
    const institution = String(row["Hospital Name"] || "").trim();
    const role = mapRole(String(row[ROLE_COL] || ""));
    const track = mapTrack(row["Track number"]);
    const sessionName = String(row["Session name"] || "").trim() || null;
    const day = mapDay(row["Day"]);
    const time = String(row["Time"] || "").trim() || null;
    const title = String(row["Tittle"] || "").trim() || null;

    if (!name) continue;

    uniqueTracks.add(track);

    const key = `${name}|${institution}`;
    let participant = participantMap.get(key);

    if (!participant) {
      const regNum = generateRegNumber(participantCounter);
      const mobile = generateMobile(mobileCounter);
      participantCounter++;
      mobileCounter++;

      // Generate email from name
      const emailBase = name.toLowerCase().replace(/[^a-z0-9]/g, ".").replace(/\.+/g, ".").replace(/^\.|\.$/, "");
      const email = `${emailBase}@conference.vision2020india.org`;

      const passwordHash = await bcrypt.hash("Test@1234", 10);
      const [p] = await db.insert(participantsTable).values({
        registrationNumber: regNum,
        name,
        email,
        mobile,
        institution: institution || "Unknown Institution",
        passwordHash,
      }).returning();

      participant = { regNum, mobile, participantId: p.id };
      participantMap.set(key, participant);
    }

    // Insert assignment
    await db.insert(assignmentsTable).values({
      participantId: participant.participantId,
      role,
      track,
      sessionName,
      hall: null,
      date: day,
      time,
      presentationTitle: title || null,
    });
  }

  // Create track coordinator system users for each unique track
  let coordMobile = 9999900010;
  const trackList = [...uniqueTracks].sort();
  for (const track of trackList) {
    const mobile = String(coordMobile++);
    const [existing] = await db.select().from(systemUsersTable).where(eq(systemUsersTable.mobile, mobile));
    if (!existing) {
      const ph = await bcrypt.hash("Coord@2026", 10);
      const coordName = `Coordinator ${track}`;
      await db.insert(systemUsersTable).values({
        name: coordName,
        mobile,
        userType: "track_coordinator",
        passwordHash: ph,
        assignedTrack: track,
      });
    }
  }

  console.log(`\nSeed complete!`);
  console.log(`Participants created: ${participantCounter - 1}`);
  console.log(`Tracks found: ${trackList.join(", ")}`);
  console.log(`\nTest credentials:`);
  console.log(`  Admin:           9999900000 / Admin@2026`);
  console.log(`  Food Coord:      9999900001 / Food@2026`);
  console.log(`  Track Coords:    9999900010+ / Coord@2026`);
  console.log(`  All Participants: Test@1234`);

  // Print first 5 participants for quick testing
  const firstFive = await db.select().from(participantsTable).limit(5);
  console.log(`\nFirst 5 participants:`);
  for (const p of firstFive) {
    console.log(`  ${p.registrationNumber} | ${p.name} | mobile: ${p.mobile}`);
  }
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import participantsRouter from "./participants";
import assignmentsRouter from "./assignments";
import filesRouter from "./files";
import agendaRouter from "./agenda";
import foodRouter from "./food";
import attendanceRouter from "./attendance";
import dashboardRouter from "./dashboard";
import tracksRouter from "./tracks";
import scientificRouter from "./scientific";
import settingsRouter from "./settings";
import systemUsersRouter from "./system-users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(participantsRouter);
router.use(assignmentsRouter);
router.use(filesRouter);
router.use(agendaRouter);
router.use(foodRouter);
router.use(attendanceRouter);
router.use(dashboardRouter);
router.use(tracksRouter);
router.use(scientificRouter);
router.use(settingsRouter);
router.use(systemUsersRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminUsersRouter from "./admin/users";
import adminAppsRouter from "./admin/apps";
import adminStatsRouter from "./admin/stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminUsersRouter);
router.use(adminAppsRouter);
router.use(adminStatsRouter);

export default router;

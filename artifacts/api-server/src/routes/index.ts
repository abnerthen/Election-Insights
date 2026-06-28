import { Router, type IRouter } from "express";
import healthRouter from "./health";
import electionsRouter from "./elections";
import partiesRouter from "./parties";
import constituenciesRouter from "./constituencies";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(electionsRouter);
router.use(partiesRouter);
router.use(constituenciesRouter);
router.use(adminRouter);

export default router;

import { Router } from "express";
import comicRoutes from "./comicRoutes";
import videoRoutes from "./videoRoutes";
import configRoutes from "./configRoutes";
import syncRoutes from "./syncRoutes";

const router = Router();

router.use("/comics", comicRoutes);
router.use("/videos", videoRoutes);
router.use("/config", configRoutes);
router.use("/sync", syncRoutes);

export default router;

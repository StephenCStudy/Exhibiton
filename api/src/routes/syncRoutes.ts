import { Router } from "express";
import {
  syncVideosFromMega,
  syncComicsFromMega,
  getMegaFolderStructure,
} from "../controllers/syncController";

const router = Router();

// Get Mega folder structure (preview)
router.get("/mega/structure", getMegaFolderStructure);

// Sync videos from Mega Exhibition folder
router.post("/mega/videos", syncVideosFromMega);

// Sync comics from Mega Comic folder
router.post("/mega/comics", syncComicsFromMega);

export default router;

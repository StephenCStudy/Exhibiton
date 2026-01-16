import { Router } from "express";
import {
  syncVideosFromMega,
  syncComicsFromMega,
  syncAllFromMega,
  getMegaFolderStructure,
} from "../controllers/syncController";

const router = Router();

// Get Mega folder structure (preview)
router.get("/mega/structure", getMegaFolderStructure);

// Sync videos from Mega Exhibition folder
router.post("/mega/videos", syncVideosFromMega);

// Sync comics from Mega Comic folder
router.post("/mega/comics", syncComicsFromMega);

// Sync all (videos + comics) from Mega
router.post("/mega/all", syncAllFromMega);

export default router;

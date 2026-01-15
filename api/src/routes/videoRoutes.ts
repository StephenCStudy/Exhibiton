import { Router } from "express";
import multer from "multer";
import {
  getAllVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  uploadAndCreateVideo,
  uploadAndUpdateVideo,
  streamVideo,
  getVideoMetadata,
} from "../controllers/videoController";

// Configure multer for file uploads with larger limits for videos
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB per file
  },
});

const router = Router();

router.get("/", getAllVideos);
router.get("/:id", getVideoById);
router.get("/:id/stream", streamVideo);
router.get("/:id/metadata", getVideoMetadata);
router.post("/", createVideo);
router.post("/upload", upload.single("file"), uploadAndCreateVideo);
router.put("/upload/:id", upload.single("file"), uploadAndUpdateVideo);
router.put("/:id", updateVideo);
router.delete("/:id", deleteVideo);

export default router;

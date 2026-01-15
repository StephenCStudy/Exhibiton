import { Router } from "express";
import multer from "multer";
import {
  getAllComics,
  getComicById,
  getComicImages,
  streamComicImage,
  getCoverImage,
  createComic,
  updateComic,
  deleteComic,
  uploadAndCreateComic,
  uploadAndUpdateComic,
} from "../controllers/comicController";

// Configure multer for file uploads with larger limits
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 100, // Max 100 files
  },
});

const router = Router();

router.get("/", getAllComics);
router.get("/:id", getComicById);
router.get("/:id/images", getComicImages);
router.get("/:id/image/:imageIndex/stream", streamComicImage);
router.get("/:id/cover", getCoverImage);
router.post("/", createComic);
router.post("/upload", upload.array("files", 100), uploadAndCreateComic);
router.put("/upload/:id", upload.array("files", 100), uploadAndUpdateComic);
router.put("/:id", updateComic);
router.delete("/:id", deleteComic);

export default router;

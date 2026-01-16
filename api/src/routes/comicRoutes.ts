import { Router } from "express";
import {
  getAllComics,
  getComicById,
  getComicImages,
  streamComicImage,
  getCoverImage,
  createComic,
  updateComic,
  deleteComic,
} from "../controllers/comicController";

const router = Router();

// Get all comics (without pages for list view)
router.get("/", getAllComics);

// Get single comic by ID (includes pages)
router.get("/:id", getComicById);

// Get comic pages data
router.get("/:id/images", getComicImages);

// Stream a single image from stored page URL
router.get("/:id/image/:imageIndex/stream", streamComicImage);

// Get cover image (thumbnail)
router.get("/:id/cover", getCoverImage);

// CRUD operations
router.post("/", createComic);
router.put("/:id", updateComic);
router.delete("/:id", deleteComic);

export default router;

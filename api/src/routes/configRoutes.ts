import { Router, Request, Response } from "express";
import { getStorageInfo } from "../config/storage";

const router = Router();

// Get storage configuration
router.get("/storage", (req: Request, res: Response) => {
  try {
    const info = getStorageInfo();
    res.status(200).json({
      success: true,
      data: info,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get storage config",
    });
  }
});

export default router;

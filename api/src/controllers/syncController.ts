import { Request, Response } from "express";
import SyncService from "../services/mega/SyncService";

const syncService = new SyncService();

// Sync videos from Mega Exhibition folder
export const syncVideosFromMega = async (req: Request, res: Response) => {
  try {
    await syncService.connect();
    const result = await syncService.syncVideos();
    await syncService.disconnect();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
        errors: result.errors,
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        inserted: result.inserted,
        updated: result.updated,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    await syncService.disconnect();
    res.status(500).json({
      success: false,
      message: error.message || "Failed to sync videos from Mega",
    });
  }
};

// Sync comics from Mega Comic folder
export const syncComicsFromMega = async (req: Request, res: Response) => {
  try {
    await syncService.connect();
    const result = await syncService.syncComics();
    await syncService.disconnect();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
        errors: result.errors,
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        inserted: result.inserted,
        updated: result.updated,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    await syncService.disconnect();
    res.status(500).json({
      success: false,
      message: error.message || "Failed to sync comics from Mega",
    });
  }
};

// Sync all (videos + comics)
export const syncAllFromMega = async (req: Request, res: Response) => {
  try {
    await syncService.connect();
    const result = await syncService.syncAll();
    await syncService.disconnect();

    res.status(200).json({
      success: true,
      message: "Full sync completed",
      data: {
        videos: {
          inserted: result.videos.inserted,
          updated: result.videos.updated,
          errors: result.videos.errors,
        },
        comics: {
          inserted: result.comics.inserted,
          updated: result.comics.updated,
          errors: result.comics.errors,
        },
      },
    });
  } catch (error: any) {
    await syncService.disconnect();
    res.status(500).json({
      success: false,
      message: error.message || "Failed to sync from Mega",
    });
  }
};

// Get Mega folder structure (preview without syncing)
export const getMegaFolderStructure = async (req: Request, res: Response) => {
  try {
    await syncService.connect();
    const structure = await syncService.getMegaStructure();
    await syncService.disconnect();

    res.status(200).json({
      success: true,
      data: structure,
    });
  } catch (error: any) {
    await syncService.disconnect();
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get Mega folder structure",
    });
  }
};

import { Request, Response } from "express";
import { Comic } from "../models/index";
import { IComicPage } from "../models/Comic";
import { File } from "megajs";
import path from "path";

// Get all comics
export const getAllComics = async (req: Request, res: Response) => {
  try {
    // Return comics without pages for list view (lighter response)
    const comics = await Comic.find().select("-pages").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: comics,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch comics",
    });
  }
};

// Get single comic by ID (includes pages)
export const getComicById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const comic = await Comic.findById(id);

    if (!comic) {
      return res.status(404).json({
        success: false,
        message: "Comic not found",
      });
    }

    res.status(200).json({
      success: true,
      data: comic,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch comic",
    });
  }
};

// Get comic pages (all pages data from stored pages array)
export const getComicImages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const comic = await Comic.findById(id);

    if (!comic) {
      return res.status(404).json({
        success: false,
        message: "Comic not found",
      });
    }

    // Pages are already stored in the comic document
    const pages = comic.pages || [];

    res.status(200).json({
      success: true,
      data: pages.map((page) => ({
        name: `page_${page.pageNumber}`,
        url: page.image,
        index: page.pageNumber,
      })),
      total: pages.length,
      comicName: comic.name,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch comic images",
    });
  }
};

// Stream a single image from stored page URL
export const streamComicImage = async (req: Request, res: Response) => {
  try {
    const { id, imageIndex } = req.params;
    const index = parseInt(imageIndex || "1", 10);

    const comic = await Comic.findById(id);
    if (!comic) {
      return res.status(404).json({
        success: false,
        message: "Comic not found",
      });
    }

    // Check if pages exist
    if (!comic.pages || comic.pages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comic has no pages",
      });
    }

    // Find the page by pageNumber
    const page = comic.pages.find((p) => p.pageNumber === index);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    try {
      // Load image from Mega URL
      const file = File.fromURL(page.image);
      await file.loadAttributes();

      // Set appropriate headers
      const fileName = file.name || `page_${index}.jpg`;
      const extension = path.extname(fileName).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
      };
      const contentType = mimeTypes[extension] || "image/jpeg";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");

      // Stream the file
      const megaStream = file.download({ stream: true });

      megaStream.on("error", (err: Error & { timeLimit?: string }) => {
        console.error("Mega stream error:", err);
        if (!res.headersSent) {
          if (err.message?.includes("Bandwidth limit") || err.timeLimit) {
            const timeLimit = err.timeLimit || "3600";
            res.setHeader("X-Rate-Limit-Reset", timeLimit);
            res.status(429).json({
              success: false,
              message: "Mega bandwidth limit reached",
              timeLimit: parseInt(timeLimit),
            });
          } else {
            res.sendStatus(500);
          }
        } else {
          res.destroy();
        }
      });

      res.on("close", () => {
        megaStream.destroy();
      });

      megaStream.pipe(res);
    } catch (megaError: any) {
      console.error("Mega error:", megaError);
      res.redirect(`https://picsum.photos/seed/${id}-${index}/800/1200`);
    }
  } catch (error: any) {
    console.error("Stream error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to stream image",
    });
  }
};

// Get cover image (thumbnail - first page)
export const getCoverImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const comic = await Comic.findById(id);
    if (!comic) {
      return res.redirect(`https://picsum.photos/seed/${id}/400/600`);
    }

    // Use stored thumbnail URL
    const thumbnailUrl = comic.thumbnail;

    if (!thumbnailUrl) {
      return res.redirect(`https://picsum.photos/seed/${id}/400/600`);
    }

    try {
      // Load image from Mega URL
      const file = File.fromURL(thumbnailUrl);
      await file.loadAttributes();

      const fileName = file.name || "cover.jpg";
      const extension = path.extname(fileName).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
      };
      const contentType = mimeTypes[extension] || "image/jpeg";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const megaStream = file.download({ stream: true });

      megaStream.on("error", (err: Error & { timeLimit?: string }) => {
        console.error("Cover stream error:", err);
        if (!res.headersSent) {
          if (err.message?.includes("Bandwidth limit") || err.timeLimit) {
            const timeLimit = err.timeLimit || "3600";
            res.setHeader("X-Rate-Limit-Reset", timeLimit);
            res.status(429).json({
              success: false,
              message: "Mega bandwidth limit reached",
              timeLimit: parseInt(timeLimit),
            });
          } else {
            res.redirect(`https://picsum.photos/seed/${id}/400/600`);
          }
        } else {
          res.destroy();
        }
      });

      res.on("close", () => {
        megaStream.destroy();
      });

      megaStream.pipe(res);
    } catch (megaError: any) {
      console.error("Mega error for cover:", megaError);
      res.redirect(`https://picsum.photos/seed/${id}/400/600`);
    }
  } catch (error: any) {
    console.error("Cover error:", error);
    res.redirect(`https://picsum.photos/seed/${req.params.id}/400/600`);
  }
};

// Create new comic
export const createComic = async (req: Request, res: Response) => {
  try {
    const { name, thumbnail, description, pages } = req.body;

    // Validation
    if (!name || !thumbnail) {
      return res.status(400).json({
        success: false,
        message: "Required fields: name, thumbnail",
      });
    }

    const comic = await Comic.create({
      name,
      thumbnail,
      description: description || "",
      pages: pages || [],
    });

    res.status(201).json({
      success: true,
      data: comic,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create comic",
    });
  }
};

// Update comic
export const updateComic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, thumbnail, description, pages } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (description !== undefined) updateData.description = description;
    if (pages !== undefined) updateData.pages = pages;

    const comic = await Comic.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!comic) {
      return res.status(404).json({
        success: false,
        message: "Comic not found",
      });
    }

    res.status(200).json({
      success: true,
      data: comic,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update comic",
    });
  }
};

// Delete comic
export const deleteComic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const comic = await Comic.findByIdAndDelete(id);

    if (!comic) {
      return res.status(404).json({
        success: false,
        message: "Comic not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Comic deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete comic",
    });
  }
};

// Note: Upload functionality removed since sync from Mega handles all data ingestion
// If manual upload is needed, it should be implemented separately

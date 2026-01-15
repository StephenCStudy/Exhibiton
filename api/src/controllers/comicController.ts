import { Request, Response } from "express";
import { Comic } from "../models/index";
import MegaService from "../services/mega/MegaService";
import path from "path";
import fs from "fs";
import { File } from "megajs";

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "mega";
const STORAGE_BASE_URL = process.env.STORAGE_BASE_URL || "https://mega.nz";

// Helper: Clean up temp files/folders
const cleanupTemp = (tempPath: string | null) => {
  if (tempPath && fs.existsSync(tempPath)) {
    const stat = fs.statSync(tempPath);
    if (stat.isDirectory()) {
      fs.rmSync(tempPath, { recursive: true });
    } else {
      fs.unlinkSync(tempPath);
    }
  }
};

// Get all comics
export const getAllComics = async (req: Request, res: Response) => {
  try {
    const comics = await Comic.find().sort({ createdAt: -1 });
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

// Get single comic by ID
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

// Get comic images from Mega folder
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

    // Try to get images from public Mega folder link
    try {
      const megaFolderLink = comic.megaFolderLink;

      // Load folder from public URL
      const folder = File.fromURL(megaFolderLink);
      await folder.loadAttributes();

      // Get all children files
      const children = folder.children || [];

      // Filter only image files and sort by name
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      const imageFiles = children
        .filter((file: any) => {
          const name = file.name?.toLowerCase() || "";
          return (
            !file.directory && imageExtensions.some((ext) => name.endsWith(ext))
          );
        })
        .sort((a: any, b: any) => {
          // Natural sort for file names like page_1, page_2, etc.
          return (a.name || "").localeCompare(b.name || "", undefined, {
            numeric: true,
            sensitivity: "base",
          });
        });

      // Get download URLs for each image
      const imagesWithUrls = await Promise.all(
        imageFiles.map(async (file: any, index: number) => {
          try {
            // Get the link for each file
            const link = await file.link();
            return {
              name: file.name,
              url: link,
              index: index + 1,
            };
          } catch (err) {
            // Fallback to placeholder if can't get link
            console.error(`Error getting link for ${file.name}:`, err);
            return {
              name: file.name,
              url: `https://picsum.photos/seed/${id}-${index}/800/1200`,
              index: index + 1,
            };
          }
        })
      );

      res.status(200).json({
        success: true,
        data: imagesWithUrls,
        total: imagesWithUrls.length,
        comicName: comic.name,
      });
    } catch (megaError: any) {
      console.error("Mega error:", megaError);

      // Fallback to placeholder images if Mega fails
      const placeholderImages = Array.from({ length: 15 }, (_, i) => ({
        name: `page_${i + 1}.jpg`,
        url: `https://picsum.photos/seed/${id}-${i}/800/1200`,
        index: i + 1,
      }));

      res.status(200).json({
        success: true,
        data: placeholderImages,
        total: placeholderImages.length,
        fallback: true,
        message: "Using placeholder images - Mega connection failed",
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch comic images",
    });
  }
};

// Stream a single image from Mega folder
export const streamComicImage = async (req: Request, res: Response) => {
  try {
    const { id, imageIndex } = req.params;
    const index = parseInt(imageIndex || "1", 10) - 1; // Convert to 0-based

    const comic = await Comic.findById(id);
    if (!comic) {
      return res.status(404).json({
        success: false,
        message: "Comic not found",
      });
    }

    try {
      const megaFolderLink = comic.megaFolderLink;

      // Load folder from public URL
      const folder = File.fromURL(megaFolderLink);
      await folder.loadAttributes();

      // Get all children files
      const children = folder.children || [];

      // Filter only image files and sort by name
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      const imageFiles = children
        .filter((file: any) => {
          const name = file.name?.toLowerCase() || "";
          return (
            !file.directory && imageExtensions.some((ext) => name.endsWith(ext))
          );
        })
        .sort((a: any, b: any) => {
          return (a.name || "").localeCompare(b.name || "", undefined, {
            numeric: true,
            sensitivity: "base",
          });
        });

      if (index < 0 || index >= imageFiles.length) {
        return res.status(404).json({
          success: false,
          message: "Image not found",
        });
      }

      const imageFile = imageFiles[index]!;

      // Set appropriate headers
      const extension = path.extname(imageFile.name || "").toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
      };
      const contentType = mimeTypes[extension] || "image/jpeg";

      res.setHeader("Content-Type", contentType);
      // Do NOT set Content-Length to avoid ERR_CONTENT_LENGTH_MISMATCH
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");

      // Stream the file safely
      const megaStream = imageFile.download({ stream: true });

      megaStream.on("error", (err: Error & { timeLimit?: string }) => {
        console.error("Mega stream error:", err);
        if (!res.headersSent) {
          // Check if it's a bandwidth limit error
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
      // Redirect to placeholder on error
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

// Get cover image (first image from Mega folder)
export const getCoverImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const comic = await Comic.findById(id);
    if (!comic) {
      return res.redirect(`https://picsum.photos/seed/${id}/400/600`);
    }

    try {
      const megaFolderLink = comic.megaFolderLink;

      // Load folder from public URL
      const folder = File.fromURL(megaFolderLink);
      await folder.loadAttributes();

      // Get all children files
      const children = folder.children || [];

      // Filter only image files and sort by name
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      const imageFiles = children
        .filter((file: any) => {
          const name = file.name?.toLowerCase() || "";
          return (
            !file.directory && imageExtensions.some((ext) => name.endsWith(ext))
          );
        })
        .sort((a: any, b: any) => {
          return (a.name || "").localeCompare(b.name || "", undefined, {
            numeric: true,
            sensitivity: "base",
          });
        });

      if (imageFiles.length === 0) {
        return res.redirect(`https://picsum.photos/seed/${id}/400/600`);
      }

      const firstImage = imageFiles[0]!;

      // Set appropriate headers
      const extension = path.extname(firstImage.name || "").toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
      };
      const contentType = mimeTypes[extension] || "image/jpeg";

      res.setHeader("Content-Type", contentType);
      // Do NOT set Content-Length to avoid ERR_CONTENT_LENGTH_MISMATCH
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");

      // Stream the file safely
      const megaStream = firstImage.download({ stream: true });

      megaStream.on("error", (err: Error & { timeLimit?: string }) => {
        console.error("Cover stream error:", err);
        if (!res.headersSent) {
          // Check if it's a bandwidth limit error
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
    const { name, coverImage, megaFolderLink } = req.body;

    // Validation
    if (!name || !coverImage || !megaFolderLink) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, coverImage, megaFolderLink",
      });
    }

    const comic = await Comic.create({
      name,
      coverImage,
      megaFolderLink,
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
    const { name, coverImage, megaFolderLink } = req.body;

    const comic = await Comic.findByIdAndUpdate(
      id,
      { name, coverImage, megaFolderLink },
      { new: true, runValidators: true }
    );

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

// Delete comic (only metadata)
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
// Upload comic folder to Mega and create comic
export const uploadAndCreateComic = async (req: Request, res: Response) => {
  let tempFolderPath: string | null = null;
  let megaService: MegaService | null = null;

  try {
    const { name } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];

    // Validation - only need name and files, coverImage will be auto-generated
    if (!name || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Required fields: name, and at least one image file",
      });
    }

    // Sort files by name naturally
    files.sort((a, b) =>
      a.originalname.localeCompare(b.originalname, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

    // Create temporary folder for uploaded files
    const tempDir = path.join(process.cwd(), "temp_uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempFolderPath = path.join(tempDir, `comic_${Date.now()}`);
    fs.mkdirSync(tempFolderPath, { recursive: true });

    // Move uploaded files to temp folder with proper names
    for (const file of files) {
      const destPath = path.join(tempFolderPath, file.originalname);
      fs.renameSync(file.path, destPath);
    }

    // Initialize Mega and upload folder
    megaService = new MegaService();
    await megaService.connect();

    // Create folder on Mega with unique name
    const megaFolderName = `Comic_${name.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_${Date.now()}`;

    console.log(`Creating Mega folder: ${megaFolderName}`);
    await megaService.createFolder(megaFolderName);

    // Wait longer for folder to be ready on Mega servers
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Upload each file to the folder with delays between uploads
    let firstImageLink = "";
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const filePath = path.join(tempFolderPath, file.originalname);

      console.log(
        `Uploading file ${i + 1}/${files.length}: ${file.originalname}`
      );

      try {
        const uploadedNode = await megaService.uploadFileToFolder(
          filePath,
          megaFolderName,
          file.originalname
        );

        // Get the link from the first file as cover image
        if (i === 0 && uploadedNode) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            firstImageLink = await megaService.getPublicLink(uploadedNode);
          } catch (linkErr) {
            console.error("Error getting first image link:", linkErr);
          }
        }

        // Add delay between uploads to prevent rate limiting
        if (i < files.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (uploadErr: any) {
        console.error(`Failed to upload file ${file.originalname}:`, uploadErr);
        // Continue with other files instead of failing completely
      }
    }

    // Get folder link
    const megaFolderLink = await megaService.getFolderLink(megaFolderName);

    if (!megaFolderLink) {
      throw new Error("Failed to get Mega folder link");
    }

    // Use first image as cover, or placeholder if failed
    const coverImage =
      firstImageLink || `https://picsum.photos/seed/${Date.now()}/800/1200`;

    // Create comic record
    const comic = await Comic.create({
      name,
      coverImage,
      megaFolderLink,
    });

    // Cleanup temp folder
    cleanupTemp(tempFolderPath);

    res.status(201).json({
      success: true,
      data: comic,
      message: "Comic uploaded and created successfully",
    });
  } catch (error: any) {
    // Cleanup temp folder on error
    cleanupTemp(tempFolderPath);

    console.error("Upload comic error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload and create comic",
    });
  } finally {
    if (megaService) {
      await megaService.disconnect();
    }
  }
};

// Upload and update comic
export const uploadAndUpdateComic = async (req: Request, res: Response) => {
  let tempFolderPath: string | null = null;
  let megaService: MegaService | null = null;

  try {
    const { id } = req.params;
    const { name } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];

    // Check if comic exists
    const existingComic = await Comic.findById(id);
    if (!existingComic) {
      return res.status(404).json({
        success: false,
        message: "Comic not found",
      });
    }

    // If no files uploaded, just update name
    if (files.length === 0) {
      const comic = await Comic.findByIdAndUpdate(
        id,
        { name: name || existingComic.name },
        { new: true, runValidators: true }
      );

      return res.status(200).json({
        success: true,
        data: comic,
        message: "Comic updated successfully",
      });
    }

    // Sort files by name naturally
    files.sort((a, b) =>
      a.originalname.localeCompare(b.originalname, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

    // Create temporary folder for uploaded files
    const tempDir = path.join(process.cwd(), "temp_uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempFolderPath = path.join(tempDir, `comic_update_${Date.now()}`);
    fs.mkdirSync(tempFolderPath, { recursive: true });

    // Move uploaded files to temp folder
    for (const file of files) {
      const destPath = path.join(tempFolderPath, file.originalname);
      fs.renameSync(file.path, destPath);
    }

    // Initialize Mega and upload new folder
    megaService = new MegaService();
    await megaService.connect();

    const finalName = name || existingComic.name;
    const megaFolderName = `Comic_${finalName.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_${Date.now()}`;

    console.log(`Creating new Mega folder: ${megaFolderName}`);
    await megaService.createFolder(megaFolderName);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Upload each file to the folder
    let firstImageLink = "";
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const filePath = path.join(tempFolderPath, file.originalname);

      console.log(
        `Uploading file ${i + 1}/${files.length}: ${file.originalname}`
      );
      const uploadedNode = await megaService.uploadFileToFolder(
        filePath,
        megaFolderName,
        file.originalname
      );

      if (i === 0 && uploadedNode) {
        try {
          firstImageLink = await megaService.getPublicLink(uploadedNode);
        } catch (linkErr) {
          console.error("Error getting first image link:", linkErr);
        }
      }
    }

    const megaFolderLink = await megaService.getFolderLink(megaFolderName);
    const coverImage = firstImageLink || existingComic.coverImage;

    // Update comic record
    const comic = await Comic.findByIdAndUpdate(
      id,
      {
        name: finalName,
        coverImage,
        megaFolderLink,
      },
      { new: true, runValidators: true }
    );

    cleanupTemp(tempFolderPath);

    res.status(200).json({
      success: true,
      data: comic,
      message: "Comic updated and files re-uploaded successfully",
    });
  } catch (error: any) {
    cleanupTemp(tempFolderPath);

    console.error("Update comic error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update comic",
    });
  } finally {
    if (megaService) {
      await megaService.disconnect();
    }
  }
};

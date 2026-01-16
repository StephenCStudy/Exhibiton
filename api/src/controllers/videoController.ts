import { Request, Response } from "express";
import { Video } from "../models/index";
import MegaService from "../services/mega/MegaService";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { File } from "megajs";

const execAsync = promisify(exec);
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

// Helper: Extract thumbnail from video using ffmpeg (if available)
const extractThumbnail = async (
  videoPath: string,
  outputPath: string
): Promise<boolean> => {
  try {
    // Try to use ffmpeg to extract thumbnail at 1 second mark
    await execAsync(
      `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${outputPath}" -y`
    );
    return fs.existsSync(outputPath);
  } catch (error) {
    console.log("ffmpeg not available, using placeholder thumbnail");
    return false;
  }
};

// Get all videos
export const getAllVideos = async (req: Request, res: Response) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: videos,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch videos",
    });
  }
};

// Get single video by ID
export const getVideoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    res.status(200).json({
      success: true,
      data: video,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch video",
    });
  }
};

// Create new video
export const createVideo = async (req: Request, res: Response) => {
  try {
    const { name, link, thumbnail, duration } = req.body;

    // Validation
    if (!name || !link || !thumbnail) {
      return res.status(400).json({
        success: false,
        message: "Required fields: name, link, thumbnail",
      });
    }

    const video = await Video.create({
      name,
      link,
      thumbnail,
      duration: duration || 0,
    });

    res.status(201).json({
      success: true,
      data: video,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create video",
    });
  }
};

// Update video
export const updateVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, link, thumbnail, duration } = req.body;

    const video = await Video.findByIdAndUpdate(
      id,
      { name, link, thumbnail, duration },
      { new: true, runValidators: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    res.status(200).json({
      success: true,
      data: video,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update video",
    });
  }
};

// Delete video (only metadata)
export const deleteVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const video = await Video.findByIdAndDelete(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete video",
    });
  }
};
// Upload video file to Mega and create video
export const uploadAndCreateVideo = async (req: Request, res: Response) => {
  let tempFilePath: string | null = null;
  let tempThumbnailPath: string | null = null;
  let megaService: MegaService | null = null;

  try {
    const { name } = req.body;
    const file = req.file as Express.Multer.File;

    // Validation - only need name and file, thumbnail will be auto-generated
    if (!name || !file) {
      return res.status(400).json({
        success: false,
        message: "Required fields: name and video file",
      });
    }

    tempFilePath = file.path;
    const fileName = `Video_${name.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_${Date.now()}${path.extname(file.originalname)}`;

    // Try to extract thumbnail from video
    const tempDir = path.join(process.cwd(), "temp_uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    tempThumbnailPath = path.join(tempDir, `thumb_${Date.now()}.jpg`);

    let thumbnailLink = "";
    const thumbnailExtracted = await extractThumbnail(
      tempFilePath,
      tempThumbnailPath
    );

    // Initialize Mega and upload video
    megaService = new MegaService();
    await megaService.connect();

    console.log(`Uploading video: ${fileName}`);
    const uploadedVideoNode = await megaService.uploadFile(
      tempFilePath,
      fileName
    );
    const videoLink = await megaService.getPublicLink(uploadedVideoNode);

    if (!videoLink) {
      throw new Error("Failed to get Mega link for uploaded video");
    }

    // Upload thumbnail if extracted successfully
    if (thumbnailExtracted && fs.existsSync(tempThumbnailPath)) {
      try {
        const thumbFileName = `thumb_${Date.now()}.jpg`;
        const uploadedThumbNode = await megaService.uploadFile(
          tempThumbnailPath,
          thumbFileName
        );
        thumbnailLink = await megaService.getPublicLink(uploadedThumbNode);
      } catch (thumbErr) {
        console.error("Error uploading thumbnail:", thumbErr);
      }
    }

    // Use extracted thumbnail or placeholder
    const thumbnail =
      thumbnailLink || `https://picsum.photos/seed/${Date.now()}/640/360`;

    // Create video record
    const video = await Video.create({
      name,
      link: videoLink,
      thumbnail,
      duration: 0,
    });

    // Cleanup temp files
    cleanupTemp(tempFilePath);
    cleanupTemp(tempThumbnailPath);

    res.status(201).json({
      success: true,
      data: video,
      message: "Video uploaded and created successfully",
    });
  } catch (error: any) {
    // Cleanup temp files on error
    cleanupTemp(tempFilePath);
    cleanupTemp(tempThumbnailPath);

    console.error("Upload video error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload and create video",
    });
  } finally {
    if (megaService) {
      await megaService.disconnect();
    }
  }
};

// Upload and update video
export const uploadAndUpdateVideo = async (req: Request, res: Response) => {
  let tempFilePath: string | null = null;
  let tempThumbnailPath: string | null = null;
  let megaService: MegaService | null = null;

  try {
    const { id } = req.params;
    const { name } = req.body;
    const file = req.file as Express.Multer.File;

    // Check if video exists
    const existingVideo = await Video.findById(id);
    if (!existingVideo) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // If no file uploaded, just update name
    if (!file) {
      const video = await Video.findByIdAndUpdate(
        id,
        { name: name || existingVideo.name },
        { new: true, runValidators: true }
      );

      return res.status(200).json({
        success: true,
        data: video,
        message: "Video updated successfully",
      });
    }

    tempFilePath = file.path;
    const finalName = name || existingVideo.name;
    const fileName = `Video_${finalName.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_${Date.now()}${path.extname(file.originalname)}`;

    // Try to extract thumbnail from video
    const tempDir = path.join(process.cwd(), "temp_uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    tempThumbnailPath = path.join(tempDir, `thumb_${Date.now()}.jpg`);

    let thumbnailLink = "";
    const thumbnailExtracted = await extractThumbnail(
      tempFilePath,
      tempThumbnailPath
    );

    // Initialize Mega and upload video
    megaService = new MegaService();
    await megaService.connect();

    console.log(`Uploading video: ${fileName}`);
    const uploadedVideoNode = await megaService.uploadFile(
      tempFilePath,
      fileName
    );
    const videoLink = await megaService.getPublicLink(uploadedVideoNode);

    // Upload thumbnail if extracted successfully
    if (thumbnailExtracted && fs.existsSync(tempThumbnailPath)) {
      try {
        const thumbFileName = `thumb_${Date.now()}.jpg`;
        const uploadedThumbNode = await megaService.uploadFile(
          tempThumbnailPath,
          thumbFileName
        );
        thumbnailLink = await megaService.getPublicLink(uploadedThumbNode);
      } catch (thumbErr) {
        console.error("Error uploading thumbnail:", thumbErr);
      }
    }

    const thumbnail = thumbnailLink || existingVideo.thumbnail;

    // Update video record
    const video = await Video.findByIdAndUpdate(
      id,
      {
        name: finalName,
        link: videoLink,
        thumbnail,
      },
      { new: true, runValidators: true }
    );

    cleanupTemp(tempFilePath);
    cleanupTemp(tempThumbnailPath);

    res.status(200).json({
      success: true,
      data: video,
      message: "Video updated and re-uploaded successfully",
    });
  } catch (error: any) {
    cleanupTemp(tempFilePath);
    cleanupTemp(tempThumbnailPath);

    console.error("Update video error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update video",
    });
  } finally {
    if (megaService) {
      await megaService.disconnect();
    }
  }
};

// Stream video from Mega link
export const streamVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[STREAM] Requesting video: ${id}`);

    const video = await Video.findById(id);

    if (!video) {
      console.error(`[STREAM] Video not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Support both old and new schema fields
    const videoDoc = video.toObject() as any;
    const megaLink = video.link || videoDoc.megaVideoLink;
    const videoName = video.name || videoDoc.title;
    console.log(
      `[STREAM] Video found: ${videoName}, MegaLink: ${
        megaLink ? "exists" : "MISSING"
      }`
    );

    if (!megaLink) {
      console.error(`[STREAM] No Mega link for video: ${id}`);
      return res.status(400).json({
        success: false,
        message: "No Mega link available for this video",
      });
    }

    // Parse mega link to get file
    let file;
    let fileSize = 0;

    console.log(`[STREAM] Loading Mega file from: ${megaLink}`);
    try {
      file = File.fromURL(megaLink);
      console.log(`[STREAM] File created, loading attributes...`);
      await file.loadAttributes();
      fileSize = file.size || 0;
      console.log(
        `[STREAM] File loaded successfully: ${file.name}, size: ${fileSize} bytes`
      );
    } catch (megaError: any) {
      console.error("[STREAM] Mega file load error:", megaError);
      console.error("[STREAM] Error message:", megaError.message);
      console.error("[STREAM] Error timeLimit:", megaError.timeLimit);

      // Check for bandwidth limit
      if (
        megaError.message?.includes("Bandwidth limit") ||
        megaError.timeLimit
      ) {
        const timeLimit = megaError.timeLimit || "3600";
        console.error(`[STREAM] Bandwidth limit detected: ${timeLimit}s`);
        res.setHeader("X-Rate-Limit-Reset", timeLimit);
        return res.status(429).json({
          success: false,
          message: "Mega bandwidth limit reached",
          timeLimit: parseInt(timeLimit),
        });
      }

      console.error(`[STREAM] Mega load failed, returning 503`);
      return res.status(503).json({
        success: false,
        message: "Unable to load video from Mega. Please try again later.",
      });
    }

    const range = req.headers.range;
    console.log(`[STREAM] Range header: ${range || "none"}`);

    // Set proper content type based on file extension
    const fileName = file.name || "video.mp4";
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mkv": "video/x-matroska",
      ".avi": "video/x-msvideo",
      ".mov": "video/quicktime",
      ".m4v": "video/mp4",
    };
    const contentType = mimeTypes[ext] || "video/mp4";
    console.log(`[STREAM] Content type: ${contentType}, File: ${fileName}`);

    // Test if we can actually download before sending headers
    // This prevents ERR_EMPTY_RESPONSE when bandwidth limit is hit
    try {
      const testStream = file.download({ start: 0, end: 1024, stream: true });
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          testStream.destroy();
          reject(new Error("Test stream timeout"));
        }, 5000);

        testStream.once("data", () => {
          clearTimeout(timeout);
          testStream.destroy();
          resolve();
        });

        testStream.once("error", (err) => {
          clearTimeout(timeout);
          testStream.destroy();
          reject(err);
        });
      });
      console.log(
        `[STREAM] Test download successful, proceeding with stream...`
      );
    } catch (testError: any) {
      console.error("[STREAM] Test download failed:", testError);
      if (
        testError.message?.includes("Bandwidth limit") ||
        testError.timeLimit
      ) {
        const timeLimit = testError.timeLimit || "3600";
        res.setHeader("X-Rate-Limit-Reset", timeLimit);
        return res.status(429).json({
          success: false,
          message: "Mega bandwidth limit reached. Please try again later.",
          timeLimit: parseInt(timeLimit),
        });
      }
      return res.status(503).json({
        success: false,
        message: "Unable to stream video. Please try again later.",
      });
    }

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0] || "0", 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      console.log(`[STREAM] Range request: ${start}-${end}/${fileSize}`);

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        // Do NOT set Content-Length to avoid ERR_CONTENT_LENGTH_MISMATCH
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
      });

      // Stream with range safely
      console.log(`[STREAM] Starting Mega download stream...`);
      const megaStream = file.download({ start, end: end + 1, stream: true });

      megaStream.on("error", (err: Error & { timeLimit?: string }) => {
        console.error("[STREAM-RANGE] Mega stream error:", err);
        if (!res.headersSent) {
          if (err.message?.includes("Bandwidth limit") || err.timeLimit) {
            const timeLimit = err.timeLimit || "3600";
            console.error(`[STREAM-RANGE] Bandwidth limit: ${timeLimit}s`);
            res.setHeader("X-Rate-Limit-Reset", timeLimit);
            res.status(429).json({
              success: false,
              message: "Mega bandwidth limit reached",
              timeLimit: parseInt(timeLimit),
            });
          } else {
            console.error(`[STREAM-RANGE] Unknown error, sending 500`);
            res.sendStatus(500);
          }
        } else {
          console.error(`[STREAM-RANGE] Error after headers sent, destroying`);
          res.destroy();
        }
      });

      res.on("close", () => {
        console.log(`[STREAM-RANGE] Client closed connection`);
        megaStream.destroy();
      });

      megaStream.on("data", () => {
        // Data chunks flowing (comment out for less logging)
      });

      console.log(`[STREAM-RANGE] Piping to response...`);
      megaStream.pipe(res);
    } else {
      // No range, send entire file
      console.log(`[STREAM-FULL] Sending entire file`);
      res.writeHead(200, {
        // Do NOT set Content-Length to avoid ERR_CONTENT_LENGTH_MISMATCH
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
      });

      const megaStream = file.download({ stream: true });

      megaStream.on("error", (err: Error & { timeLimit?: string }) => {
        console.error("[STREAM-FULL] Mega stream error:", err);
        if (!res.headersSent) {
          if (err.message?.includes("Bandwidth limit") || err.timeLimit) {
            const timeLimit = err.timeLimit || "3600";
            console.error(`[STREAM-FULL] Bandwidth limit: ${timeLimit}s`);
            res.setHeader("X-Rate-Limit-Reset", timeLimit);
            res.status(429).json({
              success: false,
              message: "Mega bandwidth limit reached",
              timeLimit: parseInt(timeLimit),
            });
          } else {
            console.error(`[STREAM-FULL] Unknown error, sending 500`);
            res.sendStatus(500);
          }
        } else {
          console.error(`[STREAM-FULL] Error after headers sent, destroying`);
          res.destroy();
        }
      });

      res.on("close", () => {
        console.log(`[STREAM-FULL] Client closed connection`);
        megaStream.destroy();
      });

      console.log(`[STREAM-FULL] Piping to response...`);
      megaStream.pipe(res);
    }
  } catch (error: any) {
    console.error("Stream video error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to stream video",
    });
  }
};

// Get video metadata (size, etc) from Mega
export const getVideoMetadata = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    const megaLink = video.link;
    if (!megaLink) {
      return res.status(400).json({
        success: false,
        message: "No Mega link available",
      });
    }

    // Get file info from Mega
    const file = File.fromURL(megaLink);
    await file.loadAttributes();

    res.status(200).json({
      success: true,
      data: {
        name: file.name,
        size: file.size,
        duration: video.duration,
      },
    });
  } catch (error: any) {
    console.error("Get metadata error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get video metadata",
    });
  }
};

// Extract thumbnail from video at specific timestamp
export const extractVideoThumbnail = async (req: Request, res: Response) => {
  let tempVideoPath: string | null = null;
  let tempThumbnailPath: string | null = null;

  try {
    const { id } = req.params;
    const timestamp = req.query.t || "00:00:01"; // Default to 1 second

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Check if video already has a valid thumbnail (not placeholder)
    if (video.thumbnail && !video.thumbnail.includes("picsum.photos")) {
      return res.redirect(video.thumbnail);
    }

    const videoDoc = video.toObject() as any;
    const megaLink = video.link || videoDoc.megaVideoLink;

    if (!megaLink) {
      return res.status(400).json({
        success: false,
        message: "No Mega link available",
      });
    }

    // Create temp directory
    const tempDir = path.join(process.cwd(), "temp_thumbnails");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempVideoPath = path.join(tempDir, `video_${id}_${Date.now()}.mp4`);
    tempThumbnailPath = path.join(tempDir, `thumb_${id}_${Date.now()}.jpg`);

    // Download first 10MB of video for thumbnail extraction
    console.log(`[THUMBNAIL] Downloading partial video for: ${id}`);
    const file = File.fromURL(megaLink);
    await file.loadAttributes();

    // Download first chunk (enough for ffmpeg to extract a frame)
    const maxBytes = 10 * 1024 * 1024; // 10MB should be enough
    const downloadSize = Math.min(file.size || maxBytes, maxBytes);

    const downloadStream = file.download({ start: 0, end: downloadSize - 1 });
    const writeStream = fs.createWriteStream(tempVideoPath);

    await new Promise<void>((resolve, reject) => {
      downloadStream.on("error", reject);
      writeStream.on("error", reject);
      writeStream.on("finish", resolve);
      downloadStream.pipe(writeStream);
    });

    console.log(
      `[THUMBNAIL] Downloaded ${downloadSize} bytes, extracting frame...`
    );

    // Extract thumbnail using ffmpeg
    try {
      await execAsync(
        `ffmpeg -i "${tempVideoPath}" -ss ${timestamp} -vframes 1 -vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2" -q:v 2 "${tempThumbnailPath}" -y`,
        { timeout: 30000 }
      );
    } catch (ffmpegError: any) {
      console.error("[THUMBNAIL] ffmpeg error:", ffmpegError.message);
      // Fallback: try without scaling
      await execAsync(
        `ffmpeg -i "${tempVideoPath}" -ss ${timestamp} -vframes 1 -q:v 2 "${tempThumbnailPath}" -y`,
        { timeout: 30000 }
      );
    }

    if (!fs.existsSync(tempThumbnailPath)) {
      throw new Error("Failed to extract thumbnail");
    }

    console.log(`[THUMBNAIL] Thumbnail extracted successfully`);

    // Send thumbnail
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours

    const thumbnailStream = fs.createReadStream(tempThumbnailPath);
    thumbnailStream.pipe(res);

    // Clean up after sending
    thumbnailStream.on("close", () => {
      cleanupTemp(tempVideoPath);
      cleanupTemp(tempThumbnailPath);
    });
  } catch (error: any) {
    console.error("[THUMBNAIL] Error:", error);
    cleanupTemp(tempVideoPath);
    cleanupTemp(tempThumbnailPath);

    // Return placeholder on error
    res.redirect(`https://picsum.photos/seed/${req.params.id}/640/360`);
  }
};

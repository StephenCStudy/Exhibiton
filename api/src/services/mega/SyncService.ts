import dotenv from "dotenv";
import { Storage } from "megajs";
import Video, { IVideo } from "../../models/Video";
import Comic, { IComic, IComicPage } from "../../models/Comic";

dotenv.config();

// Helper: delay function
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: retry with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 2000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRetryable =
        error.message?.includes("EAGAIN") ||
        error.message?.includes("temporary") ||
        error.message?.includes("congestion") ||
        error.message?.includes("rate");

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      const waitTime = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(
        `⚠️  Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(
          waitTime
        )}ms...`
      );
      await delay(waitTime);
    }
  }

  throw lastError;
};

// Helper: Check if file is a video
const isVideoFile = (filename: string): boolean => {
  const videoExtensions = [
    ".mp4",
    ".mkv",
    ".avi",
    ".mov",
    ".wmv",
    ".webm",
    ".flv",
  ];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
  return videoExtensions.includes(ext);
};

// Helper: Check if file is an image
const isImageFile = (filename: string): boolean => {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
  return imageExtensions.includes(ext);
};

// Helper: Natural sort for filenames (e.g., img1, img2, img10)
const naturalSort = (a: string, b: string): number => {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
};

// Helper: Remove file extension
const removeExtension = (filename: string): string => {
  return filename.replace(/\.[^/.]+$/, "");
};

interface SyncResult {
  success: boolean;
  message: string;
  inserted: number;
  updated: number;
  errors: string[];
}

export class SyncService {
  private storage: Storage | null = null;

  async connect(): Promise<void> {
    const email = process.env.MEGA_EMAIL;
    const password = process.env.MEGA_PASSWORD;

    if (!email || !password) {
      throw new Error(
        "Missing MEGA_EMAIL or MEGA_PASSWORD in environment variables"
      );
    }

    try {
      console.log("🔌 Connecting to Mega...");
      const storage = new Storage({ email, password, keepalive: false });
      this.storage = await storage.ready;
      console.log("✅ Connected to Mega successfully");
    } catch (error: any) {
      console.error("❌ Mega connection error:", error);
      throw new Error(`Failed to connect to Mega: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.storage) {
      try {
        (this.storage as any).close?.();
        this.storage = null;
        console.log("🔌 Disconnected from Mega");
      } catch (error) {
        console.error("Error disconnecting from Mega:", error);
      }
    }
  }

  private ensureConnected(): void {
    if (!this.storage) {
      throw new Error("SyncService not connected. Call connect() first.");
    }
  }

  // Get public link for a Mega node
  private async getPublicLink(node: any): Promise<string | null> {
    return retryWithBackoff(async () => {
      try {
        const link = await node.link();
        return String(link);
      } catch (error: any) {
        console.error(`Failed to get link for ${node.name}:`, error.message);
        return null;
      }
    });
  }

  // ========================================
  // SYNC VIDEOS
  // ========================================
  async syncVideos(): Promise<SyncResult> {
    this.ensureConnected();

    const result: SyncResult = {
      success: true,
      message: "",
      inserted: 0,
      updated: 0,
      errors: [],
    };

    try {
      console.log("\n📹 Starting video sync...");

      // Find Exhibition folder (videos)
      const videoFolder = (this.storage as Storage).root.children?.find(
        (f: any) => f.name === "Exhibition" && f.directory
      );

      if (!videoFolder) {
        result.success = false;
        result.message = "Exhibition folder not found in Mega root";
        console.log("❌ Exhibition folder not found");
        return result;
      }

      const children = videoFolder.children || [];
      const videoFiles = children.filter(
        (item: any) => !item.directory && isVideoFile(item.name)
      );

      console.log(
        `📂 Found ${videoFiles.length} video files in Exhibition folder`
      );

      let processedCount = 0;

      for (const item of videoFiles) {
        try {
          // Add delay to avoid rate limiting
          if (processedCount > 0) {
            await delay(1500);
          }

          const name = removeExtension(item.name);
          console.log(`\n🎬 Processing video: ${name}`);

          // Get public link
          const link = await this.getPublicLink(item);
          if (!link) {
            result.errors.push(`Failed to get link for video: ${name}`);
            continue;
          }

          // Generate placeholder thumbnail (will be updated later with actual frame)
          const thumbnailPlaceholder = `https://picsum.photos/seed/${encodeURIComponent(
            name
          )}/640/360`;

          // Check if video exists (match by name)
          const existingVideo = await Video.findOne({ name });

          if (existingVideo) {
            // Update existing video
            existingVideo.link = link;
            // Only update thumbnail if it was empty
            if (!existingVideo.thumbnail) {
              existingVideo.thumbnail = thumbnailPlaceholder;
            }
            await existingVideo.save();
            result.updated++;
            console.log(`   ✏️  Updated: ${name}`);
          } else {
            // Insert new video
            await Video.create({
              name,
              link,
              thumbnail: thumbnailPlaceholder,
              duration: 0, // Can be updated later with actual duration
            });
            result.inserted++;
            console.log(`   ✅ Inserted: ${name}`);
          }

          processedCount++;
        } catch (err: any) {
          const errorMsg = `Error processing video ${item.name}: ${err.message}`;
          result.errors.push(errorMsg);
          console.error(`   ❌ ${errorMsg}`);
        }
      }

      result.message = `Video sync completed: ${result.inserted} inserted, ${result.updated} updated`;
      console.log(`\n📹 ${result.message}`);

      if (result.errors.length > 0) {
        console.log(`⚠️  ${result.errors.length} errors occurred`);
      }

      return result;
    } catch (error: any) {
      result.success = false;
      result.message = `Video sync failed: ${error.message}`;
      console.error(`❌ ${result.message}`);
      return result;
    }
  }

  // ========================================
  // SYNC COMICS
  // ========================================
  async syncComics(): Promise<SyncResult> {
    this.ensureConnected();

    const result: SyncResult = {
      success: true,
      message: "",
      inserted: 0,
      updated: 0,
      errors: [],
    };

    try {
      console.log("\n📚 Starting comic sync...");

      // Find Comic folder
      const comicFolder = (this.storage as Storage).root.children?.find(
        (f: any) => f.name === "Comic" && f.directory
      );

      if (!comicFolder) {
        result.success = false;
        result.message = "Comic folder not found in Mega root";
        console.log("❌ Comic folder not found");
        return result;
      }

      const children = comicFolder.children || [];
      const comicFolders = children.filter((item: any) => item.directory);

      console.log(`📂 Found ${comicFolders.length} comic folders`);

      let processedCount = 0;

      for (const folder of comicFolders) {
        try {
          // Add delay to avoid rate limiting
          if (processedCount > 0) {
            await delay(2000);
          }

          const name = folder.name;
          console.log(`\n📖 Processing comic: ${name}`);

          // Get images from the folder
          const folderChildren = folder.children || [];
          const imageFiles = folderChildren
            .filter((item: any) => !item.directory && isImageFile(item.name))
            .sort((a: any, b: any) => naturalSort(a.name, b.name));

          if (imageFiles.length === 0) {
            result.errors.push(`No images found in comic folder: ${name}`);
            console.log(`   ⚠️  No images found, skipping`);
            continue;
          }

          console.log(`   📷 Found ${imageFiles.length} images`);

          // First image is the thumbnail
          const thumbnailFile = imageFiles[0];
          const thumbnailLink = await this.getPublicLink(thumbnailFile);

          if (!thumbnailLink) {
            result.errors.push(
              `Failed to get thumbnail link for comic: ${name}`
            );
            continue;
          }

          // Remaining images are pages (or all images if we want thumbnail to also be page 1)
          const pages: IComicPage[] = [];
          let pageNumber = 1;

          for (const imageFile of imageFiles) {
            try {
              await delay(500); // Small delay between each image

              const imageLink = await this.getPublicLink(imageFile);
              if (imageLink) {
                pages.push({
                  pageNumber,
                  image: imageLink,
                });
                pageNumber++;
              }
            } catch (err: any) {
              console.error(`   ⚠️  Failed to get link for ${imageFile.name}`);
            }
          }

          console.log(`   📄 Processed ${pages.length} pages`);

          // Check if comic exists (match by name)
          const existingComic = await Comic.findOne({ name });

          if (existingComic) {
            // Update existing comic
            existingComic.thumbnail = thumbnailLink;
            existingComic.pages = pages;
            await existingComic.save();
            result.updated++;
            console.log(`   ✏️  Updated: ${name} (${pages.length} pages)`);
          } else {
            // Insert new comic
            await Comic.create({
              name,
              thumbnail: thumbnailLink,
              description: "",
              pages,
            });
            result.inserted++;
            console.log(`   ✅ Inserted: ${name} (${pages.length} pages)`);
          }

          processedCount++;
        } catch (err: any) {
          const errorMsg = `Error processing comic ${folder.name}: ${err.message}`;
          result.errors.push(errorMsg);
          console.error(`   ❌ ${errorMsg}`);
        }
      }

      result.message = `Comic sync completed: ${result.inserted} inserted, ${result.updated} updated`;
      console.log(`\n📚 ${result.message}`);

      if (result.errors.length > 0) {
        console.log(`⚠️  ${result.errors.length} errors occurred`);
      }

      return result;
    } catch (error: any) {
      result.success = false;
      result.message = `Comic sync failed: ${error.message}`;
      console.error(`❌ ${result.message}`);
      return result;
    }
  }

  // ========================================
  // SYNC ALL
  // ========================================
  async syncAll(): Promise<{ videos: SyncResult; comics: SyncResult }> {
    console.log("═".repeat(50));
    console.log("🚀 Starting full Mega → MongoDB sync");
    console.log("═".repeat(50));

    const videoResult = await this.syncVideos();
    const comicResult = await this.syncComics();

    console.log("\n" + "═".repeat(50));
    console.log("📊 SYNC SUMMARY");
    console.log("═".repeat(50));
    console.log(
      `📹 Videos: ${videoResult.inserted} inserted, ${videoResult.updated} updated`
    );
    console.log(
      `📚 Comics: ${comicResult.inserted} inserted, ${comicResult.updated} updated`
    );

    const totalErrors = videoResult.errors.length + comicResult.errors.length;
    if (totalErrors > 0) {
      console.log(`⚠️  Total errors: ${totalErrors}`);
    }

    console.log("═".repeat(50));

    return { videos: videoResult, comics: comicResult };
  }

  // ========================================
  // GET MEGA STRUCTURE (Preview)
  // ========================================
  async getMegaStructure(): Promise<any> {
    this.ensureConnected();

    const root = (this.storage as Storage).root;
    const structure: any = {
      rootFolders: [],
      videoFolder: null,
      comicFolder: null,
    };

    // Get root folders
    structure.rootFolders =
      root.children?.map((f: any) => ({
        name: f.name,
        isFolder: f.directory,
        childCount: f.children?.length || 0,
      })) || [];

    // Get Exhibition (videos) info
    const videoFolder = root.children?.find(
      (f: any) => f.name === "Exhibition" && f.directory
    );

    if (videoFolder) {
      const videoFiles = (videoFolder.children || []).filter(
        (c: any) => !c.directory && isVideoFile(c.name)
      );
      structure.videoFolder = {
        name: videoFolder.name,
        totalFiles: videoFolder.children?.length || 0,
        videoFiles: videoFiles.length,
        videos: videoFiles.map((v: any) => v.name).slice(0, 10),
      };
    }

    // Get Comic folder info
    const comicFolder = root.children?.find(
      (f: any) => f.name === "Comic" && f.directory
    );

    if (comicFolder) {
      const comicFolders = (comicFolder.children || []).filter(
        (c: any) => c.directory
      );
      structure.comicFolder = {
        name: comicFolder.name,
        totalFolders: comicFolders.length,
        folders: comicFolders.map((f: any) => ({
          name: f.name,
          imageCount: (f.children || []).filter((c: any) => isImageFile(c.name))
            .length,
        })),
      };
    }

    return structure;
  }
}

export default SyncService;

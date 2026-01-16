import dotenv from "dotenv";
import mongoose from "mongoose";
import { Storage } from "megajs";
import Video from "../models/Video";
import Comic, { IComicPage } from "../models/Comic";

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

// Get public link for a Mega node
const getPublicLink = async (node: any): Promise<string | null> => {
  return retryWithBackoff(async () => {
    try {
      const link = await node.link();
      return String(link);
    } catch (error: any) {
      console.error(
        `   ⚠️ Failed to get link for ${node.name}:`,
        error.message
      );
      return null;
    }
  });
};

interface SeedStats {
  videosInserted: number;
  comicsInserted: number;
  videoErrors: string[];
  comicErrors: string[];
}

async function seedDatabase() {
  let storage: Storage | null = null;
  const stats: SeedStats = {
    videosInserted: 0,
    comicsInserted: 0,
    videoErrors: [],
    comicErrors: [],
  };

  try {
    console.log("═".repeat(60));
    console.log("🚀 MEGA → MONGODB FULL SEED");
    console.log("═".repeat(60));

    // ===== 1. Connect to MongoDB =====
    const uri = process.env.MONGO_URI as string;
    if (!uri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    console.log("\n📦 Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");

    // ===== 2. Connect to Mega =====
    const megaEmail = process.env.MEGA_EMAIL;
    const megaPassword = process.env.MEGA_PASSWORD;

    if (!megaEmail || !megaPassword) {
      throw new Error("Missing MEGA_EMAIL or MEGA_PASSWORD in environment");
    }

    console.log("\n🔌 Connecting to Mega...");
    storage = new Storage({
      email: megaEmail,
      password: megaPassword,
      keepalive: false,
    });
    await storage.ready;
    console.log("✅ Mega connected");

    // ===== 3. Clear existing data =====
    console.log("\n🗑️  Clearing existing data...");
    const deletedVideos = await Video.deleteMany({});
    const deletedComics = await Comic.deleteMany({});
    console.log(`   - Deleted ${deletedVideos.deletedCount} videos`);
    console.log(`   - Deleted ${deletedComics.deletedCount} comics`);

    // ===== 4. List Mega root structure =====
    console.log("\n📂 Scanning Mega root...");
    const rootChildren = storage.root.children || [];
    const folders = rootChildren.filter((item: any) => item.directory);
    console.log(`   Found ${folders.length} folders in root:`);
    folders.forEach((f: any) => console.log(`   - ${f.name}`));

    // ===== 5. Sync Videos from Exhibition folder =====
    console.log("\n" + "─".repeat(60));
    console.log("📹 SYNCING VIDEOS FROM MEGA");
    console.log("─".repeat(60));

    const videoFolder = rootChildren.find(
      (f: any) => f.name === "Exhibition" && f.directory
    );

    if (videoFolder) {
      const videoChildren = videoFolder.children || [];
      const videoFiles = videoChildren.filter(
        (item: any) => !item.directory && isVideoFile(item.name)
      );

      console.log(
        `\n📂 Found ${videoFiles.length} video files in Exhibition folder\n`
      );

      let videoCount = 0;
      for (const item of videoFiles) {
        try {
          // Add delay to avoid rate limiting
          if (videoCount > 0) {
            await delay(1500);
          }

          const itemName = item.name || `video_${videoCount}`;
          const name = removeExtension(itemName);
          console.log(`[${videoCount + 1}/${videoFiles.length}] 🎬 ${name}`);

          // Get public link for video
          const link = await getPublicLink(item);
          if (!link) {
            stats.videoErrors.push(`Failed to get link for: ${name}`);
            console.log(`   ❌ Failed to get link`);
            continue;
          }

          // Insert video into database
          // Thumbnail will use the backend thumbnail extraction endpoint
          const video = await Video.create({
            name,
            link,
            thumbnail: "", // Empty - will be generated dynamically by /videos/:id/thumbnail endpoint
            duration: 0,
          });

          console.log(`   ✅ Inserted (ID: ${video._id})`);
          console.log(`   📎 Link: ${link.substring(0, 60)}...`);
          stats.videosInserted++;
          videoCount++;
        } catch (err: any) {
          const errorMsg = `Error processing ${item.name}: ${err.message}`;
          stats.videoErrors.push(errorMsg);
          console.log(`   ❌ ${errorMsg}`);
        }
      }
    } else {
      console.log("⚠️  Exhibition folder not found in Mega root");
      console.log("   Make sure you have an 'Exhibition' folder for videos");
    }

    // ===== 6. Sync Comics from Comic folder =====
    console.log("\n" + "─".repeat(60));
    console.log("📚 SYNCING COMICS FROM MEGA");
    console.log("─".repeat(60));

    const comicFolder = rootChildren.find(
      (f: any) => f.name === "Comic" && f.directory
    );

    if (comicFolder) {
      const comicChildren = comicFolder.children || [];
      const comicFolders = comicChildren.filter((item: any) => item.directory);

      console.log(`\n📂 Found ${comicFolders.length} comic folders\n`);

      let comicCount = 0;
      for (const folder of comicFolders) {
        try {
          // Add delay to avoid rate limiting
          if (comicCount > 0) {
            await delay(2000);
          }

          const name = folder.name || `comic_${comicCount}`;
          console.log(`[${comicCount + 1}/${comicFolders.length}] 📖 ${name}`);

          // Get images from the folder
          const folderChildren = folder.children || [];
          const imageFiles = folderChildren
            .filter(
              (item: any) =>
                !item.directory && item.name && isImageFile(item.name)
            )
            .sort((a: any, b: any) => naturalSort(a.name || "", b.name || ""));

          if (imageFiles.length === 0) {
            stats.comicErrors.push(`No images found in folder: ${name}`);
            console.log(`   ⚠️  No images found, skipping`);
            continue;
          }

          console.log(`   📷 Found ${imageFiles.length} images`);

          // Get thumbnail from first image
          const thumbnailFile = imageFiles[0];
          const thumbnailLink = await getPublicLink(thumbnailFile);

          if (!thumbnailLink) {
            stats.comicErrors.push(`Failed to get thumbnail for: ${name}`);
            console.log(`   ❌ Failed to get thumbnail link`);
            continue;
          }

          // Process all images as pages
          const pages: IComicPage[] = [];
          let pageNumber = 1;

          console.log(`   ⏳ Processing pages...`);
          for (const imageFile of imageFiles) {
            try {
              await delay(500); // Small delay between each image

              const imageLink = await getPublicLink(imageFile);
              if (imageLink) {
                pages.push({
                  pageNumber,
                  image: imageLink,
                });
                pageNumber++;
              }
            } catch (err: any) {
              console.log(`   ⚠️  Failed to get link for ${imageFile.name}`);
            }
          }

          console.log(`   📄 Processed ${pages.length} pages`);

          // Insert comic into database
          const comic = await Comic.create({
            name,
            thumbnail: thumbnailLink,
            description: "",
            pages,
            pageCount: pages.length,
          });

          console.log(`   ✅ Inserted (ID: ${comic._id})`);
          stats.comicsInserted++;
          comicCount++;
        } catch (err: any) {
          const errorMsg = `Error processing ${folder.name}: ${err.message}`;
          stats.comicErrors.push(errorMsg);
          console.log(`   ❌ ${errorMsg}`);
        }
      }
    } else {
      console.log("⚠️  Comic folder not found in Mega root");
      console.log(
        "   Make sure you have a 'Comic' folder with subfolders for each comic"
      );
    }

    // ===== 7. Display Summary =====
    console.log("\n" + "═".repeat(60));
    console.log("📊 SEED SUMMARY");
    console.log("═".repeat(60));
    console.log(`\n✅ Videos inserted: ${stats.videosInserted}`);
    console.log(`✅ Comics inserted: ${stats.comicsInserted}`);

    if (stats.videoErrors.length > 0) {
      console.log(`\n⚠️  Video errors (${stats.videoErrors.length}):`);
      stats.videoErrors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }

    if (stats.comicErrors.length > 0) {
      console.log(`\n⚠️  Comic errors (${stats.comicErrors.length}):`);
      stats.comicErrors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }

    // ===== 8. Display sample data =====
    console.log("\n" + "─".repeat(60));
    console.log("🎥 Sample Videos:");
    const sampleVideos = await Video.find().limit(5);
    sampleVideos.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.name}`);
      console.log(`      ID: ${v._id}`);
      console.log(`      Link: ${v.link?.substring(0, 50)}...`);
    });

    if (stats.videosInserted > 5) {
      console.log(`   ... and ${stats.videosInserted - 5} more videos`);
    }

    console.log("\n" + "─".repeat(60));
    console.log("📚 Sample Comics:");
    const sampleComics = await Comic.find().limit(5);
    sampleComics.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.name}`);
      console.log(`      ID: ${c._id}`);
      console.log(`      Pages: ${c.pages?.length || 0}`);
      console.log(`      Thumbnail: ${c.thumbnail?.substring(0, 50)}...`);
    });

    if (stats.comicsInserted > 5) {
      console.log(`   ... and ${stats.comicsInserted - 5} more comics`);
    }

    console.log("\n" + "═".repeat(60));
    console.log("✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!");
    console.log("═".repeat(60) + "\n");

    // ===== Cleanup =====
    if (storage) {
      try {
        (storage as any).close?.();
      } catch {}
    }
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB and Mega");
    process.exit(0);
  } catch (error: any) {
    console.error("\n" + "═".repeat(60));
    console.error("❌ SEED FAILED");
    console.error("═".repeat(60));
    console.error(`Error: ${error.message}`);

    if (storage) {
      try {
        (storage as any).close?.();
      } catch {}
    }

    try {
      await mongoose.disconnect();
    } catch {}

    process.exit(1);
  }
}

// Run the seed function
seedDatabase();

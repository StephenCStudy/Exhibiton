#!/usr/bin/env node
/**
 * CLI Script: Sync Mega → MongoDB
 *
 * Usage:
 *   npx ts-node src/scripts/sync-mega.ts           # Sync all
 *   npx ts-node src/scripts/sync-mega.ts videos    # Sync videos only
 *   npx ts-node src/scripts/sync-mega.ts comics    # Sync comics only
 *   npx ts-node src/scripts/sync-mega.ts structure # Preview Mega structure
 *
 * Can be run via cronjob (every 6 hours):
 *   0 0,6,12,18 * * * cd /path/to/api && npx ts-node src/scripts/sync-mega.ts
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import SyncService from "../services/mega/SyncService";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/exbi";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "all";

  console.log("\n" + "═".repeat(60));
  console.log("🔄 MEGA → MONGODB SYNC TOOL");
  console.log("═".repeat(60));
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`📋 Command: ${command}`);
  console.log("═".repeat(60) + "\n");

  // Connect to MongoDB
  console.log("📦 Connecting to MongoDB...");
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected\n");
  } catch (error: any) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }

  // Initialize SyncService
  const syncService = new SyncService();

  try {
    // Connect to Mega
    await syncService.connect();

    switch (command) {
      case "videos":
        console.log("🎬 Syncing videos only...\n");
        const videoResult = await syncService.syncVideos();
        printResult("Videos", videoResult);
        break;

      case "comics":
        console.log("📚 Syncing comics only...\n");
        const comicResult = await syncService.syncComics();
        printResult("Comics", comicResult);
        break;

      case "structure":
        console.log("📂 Fetching Mega structure...\n");
        const structure = await syncService.getMegaStructure();
        console.log(JSON.stringify(structure, null, 2));
        break;

      case "all":
      default:
        console.log("🚀 Full sync (videos + comics)...\n");
        const fullResult = await syncService.syncAll();
        printResult("Videos", fullResult.videos);
        printResult("Comics", fullResult.comics);
        break;
    }
  } catch (error: any) {
    console.error("\n❌ Sync failed:", error.message);
    process.exit(1);
  } finally {
    // Cleanup
    await syncService.disconnect();
    await mongoose.disconnect();
    console.log("\n📦 MongoDB disconnected");
  }

  console.log("\n" + "═".repeat(60));
  console.log(`✅ Completed at: ${new Date().toISOString()}`);
  console.log("═".repeat(60) + "\n");
}

function printResult(
  type: string,
  result: {
    success: boolean;
    message: string;
    inserted: number;
    updated: number;
    errors: string[];
  }
) {
  console.log(`\n📊 ${type} Result:`);
  console.log(`   Status: ${result.success ? "✅ Success" : "❌ Failed"}`);
  console.log(`   Message: ${result.message}`);
  console.log(`   Inserted: ${result.inserted}`);
  console.log(`   Updated: ${result.updated}`);

  if (result.errors.length > 0) {
    console.log(`   Errors (${result.errors.length}):`);
    result.errors.slice(0, 5).forEach((err, i) => {
      console.log(`      ${i + 1}. ${err}`);
    });
    if (result.errors.length > 5) {
      console.log(`      ... and ${result.errors.length - 5} more`);
    }
  }
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

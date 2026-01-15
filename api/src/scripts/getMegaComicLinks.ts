import dotenv from "dotenv";
import fs from "fs";
import { Storage } from "megajs";

dotenv.config();

// Helper function to delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to get link with retry
async function getLinkWithRetry(
  folder: any,
  maxRetries = 8,
  delayMs = 5000
): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const link = await folder.link();
      return link;
    } catch (err: any) {
      if (
        (err.message?.includes("EAGAIN") ||
          err.code === "UND_ERR_CONNECT_TIMEOUT") &&
        i < maxRetries - 1
      ) {
        console.log(
          `   ⏳ Retry ${i + 1}/${maxRetries} for ${folder.name}... waiting ${
            (delayMs * (i + 1)) / 1000
          }s`
        );
        await delay(delayMs * (i + 1)); // Exponential backoff
      } else if (i === maxRetries - 1) {
        console.error(
          `   ❌ Failed after ${maxRetries} retries: ${folder.name}`
        );
        return null;
      }
    }
  }
  return null;
}

async function getMegaComicLinks() {
  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;

  if (!email || !password) {
    console.error("Missing MEGA_EMAIL or MEGA_PASSWORD in .env");
    process.exit(1);
  }

  console.log("🔗 Connecting to Mega...");

  try {
    const storage = await new Storage({
      email,
      password,
      keepalive: false,
    }).ready;

    console.log("✓ Connected to Mega\n");

    // Find Comic folder
    const comicFolder = storage.root.children?.find(
      (item: any) => item.name === "Comic" && item.directory
    );

    if (!comicFolder) {
      console.error("❌ Folder 'Comic' not found!");
      console.log("\n📁 Available folders in root:");
      storage.root.children?.forEach((f: any) => {
        console.log(`   - ${f.name} (${f.directory ? "folder" : "file"})`);
      });
      process.exit(1);
    }

    console.log(`📂 Found Comic folder`);
    console.log(
      `📊 Subfolders count: ${(comicFolder as any).children?.length || 0}\n`
    );

    const comics: {
      name: string;
      coverImage: string;
      megaFolderLink: string;
    }[] = [];

    // Get links for all comic subfolders
    const children = (comicFolder as any).children;
    if (children && children.length > 0) {
      console.log("🔄 Getting comic folder links...\n");

      let index = 0;
      for (const folder of children) {
        if (!(folder as any).directory) {
          console.log(`⏭️  Skipping file: ${(folder as any).name}`);
          continue;
        }

        try {
          // Add delay between requests to avoid rate limiting
          if (index > 0) {
            console.log(`   ⏸️  Waiting 3s before next request...`);
            await delay(3000);
          }

          const link = await getLinkWithRetry(folder);
          if (!link) {
            continue;
          }

          index++;

          comics.push({
            name: (folder as any).name,
            coverImage: `https://picsum.photos/seed/comic${index}/400/600`,
            megaFolderLink: link,
          });
          console.log(`📚 [${index}] ${(folder as any).name}`);
        } catch (err) {
          console.error(
            `❌ Error getting link for ${(folder as any).name}:`,
            err
          );
        }
      }
    }

    console.log(`\n✅ Total comics: ${comics.length}`);

    // Write to JSON file - save even if partial results
    if (comics.length > 0) {
      fs.writeFileSync("comics.json", JSON.stringify(comics, null, 2), "utf-8");
      console.log("\n📄 Saved to comics.json");

      // Also output as TypeScript array for seed.ts
      console.log("\n" + "=".repeat(60));
      console.log("📋 TYPESCRIPT ARRAY FOR seed.ts:");
      console.log("=".repeat(60) + "\n");

      console.log("const sampleComics = [");
      comics.forEach((comic, idx) => {
        console.log(`  {`);
        console.log(`    name: "${comic.name}",`);
        console.log(`    coverImage: "${comic.coverImage}",`);
        console.log(`    megaFolderLink:`);
        console.log(`      "${comic.megaFolderLink}",`);
        console.log(`  }${idx < comics.length - 1 ? "," : ""}`);
      });
      console.log("];");
    } else {
      console.log(
        "\n⚠️  No comics fetched due to Mega rate limiting. Try again later."
      );
    }

    // Close connection
    storage.close();
    console.log("\n✓ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

getMegaComicLinks();

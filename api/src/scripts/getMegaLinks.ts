import dotenv from "dotenv";
import { Storage } from "megajs";

dotenv.config();

async function getMegaLinks() {
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

    // Find Exhibition folder
    const folder = storage.root.children?.find(
      (f: any) => f.name === "Exhibition"
    );

    if (!folder) {
      console.error("❌ Folder 'Exhibition' not found!");
      console.log("\n📁 Available folders in root:");
      storage.root.children?.forEach((f: any) => {
        console.log(`   - ${f.name} (${f.directory ? "folder" : "file"})`);
      });
      process.exit(1);
    }

    console.log(`📂 Found folder: ${folder.name}`);
    console.log(`📊 Files count: ${folder.children?.length || 0}\n`);

    const videos: {
      title: string;
      thumbnail: string;
      megaVideoLink: string;
    }[] = [];
    const comics: {
      name: string;
      coverImage: string;
      megaFolderLink: string;
    }[] = [];

    // Get links for all files/subfolders
    if (folder.children && folder.children.length > 0) {
      console.log("🔄 Getting links...\n");

      for (const item of folder.children) {
        try {
          const link = await (item as any).link();

          if ((item as any).directory) {
            // It's a folder - treat as comic
            comics.push({
              name: (item as any).name,
              coverImage: `https://picsum.photos/seed/${Date.now()}/400/600`,
              megaFolderLink: link,
            });
            console.log(`📁 [Folder] ${(item as any).name}`);
          } else {
            // It's a file - treat as video
            const fileName = (item as any).name;
            const titleWithoutExt = fileName.replace(/\.[^/.]+$/, ""); // Remove extension

            videos.push({
              title: titleWithoutExt,
              thumbnail: `https://picsum.photos/seed/${Date.now()}/640/360`,
              megaVideoLink: link,
            });
            console.log(`🎬 [Video] ${titleWithoutExt}`);
          }

          // Small delay to prevent rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (err) {
          console.error(
            `❌ Error getting link for ${(item as any).name}:`,
            err
          );
        }
      }
    }

    // Output results
    console.log("\n" + "=".repeat(60));
    console.log("📋 RESULTS - Copy to seed.ts");
    console.log("=".repeat(60));

    if (videos.length > 0) {
      console.log("\n// === VIDEOS ===");
      console.log(
        "const sampleVideos = " + JSON.stringify(videos, null, 2) + ";"
      );
    }

    if (comics.length > 0) {
      console.log("\n// === COMICS ===");
      console.log(
        "const sampleComics = " + JSON.stringify(comics, null, 2) + ";"
      );
    }

    console.log("\n✅ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

getMegaLinks();

import dotenv from "dotenv";
import { Storage } from "megajs";

dotenv.config();

async function listComicFolders() {
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

    // List root folders
    console.log("📁 Root folders:");
    storage.root.children?.forEach((f: any) => {
      console.log(`   - ${f.name} (${f.directory ? "folder" : "file"})`);
    });

    // Find Comic folder
    const comicFolder = storage.root.children?.find(
      (item: any) => item.name === "Comic" && item.directory
    );

    if (!comicFolder) {
      console.error("\n❌ Comic folder not found!");
      storage.close();
      process.exit(1);
    }

    console.log(
      `\n📂 Comic folder content (${
        (comicFolder as any).children?.length || 0
      } items):`
    );

    (comicFolder as any).children?.forEach((item: any, index: number) => {
      if (item.directory) {
        console.log(
          `   ${index + 1}. 📁 ${item.name} (${
            item.children?.length || 0
          } files)`
        );
      } else {
        console.log(`   ${index + 1}. 📄 ${item.name}`);
      }
    });

    storage.close();
    console.log("\n✓ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

listComicFolders();

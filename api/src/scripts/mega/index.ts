import dotenv from "dotenv";
import path from "node:path";
import { MegaService } from "../../services/mega/MegaService";

dotenv.config();

async function main() {
  const mega = new MegaService();
  await mega.connect();
  console.log("Connected to MEGA ✔");

  const list = await mega.listRoot();
  console.log("Root items:", list);

  const demoFilePath = process.env.MEGA_DEMO_FILE
    ? path.resolve(process.env.MEGA_DEMO_FILE)
    : path.resolve(__dirname, "demo.txt");

  if (!process.env.MEGA_DEMO_FILE) {
    // Create a small demo file if none provided
    const fs = await import("node:fs");
    if (!fs.existsSync(demoFilePath)) {
      fs.writeFileSync(demoFilePath, "Hello from MegaService demo!\n");
    }
  }

  console.log("Uploading:", demoFilePath);
  const uploaded = await mega.uploadFile(demoFilePath);
  console.log("Uploaded node:", { name: uploaded.name, size: uploaded.size });

  const link = await mega.getPublicLink(uploaded);
  console.log("Public link:", link);
}

main().catch((err) => {
  console.error("Mega example error:", err);
  process.exit(1);
});

import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import type { ReadStream } from "node:fs";
import { Storage, File } from "megajs";

dotenv.config();

export type MegaListItem = {
  name: string;
  size: number | null;
  type: "file" | "folder";
};

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
        error.message?.includes("congestion");

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      const waitTime = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(
          waitTime
        )}ms...`
      );
      await delay(waitTime);
    }
  }

  throw lastError;
};

export class MegaService {
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
      const storage = new Storage({ email, password, keepalive: false });
      this.storage = await storage.ready;
      console.log("Connected to Mega successfully");
    } catch (error: any) {
      console.error("Mega connection error:", error);
      throw new Error(`Failed to connect to Mega: ${error.message}`);
    }
  }

  private ensureConnected() {
    if (!this.storage) {
      throw new Error("MegaService not connected. Call connect() first.");
    }
  }

  async listRoot(): Promise<MegaListItem[]> {
    this.ensureConnected();
    const root = (this.storage as Storage).root;

    const children: any[] = Array.isArray(root.children) ? root.children : [];

    return children.map((node: any) => ({
      name: node.name,
      size: node.directory ? null : Number(node.size ?? 0),
      type: node.directory ? "folder" : "file",
    }));
  }

  async listFolder(folderName: string): Promise<MegaListItem[]> {
    this.ensureConnected();
    const folder = await this.resolvePath(folderName);

    if (!folder) {
      return [];
    }

    const children: any[] = Array.isArray(folder.children)
      ? folder.children
      : [];

    return children.map((node: any) => ({
      name: node.name,
      size: node.directory ? null : Number(node.size ?? 0),
      type: node.directory ? "folder" : "file",
    }));
  }

  async createFolder(folderName: string): Promise<any> {
    this.ensureConnected();

    return retryWithBackoff(async () => {
      try {
        const root = (this.storage as Storage).root;
        const folder = await root.mkdir(folderName);
        await delay(1000); // Small delay after folder creation
        return folder;
      } catch (error: any) {
        console.error("Error creating folder:", error);
        throw new Error(`Failed to create folder: ${error.message}`);
      }
    });
  }

  async uploadFile(
    localPath: string,
    remoteName?: string,
    targetFolder?: any
  ): Promise<any> {
    this.ensureConnected();

    const resolved = path.resolve(localPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Local file not found: ${resolved}`);
    }

    const name = remoteName || path.basename(resolved);
    const fileSize = fs.statSync(resolved).size;
    const buffer = fs.readFileSync(resolved);

    return retryWithBackoff(
      async () => {
        try {
          const uploadTarget = targetFolder || (this.storage as Storage).root;

          // Use buffer upload instead of stream for better compatibility
          const uploadResult = uploadTarget.upload(
            {
              name,
              size: fileSize,
            },
            buffer
          );

          const fileNode = await uploadResult.complete;
          console.log(`Uploaded file: ${name} (${fileSize} bytes)`);

          // Add delay after each upload to prevent rate limiting
          await delay(1500);

          return fileNode;
        } catch (error: any) {
          console.error("Upload error:", error);
          throw new Error(`Failed to upload file ${name}: ${error.message}`);
        }
      },
      5,
      3000
    ); // More retries with longer base delay for uploads
  }

  async uploadFileToFolder(
    localPath: string,
    folderName: string,
    remoteName?: string
  ): Promise<any> {
    this.ensureConnected();

    // Find or create the folder
    let folder = await this.resolvePath(folderName);
    if (!folder) {
      folder = await this.createFolder(folderName);
      // Wait longer for folder to be ready
      await delay(3000);
      folder = await this.resolvePath(folderName);

      if (!folder) {
        throw new Error(`Failed to find folder after creation: ${folderName}`);
      }
    }

    return this.uploadFile(localPath, remoteName, folder);
  }

  async getPublicLink(file: any): Promise<string> {
    this.ensureConnected();

    return retryWithBackoff(async () => {
      // If file is a path string like "folder/sub/file.ext"
      if (typeof file === "string") {
        const node = await this.resolvePath(file);
        if (!node) throw new Error(`File not found at path: ${file}`);
        const link = await node.link();
        return String(link);
      }

      // If file is a node with link function
      if (file && typeof file.link === "function") {
        const link = await file.link();
        return String(link);
      }

      throw new Error("Unsupported argument for getPublicLink(file)");
    });
  }

  async getFolderLink(folderName: string): Promise<string> {
    this.ensureConnected();

    return retryWithBackoff(async () => {
      const folder = await this.resolvePath(folderName);
      if (!folder) {
        throw new Error(`Folder not found: ${folderName}`);
      }

      const link = await folder.link();
      return String(link);
    });
  }

  private async resolvePath(p: string): Promise<any | null> {
    this.ensureConnected();
    const parts = p.split("/").filter(Boolean);
    let current = (this.storage as Storage).root;

    for (const part of parts) {
      // Refresh children
      const children: any[] = Array.isArray(current.children)
        ? current.children
        : [];
      const next = children.find((n: any) => n.name === part);
      if (!next) return null;
      current = next;
    }
    return current;
  }

  async disconnect(): Promise<void> {
    if (this.storage) {
      try {
        // megajs doesn't have explicit disconnect, just clear reference
        this.storage = null;
      } catch (error) {
        console.error("Error disconnecting from Mega:", error);
      }
    }
  }
}

export default MegaService;

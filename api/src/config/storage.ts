import dotenv from "dotenv";

dotenv.config();

export const storageConfig = {
  provider: process.env.STORAGE_PROVIDER || "mega",
  baseUrl: process.env.STORAGE_BASE_URL || "https://mega.nz",
};

/**
 * Get full storage URL by combining base URL with path
 * @param path - The storage path or ID
 * @returns Full URL to the storage item
 */
export function getStorageUrl(path: string): string {
  // If path is already a full URL, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Otherwise, combine with base URL
  const baseUrl = storageConfig.baseUrl.endsWith("/")
    ? storageConfig.baseUrl.slice(0, -1)
    : storageConfig.baseUrl;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

/**
 * Extract storage path from full URL
 * @param url - Full storage URL
 * @returns Storage path or ID
 */
export function extractStoragePath(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch {
    return url;
  }
}

/**
 * Get storage provider info
 */
export function getStorageInfo() {
  return {
    provider: storageConfig.provider,
    baseUrl: storageConfig.baseUrl,
    supportedProviders: ["mega", "gdrive", "dropbox", "custom"],
  };
}

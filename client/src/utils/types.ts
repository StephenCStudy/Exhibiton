// Comic page interface
export interface ComicPage {
  pageNumber: number;
  image: string; // Mega file URL
}

export interface Comic {
  _id: string;
  name: string;
  thumbnail?: string; // Cover image URL (new schema)
  coverImage?: string; // Cover image URL (legacy schema)
  description?: string;
  megaFolderLink?: string; // Legacy field
  pages?: ComicPage[]; // Array of pages (may not be included in list view)
  pageCount?: number; // Total number of pages
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  _id: string;
  name?: string; // New schema
  title?: string; // Legacy schema
  link?: string; // Mega video URL (new schema)
  megaVideoLink?: string; // Legacy schema
  thumbnail?: string; // Thumbnail URL
  duration?: number; // Duration in seconds
  createdAt: string;
  updatedAt: string;
}

// Helper function to get video display name
export const getVideoName = (video: Video): string => {
  return video.name || video.title || "Untitled";
};

// Helper function to get video link
export const getVideoLink = (video: Video): string => {
  return video.link || video.megaVideoLink || "";
};

// Helper function to get comic thumbnail
export const getComicThumbnail = (comic: Comic): string => {
  return comic.thumbnail || comic.coverImage || "";
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Sync API response types
export interface MegaStructureResponse {
  rootFolders: { name: string; isFolder: boolean; childCount: number }[];
  videoFolder: { name: string; fileCount: number } | null;
  comicFolder: {
    name: string;
    folderCount: number;
    folders: string[];
  } | null;
}

export interface SyncResult {
  total: number;
  synced: number;
  skipped: number;
  message?: string;
}

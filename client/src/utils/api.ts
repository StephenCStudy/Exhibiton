const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Storage configuration
export const STORAGE_PROVIDER = import.meta.env.VITE_STORAGE_PROVIDER || "mega";
export const STORAGE_BASE_URL =
  import.meta.env.VITE_STORAGE_BASE_URL || "https://mega.nz";

// Import types
import type {
  Comic,
  Video,
  ApiResponse,
  MegaStructureResponse,
  SyncResult,
} from "./types";

// Type-safe fetch wrapper
async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        success: false,
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return error as ApiResponse<T>;
    }

    return await response.json();
  } catch (error) {
    console.error("API fetch error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

// Comic API functions
export const comicApi = {
  getAll: async (): Promise<ApiResponse<Comic[]>> => {
    return apiFetch<Comic[]>(`${API_BASE_URL}/comics`);
  },

  getById: async (id: string): Promise<ApiResponse<Comic>> => {
    return apiFetch<Comic>(`${API_BASE_URL}/comics/${id}`);
  },

  getImages: async (id: string): Promise<ApiResponse<string[]>> => {
    return apiFetch<string[]>(`${API_BASE_URL}/comics/${id}/images`);
  },

  create: async (data: {
    name: string;
    thumbnail: string;
    description?: string;
    pages?: { pageNumber: number; image: string }[];
  }): Promise<ApiResponse<Comic>> => {
    return apiFetch<Comic>(`${API_BASE_URL}/comics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: {
      name?: string;
      thumbnail?: string;
      description?: string;
      pages?: { pageNumber: number; image: string }[];
    }
  ): Promise<ApiResponse<Comic>> => {
    return apiFetch<Comic>(`${API_BASE_URL}/comics/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiFetch<void>(`${API_BASE_URL}/comics/${id}`, {
      method: "DELETE",
    });
  },
};

// Video API functions
export const videoApi = {
  getAll: async (): Promise<ApiResponse<Video[]>> => {
    return apiFetch<Video[]>(`${API_BASE_URL}/videos`);
  },

  getById: async (id: string): Promise<ApiResponse<Video>> => {
    return apiFetch<Video>(`${API_BASE_URL}/videos/${id}`);
  },

  create: async (data: {
    name: string;
    link: string;
    thumbnail: string;
    duration?: number;
  }): Promise<ApiResponse<Video>> => {
    return apiFetch<Video>(`${API_BASE_URL}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: {
      name?: string;
      link?: string;
      thumbnail?: string;
      duration?: number;
    }
  ): Promise<ApiResponse<Video>> => {
    return apiFetch<Video>(`${API_BASE_URL}/videos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiFetch<void>(`${API_BASE_URL}/videos/${id}`, {
      method: "DELETE",
    });
  },
};

// Sync API functions (Mega integration)
export const syncApi = {
  // Get Mega folder structure preview
  getMegaStructure: async (): Promise<ApiResponse<MegaStructureResponse>> => {
    return apiFetch<MegaStructureResponse>(
      `${API_BASE_URL}/sync/mega/structure`
    );
  },

  // Sync videos from Mega
  syncVideos: async (): Promise<ApiResponse<SyncResult>> => {
    return apiFetch<SyncResult>(`${API_BASE_URL}/sync/mega/videos`, {
      method: "POST",
    });
  },

  // Sync comics from Mega
  syncComics: async (): Promise<ApiResponse<SyncResult>> => {
    return apiFetch<SyncResult>(`${API_BASE_URL}/sync/mega/comics`, {
      method: "POST",
    });
  },
};

// Config API functions
export const configApi = {
  getStorageConfig: async (): Promise<
    ApiResponse<{
      provider: string;
      baseUrl: string;
    }>
  > => {
    return apiFetch<{ provider: string; baseUrl: string }>(
      `${API_BASE_URL}/config/storage`
    );
  },
};

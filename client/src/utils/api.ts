const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Storage configuration
export const STORAGE_PROVIDER = import.meta.env.VITE_STORAGE_PROVIDER || "mega";
export const STORAGE_BASE_URL =
  import.meta.env.VITE_STORAGE_BASE_URL || "https://mega.nz";

// Comic API functions
export const comicApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/comics`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/comics/${id}`);
    return response.json();
  },

  getImages: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/comics/${id}/images`);
    return response.json();
  },

  create: async (data: {
    name: string;
    thumbnail: string;
    description?: string;
    pages?: { pageNumber: number; image: string }[];
  }) => {
    const response = await fetch(`${API_BASE_URL}/comics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  update: async (
    id: string,
    data: {
      name?: string;
      thumbnail?: string;
      description?: string;
      pages?: { pageNumber: number; image: string }[];
    }
  ) => {
    const response = await fetch(`${API_BASE_URL}/comics/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/comics/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// Video API functions
export const videoApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/videos`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/videos/${id}`);
    return response.json();
  },

  create: async (data: {
    name: string;
    link: string;
    thumbnail: string;
    duration?: number;
  }) => {
    const response = await fetch(`${API_BASE_URL}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  update: async (
    id: string,
    data: {
      name?: string;
      link?: string;
      thumbnail?: string;
      duration?: number;
    }
  ) => {
    const response = await fetch(`${API_BASE_URL}/videos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/videos/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// Sync API functions (Mega integration)
export const syncApi = {
  // Get Mega folder structure preview
  getMegaStructure: async () => {
    const response = await fetch(`${API_BASE_URL}/sync/mega/structure`);
    return response.json();
  },

  // Sync videos from Mega
  syncVideos: async () => {
    const response = await fetch(`${API_BASE_URL}/sync/mega/videos`, {
      method: "POST",
    });
    return response.json();
  },

  // Sync comics from Mega
  syncComics: async () => {
    const response = await fetch(`${API_BASE_URL}/sync/mega/comics`, {
      method: "POST",
    });
    return response.json();
  },
};

// Config API functions
export const configApi = {
  getStorageConfig: async () => {
    const response = await fetch(`${API_BASE_URL}/config/storage`);
    return response.json();
  },
};

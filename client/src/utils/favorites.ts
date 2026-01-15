// Favorites management using sessionStorage (cleared when tab closes)

const FAVORITES_KEY = "exbi_favorites";

export interface Favorites {
  comics: string[]; // Array of comic IDs
  videos: string[]; // Array of video IDs
}

const getDefaultFavorites = (): Favorites => ({
  comics: [],
  videos: [],
});

export const getFavorites = (): Favorites => {
  try {
    const stored = sessionStorage.getItem(FAVORITES_KEY);
    if (!stored) return getDefaultFavorites();
    return JSON.parse(stored);
  } catch {
    return getDefaultFavorites();
  }
};

export const saveFavorites = (favorites: Favorites): void => {
  sessionStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

// Video favorites
export const isVideoFavorite = (videoId: string): boolean => {
  const favorites = getFavorites();
  return favorites.videos.includes(videoId);
};

export const addVideoToFavorites = (videoId: string): void => {
  const favorites = getFavorites();
  if (!favorites.videos.includes(videoId)) {
    favorites.videos.push(videoId);
    saveFavorites(favorites);
  }
};

export const removeVideoFromFavorites = (videoId: string): void => {
  const favorites = getFavorites();
  favorites.videos = favorites.videos.filter((id) => id !== videoId);
  saveFavorites(favorites);
};

export const toggleVideoFavorite = (videoId: string): boolean => {
  const isFavorite = isVideoFavorite(videoId);
  if (isFavorite) {
    removeVideoFromFavorites(videoId);
    return false;
  } else {
    addVideoToFavorites(videoId);
    return true;
  }
};

// Comic favorites
export const isComicFavorite = (comicId: string): boolean => {
  const favorites = getFavorites();
  return favorites.comics.includes(comicId);
};

export const addComicToFavorites = (comicId: string): void => {
  const favorites = getFavorites();
  if (!favorites.comics.includes(comicId)) {
    favorites.comics.push(comicId);
    saveFavorites(favorites);
  }
};

export const removeComicFromFavorites = (comicId: string): void => {
  const favorites = getFavorites();
  favorites.comics = favorites.comics.filter((id) => id !== comicId);
  saveFavorites(favorites);
};

export const toggleComicFavorite = (comicId: string): boolean => {
  const isFavorite = isComicFavorite(comicId);
  if (isFavorite) {
    removeComicFromFavorites(comicId);
    return false;
  } else {
    addComicToFavorites(comicId);
    return true;
  }
};

// Get counts
export const getFavoritesCounts = (): { comics: number; videos: number } => {
  const favorites = getFavorites();
  return {
    comics: favorites.comics.length,
    videos: favorites.videos.length,
  };
};

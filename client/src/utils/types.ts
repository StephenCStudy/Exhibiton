export interface Comic {
  _id: string;
  name: string;
  coverImage: string;
  megaFolderLink: string;
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  _id: string;
  title: string;
  thumbnail: string;
  megaVideoLink: string;
  duration?: number; // Duration in seconds
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

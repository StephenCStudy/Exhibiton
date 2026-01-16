import mongoose, { Document, Schema } from "mongoose";

// Interface for comic page
export interface IComicPage {
  pageNumber: number;
  image: string; // Mega file URL
}

export interface IComic extends Document {
  name: string; // Folder name / comic name
  thumbnail?: string; // First image as cover
  coverImage?: string; // Legacy field
  description?: string;
  megaFolderLink?: string; // Legacy field
  pages?: IComicPage[]; // Array of pages in order
  pageCount?: number; // Total number of pages
  createdAt: Date;
  updatedAt: Date;
}

const comicPageSchema = new Schema<IComicPage>(
  {
    pageNumber: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const comicSchema = new Schema<IComic>(
  {
    name: {
      type: String,
      required: [true, "Comic name is required"],
      trim: true,
      unique: true,
    },
    // New schema field
    thumbnail: {
      type: String,
      trim: true,
    },
    // Legacy schema field
    coverImage: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // Legacy schema field
    megaFolderLink: {
      type: String,
      trim: true,
    },
    pages: {
      type: [comicPageSchema],
      default: [],
    },
    pageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for searching by name
comicSchema.index({ name: 1 });

const Comic = mongoose.model<IComic>("Comic", comicSchema);

export default Comic;

import mongoose, { Document, Schema } from "mongoose";

export interface IComic extends Document {
  name: string;
  coverImage: string;
  megaFolderLink: string;
  createdAt: Date;
  updatedAt: Date;
}

const comicSchema = new Schema<IComic>(
  {
    name: {
      type: String,
      required: [true, "Comic name is required"],
      trim: true,
    },
    coverImage: {
      type: String,
      default: "", // Cover is loaded dynamically from Mega folder's first image
      trim: true,
    },
    megaFolderLink: {
      type: String,
      required: [true, "Mega folder link is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Comic = mongoose.model<IComic>("Comic", comicSchema);

export default Comic;

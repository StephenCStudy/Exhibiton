import mongoose, { Document, Schema } from "mongoose";

export interface IVideo extends Document {
  name?: string;
  title?: string; // Legacy field
  link?: string; // Mega public URL
  megaVideoLink?: string; // Legacy field
  thumbnail?: string; // CDN URL for thumbnail
  duration?: number; // Duration in seconds
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<IVideo>(
  {
    // New schema fields
    name: {
      type: String,
      trim: true,
    },
    link: {
      type: String,
      trim: true,
    },
    // Legacy schema fields (for backward compatibility)
    title: {
      type: String,
      trim: true,
    },
    megaVideoLink: {
      type: String,
      trim: true,
    },
    thumbnail: {
      type: String,
      trim: true,
      default: "",
    },
    duration: {
      type: Number,
      default: 0, // Duration in seconds
    },
  },
  {
    timestamps: true,
  }
);

// Index for sorting by creation date
videoSchema.index({ createdAt: -1 });

const Video = mongoose.model<IVideo>("Video", videoSchema);

export default Video;

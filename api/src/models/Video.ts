import mongoose, { Document, Schema } from "mongoose";

export interface IVideo extends Document {
  title: string;
  thumbnail: string;
  megaVideoLink: string;
  duration?: number; // Duration in seconds
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<IVideo>(
  {
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
    },
    thumbnail: {
      type: String,
      default: "", // Thumbnail is loaded dynamically from video's first frame
      trim: true,
    },
    megaVideoLink: {
      type: String,
      required: [true, "Mega video link is required"],
      trim: true,
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

const Video = mongoose.model<IVideo>("Video", videoSchema);

export default Video;

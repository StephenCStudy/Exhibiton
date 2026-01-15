import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export default async function connectDB() {
  try {
    const uri = process.env.MONGO_URI as string;
    if (!uri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      connectTimeoutMS: 10000,
    });
    console.log("MongoDB connected successfully ✓");
  } catch (error) {
    console.error("MongoDB connection failed:", (error as any).message);
    throw error;
  }
}

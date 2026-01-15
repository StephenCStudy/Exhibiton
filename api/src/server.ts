import dotenv from "dotenv";
import connectDB from "./config/db";
import app from "../app";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Start server immediately to satisfy Render's port detection
const server = app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`✓ Server running on port ${PORT}`);
});

server.on("error", (err: any) => {
  console.error("Server error:", err);
  process.exit(1);
});

// Connect to database asynchronously
(async () => {
  try {
    await connectDB();
    console.log("Database connected successfully");
  } catch (error) {
    console.error(
      "Database connection failed, running in offline mode:",
      (error as Error).message
    );
    console.warn("⚠️ Server will start without database connection");
  }
})();

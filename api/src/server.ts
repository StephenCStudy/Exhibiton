import dotenv from "dotenv";
import connectDB from "./config/db";
import app from "../app";

dotenv.config();

const PORT = process.env.PORT || 5000;

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

  app.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
  });
})();

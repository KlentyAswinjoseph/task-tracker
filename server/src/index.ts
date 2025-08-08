import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Import routes
import dashboardRouter from "./routes/dashboard";
import usersRouter from "./routes/users";
import tasksRouter from "./routes/tasks";
import syncRouter from "./routes/sync";
// import build from "../../client"

// Import middleware
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(express.static("public"));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/dashboard", dashboardRouter);
app.use("/api/users", usersRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/sync", syncRouter);

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Task Tracker API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    port: PORT
  });
});

// 404 handler
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Error handling middleware
app.use(errorHandler);

// MongoDB connection
const connectDB = async (): Promise<void> => {
  try {
    const mongoUri =
      "mongodb+srv://55S2xNkw1GxdKvRX:usk4Srzi9LIf3X21@test-v7.kl-infra.com/sq2_ajr?retryWrites=true&w=majority";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    console.log(
      "⚠️  Continuing without MongoDB - API will work but data persistence is disabled"
    );
    // Don't exit the process, just log the error
  }
};

// Start server
const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Task Tracker API Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(
        `📈 Dashboard API: http://localhost:${PORT}/api/dashboard/summary`
      );
      console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
      console.log(`📋 Tasks API: http://localhost:${PORT}/api/tasks`);
      console.log("\n📱 Frontend should connect to: http://localhost:3000");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT. Graceful shutdown...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM. Graceful shutdown...");
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

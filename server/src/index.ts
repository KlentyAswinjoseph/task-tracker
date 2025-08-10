import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";

// Import routes
import dashboardRouter from "./routes/dashboard";
import usersRouter from "./routes/users";
import tasksRouter from "./routes/tasks";
import syncRouter from "./routes/sync";
import squadsRouter from "./routes/squads";
// import build from "../../client"

// Import middleware
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve client build as static assets
// Resolve the client build path robustly for both dev (ts-node) and prod (compiled JS)
const clientBuildCandidates: string[] = [
  // When process is started from repo root
  path.resolve(process.cwd(), "client/build"),
  // When process is started from server folder
  path.resolve(process.cwd(), "../client/build"),
  // When using __dirname from compiled path: /server/dist/server/src
  path.resolve(__dirname, "../../../../client/build"),
  // When using __dirname from ts-node: /server/src
  path.resolve(__dirname, "../..", "client", "build"),
];

const clientBuildPath = clientBuildCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "index.html"))
);

if (clientBuildPath) {
  app.use(express.static(clientBuildPath));
  console.log(`🧱 Serving static assets from: ${clientBuildPath}`);
} else {
  console.warn(
    "⚠️  client/build not found. SPA assets will not be served. Ensure you ran 'npm run build' at repo root."
  );
}

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
app.use("/api/squads", squadsRouter);

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Task Tracker API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    port: PORT,
  });
});

// 404 handler for API routes only
app.use("/api/*", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

app.get("*", (req: Request, res: Response) => {
  if (!clientBuildPath) {
    return res.status(404).send("Frontend build not found. Please build the client.");
  }

  const indexHtmlPath = path.join(clientBuildPath, "index.html");
  if (!fs.existsSync(indexHtmlPath)) {
    return res.status(404).send("index.html not found in client build.");
  }

  return res.sendFile(indexHtmlPath); // <-- return here too
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
      console.log(`👥 Squads API: http://localhost:${PORT}/api/squads`);
      console.log(
        `
📱 Frontend served from: http://localhost:${PORT}
        `
      );
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

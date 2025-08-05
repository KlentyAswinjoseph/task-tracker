import express from "express";
import cors from "cors";
import { TaskAnalyzer } from "./src/task-analyzer.js";
import { DatabaseConnector } from "./src/database-connector.js";
import { TaskSummarizer } from "./src/task-summarizer.js";

const app = express();
const PORT = process.env.CHATBOT_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize components
const dbConnector = new DatabaseConnector();
const taskAnalyzer = new TaskAnalyzer(dbConnector);
const taskSummarizer = new TaskSummarizer();

const extractTaskFromSentence = (text) => {
  const pattern = /([A-Z]{2,}\d*-\d+)/i;
  const match = text.match(pattern);
  return match ? match[1].toUpperCase() : null;
};

// Health check endpoint
app.get("/api/chat/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: dbConnector.getConnectionStatus(),
      taskAnalyzer: "initialized",
    },
  });
});

// Task details endpoint
app.get("/api/task/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskDetails = await taskAnalyzer.getTaskDetails(taskId);
    res.json(taskDetails);
  } catch (error) {
    console.error("Error fetching task details:", error);
    res.status(500).json({
      error: "Failed to fetch task details",
      message: error.message,
    });
  }
});

// Task analytics endpoint
app.get("/api/task/:taskId/analytics", async (req, res) => {
  try {
    const { taskId } = req.params;
    const analytics = await taskAnalyzer.getTaskAnalytics(taskId);
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching task analytics:", error);
    res.status(500).json({
      error: "Failed to fetch task analytics",
      message: error.message,
    });
  }
});

// Task summary endpoint
app.get("/api/task/:taskId/summary", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { type = "combined_summary" } = req.query;

    const taskDetails = await taskAnalyzer.getTaskDetails(taskId);
    const analytics = await taskAnalyzer.getTaskAnalytics(taskId);

    const summary = taskSummarizer.summarize(
      taskDetails,
      analytics,
      taskId,
      type
    );

    res.json({
      taskId,
      summaryType: type,
      ...summary,
    });
  } catch (error) {
    console.error("Error fetching task summary:", error);
    res.status(500).json({
      error: "Failed to fetch task summary",
      message: error.message,
    });
  }
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId, summaryType = "combined_summary" } = req.body;

    // Simple message parsing for demonstration
    const taskIdMatch = extractTaskFromSentence(message);

    if (taskIdMatch) {
      const taskId = taskIdMatch;
      const taskDetails = await taskAnalyzer.getTaskDetails(taskId);
      const analytics = await taskAnalyzer.getTaskAnalytics(taskId);

      // Generate custom summary with task ID in message
      const summary = taskSummarizer.summarize(
        taskDetails,
        analytics,
        taskId,
        summaryType
      );

      res.json({
        message: summary.message,
        // data: summary.data,
        data: {
          taskDetails,
          analytics,
        },
        type: "task_report",
        type: summary.type,
        taskId: taskId,
      });
    } else {
      res.json({
        message:
          "I can help you with task information. Try asking about a specific task ID like 'GS-10262' or 'SQ2-1196'. You can also specify summary types: 'task_report', 'analytics_summary', 'combined_summary', 'progress_summary', or 'quality_summary'.",
        type: "help",
        availableSummaries: [
          "task_report",
          "analytics_summary",
          "combined_summary",
          "progress_summary",
          "quality_summary",
        ],
      });
    }
  } catch (error) {
    console.error("Error processing chat request:", error);
    res.status(500).json({
      error: "Failed to process message",
      message: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Git Tracker MCP Chatbot running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/chat/health`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`📋 Task details: http://localhost:${PORT}/api/task/:taskId`);
  console.log(
    `📈 Task analytics: http://localhost:${PORT}/api/task/:taskId/analytics`
  );
  console.log(
    `📝 Task summary: http://localhost:${PORT}/api/task/:taskId/summary?type=combined_summary`
  );
  console.log("\nExample usage:");
  console.log(
    `curl -X POST http://localhost:${PORT}/api/chat -H "Content-Type: application/json" -d '{"message": "Bring me the details for task ID GS-10262", "summaryType": "combined_summary"}'`
  );
  console.log(
    `curl "http://localhost:${PORT}/api/task/GS-10262/summary?type=progress_summary"`
  );
});

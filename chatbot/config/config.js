import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  server: {
    port: process.env.CHATBOT_PORT || 3002,
    host: process.env.CHATBOT_HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development'
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || process.env.MONGO_URI;,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  // MCP Server Configuration
  mcp: {
    name: "git-tracker-mcp-server",
    version: "1.0.0",
    description: "MCP Server for Git Tracker with task analytics and reporting",
    tools: {
      get_task_details: {
        description: "Get detailed information about a specific task",
        parameters: {
          taskId: {
            type: "string",
            description: "The task ID to get details for (e.g., GS-10262)"
          }
        }
      },
      get_task_analytics: {
        description: "Get analytics and performance metrics for a task",
        parameters: {
          taskId: {
            type: "string",
            description: "The task ID to get analytics for"
          }
        }
      },
      get_user_tasks: {
        description: "Get all tasks assigned to a specific user",
        parameters: {
          userId: {
            type: "string",
            description: "The user ID to get tasks for"
          },
          limit: {
            type: "number",
            description: "Maximum number of tasks to return (default: 10)"
          }
        }
      },
      get_repository_tasks: {
        description: "Get all tasks in a specific repository",
        parameters: {
          repository: {
            type: "string",
            description: "The repository name to get tasks for"
          },
          limit: {
            type: "number",
            description: "Maximum number of tasks to return (default: 10)"
          }
        }
      },
      get_task_timeline: {
        description: "Get timeline of events for a specific task",
        parameters: {
          taskId: {
            type: "string",
            description: "The task ID to get timeline for"
          }
        }
      },
      get_task_metrics: {
        description: "Get detailed metrics breakdown for a task",
        parameters: {
          taskId: {
            type: "string",
            description: "The task ID to get metrics for"
          }
        }
      }
    }
  },

  // Task ID Patterns
  taskPatterns: [
    /^([A-Z]+\d*-\d+)[-_](.+)$/i, // SQ2-1196-description
    /^([A-Z]+[-_]\d+)[-_](.+)$/i, // SQ-123-description
    /^([A-Z]+\d+)[-_](.+)$/i, // SQ123-description
    /^([A-Z]{2,}\d+)[-_](.+)$/i, // TASK123-description
    /^([A-Z]+[-_]\d+[-_]\d+)[-_](.+)$/i, // SQ-2-123-description
  ],

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs/chatbot.log'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }
};

export default config; 
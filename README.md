# Git Tracker

A comprehensive dashboard application that tracks Git branches, user productivity, and branch lifecycle metrics, now with integrated MCP (Model Context Protocol) chatbot for task analytics.

## 🚀 Quick Start

**Single command to run everything:**

```bash
npm run run
```

This starts both the Git Tracker (port 3001) and the AI Chatbot (port 3002).

**Access the interfaces:**
- Main Dashboard: http://localhost:3001
- AI Chatbot: http://localhost:3001/chatbot.html

**Test the chatbot:**
```bash
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Bring me the details for task ID GS-10262"}'
```

---

## Features

### Core Git Tracker
- **Branch Tracking**: Monitor branch creation, development, and merging
- **User Analytics**: Track individual developer productivity and metrics
- **Repository Sync**: Automated synchronization with GitHub repositories
- **Performance Metrics**: Development time, review time, and efficiency scores
- **Task Analytics**: Extract and analyze task IDs from branch names

### MCP Chatbot Integration
- **Task Details**: Get comprehensive information about any task (e.g., GS-10262)
- **Task Analytics**: Performance metrics, efficiency scores, and quality indicators
- **Natural Language Queries**: Ask questions about tasks in plain English
- **MCP Protocol**: Standard MCP server implementation for AI model integration
- **Real-time Chat**: WebSocket support for real-time interactions

## Quick Start

### Installation

```bash
# Install main Git Tracker
npm install

# Install MCP Chatbot
cd mcp-chatbot
npm install
```

### Running the Services

```bash
# Start both services with one command
npm run run

# Or run them separately:
npm start          # Main Git Tracker
npm run chatbot    # MCP Chatbot
```

## API Endpoints

### Main Git Tracker
- `POST /api/sync` - Sync branches from GitHub
- `GET /api/users` - Get user statistics
- `GET /api/users/:userId/branches` - Get user's branches
- `GET /api/branches/:branchId` - Get branch details
- `GET /api/dashboard/summary` - Dashboard summary
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:taskId` - Get task details

### MCP Chatbot
- `GET /api/chat/health` - Health check
- `POST /api/chat` - Chat interface
- `GET /api/task/:taskId` - Get task details
- `GET /api/task/:taskId/analytics` - Get task analytics

## Usage Examples

### Chatbot Queries

```bash
# Get task details
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Bring me the details for task ID GS-10262"}'

# Get task analytics
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the analytics for task SQ2-1196?"}'

# Get task timeline
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me the timeline for task TASK-123"}'
```

### Direct API Calls

```bash
# Get task details
curl http://localhost:3002/api/task/GS-10262

# Get task analytics
curl http://localhost:3002/api/task/GS-10262/analytics

# Health check
curl http://localhost:3002/api/chat/health
```

## Project Structure

```
GitLogs/
├── index.js                 # Main Git Tracker server
├── package.json             # Main package configuration
├── README.md               # This file
├── public/                 # Static files
├── mcp-chatbot/           # MCP Chatbot module
│   ├── demo.js            # Demo server with mock data
│   ├── start.js           # Production server
│   ├── src/
│   │   ├── mcp-server.js  # MCP protocol server
│   │   ├── task-analyzer.js # Task analysis logic
│   │   └── database-connector.js # Database connection
│   ├── config/
│   │   └── config.js      # Configuration settings
│   ├── test/
│   │   └── test-client.js # Test client
│   └── package.json       # Chatbot package configuration
└── server.log             # Server logs
```

## MCP Integration

The MCP chatbot provides the following tools for AI model integration:

1. **get_task_details** - Get comprehensive task information
2. **get_task_analytics** - Get performance and quality metrics
3. **get_user_tasks** - Get all tasks for a specific user
4. **get_repository_tasks** - Get all tasks in a repository
5. **get_task_timeline** - Get chronological events for a task
6. **get_task_metrics** - Get detailed metrics breakdown

## Task ID Formats Supported

The system supports various task ID formats:

- `GS-10262` (standard format)
- `GS10262` (without hyphen)
- `SQ2-1196` (with project prefix)
- `TASK-123` (generic format)
- `SQ-2-123` (with sub-project)

## Configuration

### Main Git Tracker
Create a `.env` file in the GitLogs directory:

```env
# GitHub Configuration
GITHUB_TOKEN=your_github_token_here

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Server Configuration
PORT=3001
NODE_ENV=development
```

### MCP Chatbot
Create a `.env` file in the mcp-chatbot directory:

```env
# Server Configuration
CHATBOT_PORT=3002
CHATBOT_HOST=localhost
NODE_ENV=development

# Database Configuration (same as main)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Logging
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_FILE=false

# CORS
CORS_ORIGIN=*
```

## Development

### Running in Development Mode

```bash
# Terminal 1: Main Git Tracker
npm run dev

# Terminal 2: MCP Chatbot
npm run chatbot:dev

# Terminal 3: MCP Server (for AI integration)
npm run chatbot:mcp
```

### Testing

```bash
# Test the chatbot
cd mcp-chatbot
npm test

# Test the main server
curl http://localhost:3001/api/chat/health
```

## Integration with AI Models

The MCP server can be integrated with AI models that support the Model Context Protocol:

```python
# Python example with Claude
from anthropic import Anthropic

client = Anthropic()

response = client.messages.create(
    model="claude-3-sonnet-20240229",
    max_tokens=1000,
    tools=[{
        "name": "get_task_details",
        "description": "Get detailed information about a specific task",
        "input_schema": {
            "type": "object",
            "properties": {
                "taskId": {"type": "string"}
            },
            "required": ["taskId"]
        }
    }],
    messages=[{
        "role": "user",
        "content": "Tell me about task GS-10262"
    }]
)
```

## Error Handling

The system includes comprehensive error handling:

- **Task Not Found**: Returns appropriate message when task doesn't exist
- **Database Errors**: Graceful handling of connection issues
- **Invalid Task IDs**: Normalization and validation of task ID formats
- **Rate Limiting**: Protection against excessive requests

## Performance

- **Caching**: Database connection pooling for better performance
- **Batch Operations**: Efficient handling of multiple queries
- **Async Processing**: Non-blocking operations for better responsiveness
- **Connection Management**: Proper connection lifecycle management

## Security

- **Input Validation**: All inputs are validated and sanitized
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Rate Limiting**: Protection against abuse
- **Error Sanitization**: Sensitive information is not exposed in errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 
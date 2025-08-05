# Git Tracker with MCP Chatbot - Quick Start

## 🚀 Single Command to Run Everything

```bash
# Start both the main Git Tracker and the MCP Chatbot
npm run run
```

This command will start:
- **Main Git Tracker** on port 3001 (http://localhost:3001)
- **MCP Chatbot** on port 3002 (http://localhost:3002)

## 🌐 Access the Interfaces

### Main Dashboard
- **URL**: http://localhost:3001
- **Features**: Branch tracking, user analytics, repository sync

### AI Chatbot Interface
- **URL**: http://localhost:3001/chatbot.html
- **Features**: Natural language task queries, detailed analytics

## 💬 Chatbot Examples

Once running, you can ask the chatbot questions like:

- "Bring me the details for task ID GS-10262"
- "What are the analytics for task SQ2-1196?"
- "Show me the timeline for task TASK-123"
- "Get metrics for task GS10262"

## 🔧 Alternative Commands

```bash
# Run only the main Git Tracker
npm start

# Run only the chatbot
npm run chatbot

# Run in development mode (with auto-restart)
npm run dev          # Main server
npm run chatbot:dev  # Chatbot
```

## 📱 Demo Tasks Available

The chatbot includes demo data for these tasks:
- **GS-10262**: User Authentication Enhancement
- **SQ2-1196**: API Performance Optimization
- **TASK-123**: Database Schema Migration

## 🎯 Quick Test

Test the chatbot with a simple curl command:

```bash
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Bring me the details for task ID GS-10262"}'
```

## 📊 Features

- **Natural Language Queries**: Ask questions in plain English
- **Task Analytics**: Detailed performance metrics and quality indicators
- **Timeline Analysis**: Complete task development timeline
- **Web Interface**: Beautiful, responsive UI
- **MCP Integration**: Ready for AI model integration

## 🛠️ Troubleshooting

If you encounter issues:

1. **Port already in use**: Kill existing processes
   ```bash
   pkill -f "node.*start.js" && pkill -f "node.*demo.js"
   ```

2. **Chatbot not responding**: Check if it's running
   ```bash
   curl http://localhost:3002/api/chat/health
   ```

3. **Database issues**: The chatbot uses mock data, so no database connection required

## 📁 Project Structure

```
GitLogs/
├── index.js                 # Main Git Tracker (port 3001)
├── mcp-chatbot/            # MCP Chatbot (port 3002)
│   ├── demo.js             # Demo server with mock data
│   └── src/mcp-server.js   # MCP protocol server
└── public/
    ├── index.html          # Main dashboard
    ├── chatbot.html        # Chatbot interface
    └── tasks.html          # Task analytics
```

That's it! Just run `npm run run` and you'll have both the Git Tracker and the AI Chatbot running simultaneously. 🎉 
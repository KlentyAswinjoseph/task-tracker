#!/bin/bash

# Git Tracker with MCP Chatbot - Startup Script

echo "🚀 Starting Git Tracker with MCP Chatbot..."

# Kill any existing processes
echo "📋 Cleaning up existing processes..."
pkill -f "node.*start.js" 2>/dev/null
pkill -f "node.*index.js" 2>/dev/null
sleep 2

# Start main Git Tracker server
echo "🌐 Starting main Git Tracker server (port 3001)..."
cd "$(dirname "$0")"
npm start &
MAIN_PID=$!

# Wait a moment for main server to start
sleep 3

# Start MCP Chatbot
echo "🤖 Starting MCP Chatbot (port 3002)..."
cd mcp-chatbot
npm run start &
CHATBOT_PID=$!

# Wait for both services to start
sleep 5

echo ""
echo "✅ Services started successfully!"
echo ""
echo "🌐 Access Points:"
echo "   • Main Dashboard: http://localhost:3001"
echo "   • Task Analytics: http://localhost:3001/tasks.html"
echo "   • AI Chatbot: http://localhost:3001/chatbot.html"
echo ""
echo "💬 Test the chatbot:"
echo "   curl -X POST http://localhost:3002/api/chat \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"message\": \"Bring me the details for task ID GS-10262\"}'"
echo ""
echo "🛑 To stop all services, press Ctrl+C"

# Wait for user to stop
wait 
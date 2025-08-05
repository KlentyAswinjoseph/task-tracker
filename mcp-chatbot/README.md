# Git Tracker MCP Chatbot with Custom Summarizer

A powerful chatbot that provides custom summaries for Git tasks with detailed analytics and progress tracking.

## Features

### 🎯 Custom Task Summarizer
The chatbot now includes a sophisticated custom summarizer that generates rich, formatted summaries with task IDs prominently displayed in messages. The summarizer supports multiple summary types:

- **Task Report** (`task_report`) - Detailed task information and metrics
- **Analytics Summary** (`analytics_summary`) - Performance metrics and efficiency analysis
- **Combined Summary** (`combined_summary`) - Complete overview with both task and analytics data
- **Progress Summary** (`progress_summary`) - Visual progress tracking with progress bars
- **Quality Summary** (`quality_summary`) - Code quality assessment with recommendations

### 📊 Rich Data Integration
- Integrates task details and analytics data
- Provides formatted time displays (hours and minutes)
- Includes visual progress bars and status emojis
- Offers quality recommendations based on metrics

## API Endpoints

### Chat Endpoint
```bash
POST /api/chat
```

**Request Body:**
```json
{
  "message": "Show me details for task GS-10262",
  "summaryType": "combined_summary"
}
```

**Available summary types:**
- `task_report`
- `analytics_summary`
- `combined_summary` (default)
- `progress_summary`
- `quality_summary`

### Task Summary Endpoint
```bash
GET /api/task/:taskId/summary?type=combined_summary
```

**Query Parameters:**
- `type` - Summary type (optional, defaults to `combined_summary`)

### Other Endpoints
- `GET /api/chat/health` - Health check
- `GET /api/task/:taskId` - Task details
- `GET /api/task/:taskId/analytics` - Task analytics

## Example Usage

### 1. Chat API with Custom Summary
```bash
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me the progress for task GS-10262",
    "summaryType": "progress_summary"
  }'
```

### 2. Direct Summary API
```bash
curl "http://localhost:3002/api/task/GS-10262/summary?type=quality_summary"
```

### 3. Task Analytics
```bash
curl "http://localhost:3002/api/task/GS-10262/analytics"
```

## Sample Responses

### Combined Summary Response
```json
{
  "message": "🎯 **Task GS-10262 Complete Overview** 🟢\n\n**Task Status:**\n• **Name:** Implement User Authentication System\n• **Status:** ACTIVE\n• **Completion Rate:** 60.0% (3/5 branches)\n\n**Performance Analysis:**\n• **Overall Efficiency:** 2.5 (changes/hour)\n• **Code Quality:** 7.5/10\n• **Merge Success Rate:** 92%\n• **Total Work Time:** 40h 0m\n\n**Key Metrics:**\n• **Total Commits:** 45\n• **Total Changes:** 1500\n• **Files Changed:** 25\n• **Repositories:** frontend, backend, api",
  "type": "combined_summary",
  "taskId": "GS-10262",
  "data": {
    "taskDetails": { ... },
    "analytics": { ... },
    "summary": {
      "taskId": "GS-10262",
      "status": "active",
      "completionRate": "60.0",
      "efficiency": 2.5,
      "qualityScore": 7.5,
      "mergeRate": 92,
      "totalTime": 2400
    }
  }
}
```

### Progress Summary Response
```json
{
  "message": "📈 **Task GS-10262 Progress Report** 🚀\n\n**Progress Overview:**\n██████░░░░ 60.0% Complete\n\n**Branch Status:**\n• **Total Branches:** 5\n• **Active Branches:** 2 🔄\n• **Merged Branches:** 3 ✅\n• **Remaining:** 2 branches\n\n**Recent Activity:**\n• **Weekly Progress:** 75%\n• **Monthly Trend:** Increasing\n\n**Timeline:**\n• **Created:** Jan 15, 2024\n• **Last Updated:** Jan 25, 2024",
  "type": "progress_summary",
  "taskId": "GS-10262"
}
```

## Summary Types Explained

### 1. Task Report (`task_report`)
- Basic task information
- Branch counts and status
- Repository and assignee details
- Key metrics overview

### 2. Analytics Summary (`analytics_summary`)
- Performance metrics
- Time breakdown
- Efficiency calculations
- Trend analysis

### 3. Combined Summary (`combined_summary`)
- Complete overview
- Both task and analytics data
- Most comprehensive summary
- Default summary type

### 4. Progress Summary (`progress_summary`)
- Visual progress bar
- Branch status breakdown
- Timeline information
- Recent activity metrics

### 5. Quality Summary (`quality_summary`)
- Code quality assessment
- Quality indicators
- Recommendations
- Performance ratings

## Installation and Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Start the server:**
```bash
node start.js
```

3. **Test the summarizer:**
```bash
node test-summarizer.js
```

## Configuration

The server runs on port 3002 by default. You can change this by setting the `CHATBOT_PORT` environment variable:

```bash
CHATBOT_PORT=3003 node start.js
```

## Error Handling

The summarizer gracefully handles:
- Missing task data
- Invalid task IDs
- Missing analytics data
- Network errors

Error responses include helpful messages and maintain consistent API structure.

## Development

### Adding New Summary Types

1. Add a new method to `TaskSummarizer` class in `src/task-summarizer.js`
2. Register it in the `summaryTemplates` object
3. Update the help message in `start.js`

### Customizing Summary Format

Modify the template methods in `TaskSummarizer` class to change:
- Message formatting
- Data structure
- Visual elements
- Calculation logic

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your changes
4. Test with `node test-summarizer.js`
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 
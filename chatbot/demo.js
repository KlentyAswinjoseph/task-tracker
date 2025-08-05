import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.CHATBOT_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data for demonstration
const mockTasks = {
  'GS-10262': {
    taskId: 'GS-10262',
    taskName: 'User Authentication Enhancement',
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:45:00Z',
    totalBranches: 3,
    activeBranches: 1,
    mergedBranches: 2,
    repositories: ['frontend', 'backend'],
    assignees: ['john.doe', 'jane.smith'],
    timeline: {
      startTime: '2024-01-15T10:30:00Z',
      reviewStartTime: '2024-01-18T09:15:00Z',
      endTime: '2024-01-20T14:45:00Z'
    },
    metrics: {
      totalWorkTime: 45.5,
      avgWorkTime: 15.2,
      totalCommits: 25,
      totalAdditions: 1250,
      totalDeletions: 150,
      totalFilesChanged: 45
    }
  },
  'SQ2-1196': {
    taskId: 'SQ2-1196',
    taskName: 'API Performance Optimization',
    status: 'completed',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-25T16:30:00Z',
    totalBranches: 5,
    activeBranches: 0,
    mergedBranches: 5,
    repositories: ['api-gateway', 'microservices'],
    assignees: ['alice.johnson', 'bob.wilson'],
    timeline: {
      startTime: '2024-01-10T08:00:00Z',
      reviewStartTime: '2024-01-15T11:20:00Z',
      endTime: '2024-01-25T16:30:00Z'
    },
    metrics: {
      totalWorkTime: 78.3,
      avgWorkTime: 15.7,
      totalCommits: 42,
      totalAdditions: 2100,
      totalDeletions: 300,
      totalFilesChanged: 67
    }
  },
  'TASK-123': {
    taskId: 'TASK-123',
    taskName: 'Database Schema Migration',
    status: 'in_review',
    createdAt: '2024-01-22T14:00:00Z',
    updatedAt: '2024-01-24T09:45:00Z',
    totalBranches: 2,
    activeBranches: 0,
    mergedBranches: 1,
    repositories: ['database', 'backend'],
    assignees: ['david.brown'],
    timeline: {
      startTime: '2024-01-22T14:00:00Z',
      reviewStartTime: '2024-01-24T09:45:00Z',
      endTime: null
    },
    metrics: {
      totalWorkTime: 32.1,
      avgWorkTime: 16.1,
      totalCommits: 18,
      totalAdditions: 850,
      totalDeletions: 120,
      totalFilesChanged: 23
    }
  }
};

const mockAnalytics = {
  'GS-10262': {
    developmentEfficiency: 0.55,
    reviewEfficiency: 2.3,
    overallEfficiency: 24.2,
    developmentTime: 32.5,
    reviewTime: 8.2,
    deploymentTime: 4.8,
    totalTime: 45.5,
    codeQualityScore: 8.2,
    reviewCoverage: 100,
    mergeSuccessRate: 66.7,
    weeklyProgress: 75,
    monthlyTrend: 'Increasing'
  },
  'SQ2-1196': {
    developmentEfficiency: 0.54,
    reviewEfficiency: 2.1,
    overallEfficiency: 30.7,
    developmentTime: 55.2,
    reviewTime: 15.8,
    deploymentTime: 7.3,
    totalTime: 78.3,
    codeQualityScore: 9.1,
    reviewCoverage: 100,
    mergeSuccessRate: 100,
    weeklyProgress: 100,
    monthlyTrend: 'Stable'
  },
  'TASK-123': {
    developmentEfficiency: 0.56,
    reviewEfficiency: 1.8,
    overallEfficiency: 30.2,
    developmentTime: 25.3,
    reviewTime: 6.8,
    deploymentTime: 0,
    totalTime: 32.1,
    codeQualityScore: 7.8,
    reviewCoverage: 50,
    mergeSuccessRate: 50,
    weeklyProgress: 50,
    monthlyTrend: 'Increasing'
  }
};

// Helper function to normalize task ID
function normalizeTaskId(taskId) {
  if (!taskId) return null;
  
  let normalized = taskId.toUpperCase().trim();
  
  if (normalized.includes('-')) {
    return normalized;
  }
  
  const match = normalized.match(/^([A-Z]+)(\d+)$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  
  return normalized;
}

// Health check endpoint
app.get('/api/chat/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { isConnected: true, readyState: 1 },
      taskAnalyzer: 'initialized',
      demo: true
    }
  });
});

// Task details endpoint
app.get('/api/task/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const normalizedTaskId = normalizeTaskId(taskId);
    
    const taskDetails = mockTasks[normalizedTaskId];
    
    if (!taskDetails) {
      return res.status(404).json({
        error: 'Task not found',
        message: `No task found with ID: ${taskId}`
      });
    }
    
    res.json(taskDetails);
  } catch (error) {
    console.error('Error fetching task details:', error);
    res.status(500).json({
      error: 'Failed to fetch task details',
      message: error.message
    });
  }
});

// Task analytics endpoint
app.get('/api/task/:taskId/analytics', (req, res) => {
  try {
    const { taskId } = req.params;
    const normalizedTaskId = normalizeTaskId(taskId);
    
    const analytics = mockAnalytics[normalizedTaskId];
    
    if (!analytics) {
      return res.status(404).json({
        error: 'Analytics not found',
        message: `No analytics found for task ID: ${taskId}`
      });
    }
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching task analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch task analytics',
      message: error.message
    });
  }
});

// Chat endpoint
app.post('/api/chat', (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    // Parse task ID from message
    const taskIdMatch = message.match(/(?:task\s+(?:ID\s+)?|task\s+)?([A-Z]+[-_]?\d+)/i);
    
    if (taskIdMatch) {
      const taskId = taskIdMatch[1];
      const normalizedTaskId = normalizeTaskId(taskId);
      
      const taskDetails = mockTasks[normalizedTaskId];
      const analytics = mockAnalytics[normalizedTaskId];
      
      if (taskDetails) {
        const response = {
          message: `Here are the details for task ${taskId}:`,
          data: {
            taskDetails,
            analytics
          },
          type: 'task_report',
          formattedReport: formatTaskReport(taskDetails, analytics)
        };
        
        res.json(response);
      } else {
        res.json({
          message: `Task ${taskId} not found. Available demo tasks: ${Object.keys(mockTasks).join(', ')}`,
          type: 'not_found'
        });
      }
    } else {
      res.json({
        message: "I can help you with task information. Try asking about a specific task ID like 'GS-10262', 'SQ2-1196', or 'TASK-123'.",
        type: 'help',
        availableTasks: Object.keys(mockTasks)
      });
    }
  } catch (error) {
    console.error('Error processing chat request:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message
    });
  }
});

// Format task report
function formatTaskReport(taskDetails, analytics) {
  return `
📋 **Task Details Report**

**Task ID:** ${taskDetails.taskId}
**Task Name:** ${taskDetails.taskName}
**Status:** ${taskDetails.status}
**Created:** ${taskDetails.createdAt}
**Updated:** ${taskDetails.updatedAt}

**Overview:**
- Total Branches: ${taskDetails.totalBranches}
- Active Branches: ${taskDetails.activeBranches}
- Merged Branches: ${taskDetails.mergedBranches}

**Repositories:** ${taskDetails.repositories.join(', ')}
**Assignees:** ${taskDetails.assignees.join(', ')}

**Timeline:**
- Start Time: ${taskDetails.timeline.startTime}
- Review Start: ${taskDetails.timeline.reviewStartTime || 'N/A'}
- End Time: ${taskDetails.timeline.endTime || 'N/A'}

**Metrics:**
- Total Work Time: ${taskDetails.metrics.totalWorkTime} hours
- Average Work Time: ${taskDetails.metrics.avgWorkTime} hours
- Total Commits: ${taskDetails.metrics.totalCommits}
- Total Additions: ${taskDetails.metrics.totalAdditions}
- Total Deletions: ${taskDetails.metrics.totalDeletions}
- Files Changed: ${taskDetails.metrics.totalFilesChanged}

📊 **Analytics Report**

**Performance Metrics:**
- Development Efficiency: ${analytics.developmentEfficiency} commits/hour
- Review Efficiency: ${analytics.reviewEfficiency} comments/hour
- Overall Efficiency: ${analytics.overallEfficiency} changes/hour

**Time Breakdown:**
- Development Time: ${analytics.developmentTime} hours
- Review Time: ${analytics.reviewTime} hours
- Deployment Time: ${analytics.deploymentTime} hours
- Total Time: ${analytics.totalTime} hours

**Quality Metrics:**
- Code Quality Score: ${analytics.codeQualityScore}/10
- Review Coverage: ${analytics.reviewCoverage}%
- Merge Success Rate: ${analytics.mergeSuccessRate}%

**Trends:**
- Weekly Progress: ${analytics.weeklyProgress}%
- Monthly Trend: ${analytics.monthlyTrend}
  `.trim();
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Git Tracker MCP Chatbot (DEMO) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/chat/health`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`📋 Task details: http://localhost:${PORT}/api/task/:taskId`);
  console.log(`📈 Task analytics: http://localhost:${PORT}/api/task/:taskId/analytics`);
  console.log('\n📝 Demo Tasks Available:');
  Object.keys(mockTasks).forEach(taskId => {
    console.log(`   - ${taskId}: ${mockTasks[taskId].taskName}`);
  });
  console.log('\n💡 Example usage:');
  console.log(`curl -X POST http://localhost:${PORT}/api/chat -H "Content-Type: application/json" -d '{"message": "Bring me the details for task ID GS-10262"}'`);
}); 
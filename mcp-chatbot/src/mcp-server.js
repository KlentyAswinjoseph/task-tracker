import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TaskAnalyzer } from "./task-analyzer.js";
import { DatabaseConnector } from "./database-connector.js";

class GitTrackerMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "git-tracker-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.dbConnector = new DatabaseConnector();
    this.taskAnalyzer = new TaskAnalyzer(this.dbConnector);

    this.setupTools();
  }

  setupTools() {
    // Tool to get task details
    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_task_details":
            return await this.getTaskDetails(args);
          case "get_task_analytics":
            return await this.getTaskAnalytics(args);
          case "get_user_tasks":
            return await this.getUserTasks(args);
          case "get_repository_tasks":
            return await this.getRepositoryTasks(args);
          case "get_task_timeline":
            return await this.getTaskTimeline(args);
          case "get_task_metrics":
            return await this.getTaskMetrics(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error in tool ${name}:`, error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async getTaskDetails(args) {
    const { taskId } = args;
    
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    const taskDetails = await this.taskAnalyzer.getTaskDetails(taskId);
    
    return {
      content: [
        {
          type: "text",
          text: this.formatTaskDetails(taskDetails),
        },
      ],
    };
  }

  async getTaskAnalytics(args) {
    const { taskId } = args;
    
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    const analytics = await this.taskAnalyzer.getTaskAnalytics(taskId);
    
    return {
      content: [
        {
          type: "text",
          text: this.formatTaskAnalytics(analytics),
        },
      ],
    };
  }

  async getUserTasks(args) {
    const { userId, limit = 10 } = args;
    
    if (!userId) {
      throw new Error("User ID is required");
    }

    const userTasks = await this.taskAnalyzer.getUserTasks(userId, limit);
    
    return {
      content: [
        {
          type: "text",
          text: this.formatUserTasks(userTasks),
        },
      ],
    };
  }

  async getRepositoryTasks(args) {
    const { repository, limit = 10 } = args;
    
    if (!repository) {
      throw new Error("Repository name is required");
    }

    const repoTasks = await this.taskAnalyzer.getRepositoryTasks(repository, limit);
    
    return {
      content: [
        {
          type: "text",
          text: this.formatRepositoryTasks(repoTasks),
        },
      ],
    };
  }

  async getTaskTimeline(args) {
    const { taskId } = args;
    
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    const timeline = await this.taskAnalyzer.getTaskTimeline(taskId);
    
    return {
      content: [
        {
          type: "text",
          text: this.formatTaskTimeline(timeline),
        },
      ],
    };
  }

  async getTaskMetrics(args) {
    const { taskId } = args;
    
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    const metrics = await this.taskAnalyzer.getTaskMetrics(taskId);
    
    return {
      content: [
        {
          type: "text",
          text: this.formatTaskMetrics(metrics),
        },
      ],
    };
  }

  formatTaskDetails(taskDetails) {
    if (!taskDetails) {
      return "Task not found or no details available.";
    }

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

**Repositories:** ${taskDetails.repositories.join(', ') || 'N/A'}
**Assignees:** ${taskDetails.assignees.join(', ') || 'N/A'}

**Timeline:**
- Start Time: ${taskDetails.timeline?.startTime || 'N/A'}
- Review Start: ${taskDetails.timeline?.reviewStartTime || 'N/A'}
- End Time: ${taskDetails.timeline?.endTime || 'N/A'}

**Metrics:**
- Total Work Time: ${taskDetails.metrics?.totalWorkTime || 0} hours
- Average Work Time: ${taskDetails.metrics?.avgWorkTime || 0} hours
- Total Commits: ${taskDetails.metrics?.totalCommits || 0}
- Total Additions: ${taskDetails.metrics?.totalAdditions || 0}
- Total Deletions: ${taskDetails.metrics?.totalDeletions || 0}
- Files Changed: ${taskDetails.metrics?.totalFilesChanged || 0}
    `.trim();
  }

  formatTaskAnalytics(analytics) {
    if (!analytics) {
      return "No analytics data available for this task.";
    }

    return `
📊 **Task Analytics Report**

**Performance Metrics:**
- Development Efficiency: ${analytics.developmentEfficiency || 0} commits/hour
- Review Efficiency: ${analytics.reviewEfficiency || 0} comments/hour
- Overall Efficiency: ${analytics.overallEfficiency || 0} changes/hour

**Time Breakdown:**
- Development Time: ${analytics.developmentTime || 0} hours
- Review Time: ${analytics.reviewTime || 0} hours
- Deployment Time: ${analytics.deploymentTime || 0} hours
- Total Time: ${analytics.totalTime || 0} hours

**Quality Metrics:**
- Code Quality Score: ${analytics.codeQualityScore || 0}/10
- Review Coverage: ${analytics.reviewCoverage || 0}%
- Merge Success Rate: ${analytics.mergeSuccessRate || 0}%

**Trends:**
- Weekly Progress: ${analytics.weeklyProgress || 0}%
- Monthly Trend: ${analytics.monthlyTrend || 'Stable'}
    `.trim();
  }

  formatUserTasks(userTasks) {
    if (!userTasks || userTasks.length === 0) {
      return "No tasks found for this user.";
    }

    let report = `👤 **User Tasks Report**\n\n`;
    
    userTasks.forEach((task, index) => {
      report += `
**${index + 1}. ${task.taskId} - ${task.taskName}**
- Status: ${task.status}
- Branches: ${task.totalBranches} (${task.activeBranches} active, ${task.mergedBranches} merged)
- Work Time: ${task.metrics?.totalWorkTime || 0} hours
- Commits: ${task.metrics?.totalCommits || 0}
- Repositories: ${task.repositories.join(', ')}
      `;
    });

    return report.trim();
  }

  formatRepositoryTasks(repoTasks) {
    if (!repoTasks || repoTasks.length === 0) {
      return "No tasks found for this repository.";
    }

    let report = `📁 **Repository Tasks Report**\n\n`;
    
    repoTasks.forEach((task, index) => {
      report += `
**${index + 1}. ${task.taskId} - ${task.taskName}**
- Status: ${task.status}
- Assignees: ${task.assignees.join(', ')}
- Branches: ${task.totalBranches} (${task.activeBranches} active, ${task.mergedBranches} merged)
- Work Time: ${task.metrics?.totalWorkTime || 0} hours
- Commits: ${task.metrics?.totalCommits || 0}
      `;
    });

    return report.trim();
  }

  formatTaskTimeline(timeline) {
    if (!timeline || timeline.length === 0) {
      return "No timeline data available for this task.";
    }

    let report = `⏰ **Task Timeline Report**\n\n`;
    
    timeline.forEach((event, index) => {
      report += `
**${index + 1}. ${event.branchName}**
- Repository: ${event.repository}
- Assignee: ${event.assignee}
- Created: ${event.created}
- PR Created: ${event.prCreated || 'N/A'}
- Merged: ${event.merged || 'N/A'}
- Status: ${event.status}
- Work Time: ${event.workTime || 0} hours
      `;
    });

    return report.trim();
  }

  formatTaskMetrics(metrics) {
    if (!metrics) {
      return "No metrics data available for this task.";
    }

    return `
📈 **Task Metrics Report**

**Repository Breakdown:**
${Object.entries(metrics.byRepository || {}).map(([repo, data]) => `
- ${repo}:
  - Total: ${data.total} branches
  - Active: ${data.active} branches
  - Merged: ${data.merged} branches
  - Commits: ${data.commits}
  - Work Time: ${data.workTime} hours
`).join('')}

**Assignee Breakdown:**
${Object.entries(metrics.byAssignee || {}).map(([userId, data]) => `
- ${data.userName} (${userId}):
  - Total: ${data.total} branches
  - Active: ${data.active} branches
  - Merged: ${data.merged} branches
  - Commits: ${data.commits}
  - Work Time: ${data.workTime} hours
  - Repositories: ${data.repositories.join(', ')}
`).join('')}
    `.trim();
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("Git Tracker MCP Server started");
  }
}

// Start the server
const server = new GitTrackerMCPServer();
server.start().catch(console.error); 
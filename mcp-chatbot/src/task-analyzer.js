import mongoose from 'mongoose';
import moment from 'moment';

export class TaskAnalyzer {
  constructor(dbConnector) {
    this.dbConnector = dbConnector;
    this.Branch = null;
    this.Task = null;
    this.User = null;
    this.initialized = false;
    this.initializeModels();
  }

  async initializeModels() {
    try {
      // Connect to the same MongoDB instance as the main Git Tracker
      await mongoose.connect(
        process.env.MONGO_URI
      );

      // Define schemas (same as in main Git Tracker)
      const branchSchema = new mongoose.Schema({
        branchName: { type: String, required: true },
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        repository: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["active", "merged", "deleted", "deployed"],
          default: "active",
        },
        stages: {
          created: { type: Date, default: Date.now },
          firstCommit: Date,
          prCreated: Date,
          reviewStarted: Date,
          merged: Date,
          deployed: Date,
        },
        waitingTimes: {
          development: Number,
          review: Number,
          deployment: Number,
          total: Number,
        },
        metrics: {
          commits: { type: Number, default: 0 },
          additions: { type: Number, default: 0 },
          deletions: { type: Number, default: 0 },
          filesChanged: { type: Number, default: 0 },
          reviewers: [String],
          comments: { type: Number, default: 0 },
        },
        taskId: { type: String, default: null },
        taskDescription: { type: String, default: null },
        tags: [String],
      });

      const taskSchema = new mongoose.Schema({
        taskId: { type: String, required: true, unique: true },
        taskName: { type: String, required: true },
        totalBranches: { type: Number, default: 0 },
        activeBranches: { type: Number, default: 0 },
        mergedBranches: { type: Number, default: 0 },
        repositories: [String],
        assignees: [String],
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        timeline: {
          startTime: Date,
          endTime: Date,
          reviewStartTime: Date,
          mergedTime: Date,
        },
        metrics: {
          totalWorkTime: Number,
          avgWorkTime: Number,
          totalCommits: { type: Number, default: 0 },
          totalAdditions: { type: Number, default: 0 },
          totalDeletions: { type: Number, default: 0 },
          totalFilesChanged: { type: Number, default: 0 },
        },
        status: {
          type: String,
          enum: ["active", "in_review", "completed", "on_hold"],
          default: "active",
        },
      });

      const userSchema = new mongoose.Schema({
        userId: { type: String, required: true, unique: true },
        userName: { type: String, required: true },
        email: String,
        avatar: String,
        stats: {
          totalBranches: { type: Number, default: 0 },
          activeBranches: { type: Number, default: 0 },
          mergedBranches: { type: Number, default: 0 },
          avgWaitingTime: { type: Number, default: 0 },
          totalCommits: { type: Number, default: 0 },
          totalAdditions: { type: Number, default: 0 },
          totalDeletions: { type: Number, default: 0 },
        },
        lastActivity: { type: Date, default: Date.now },
      });

      this.Branch = mongoose.model("Branch", branchSchema);
      this.Task = mongoose.model("Task", taskSchema);
      this.User = mongoose.model("User", userSchema);
      this.initialized = true;

      console.log("Task Analyzer initialized successfully");
    } catch (error) {
      console.error("Error initializing Task Analyzer:", error);
      this.initialized = false;
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeModels();
    }
  }

  async getTaskDetails(taskId) {
    try {
      await this.ensureInitialized();
      
      // Normalize task ID (handle different formats)
      const normalizedTaskId = this.normalizeTaskId(taskId);
      
      const task = await this.Task.findOne({ taskId: normalizedTaskId });
      
      if (!task) {
        // Try to find by partial match
        const partialMatch = await this.Task.findOne({
          taskId: { $regex: normalizedTaskId, $options: 'i' }
        });
        
        if (partialMatch) {
          return this.formatTaskData(partialMatch);
        }
        
        return null;
      }

      return this.formatTaskData(task);
    } catch (error) {
      console.error(`Error getting task details for ${taskId}:`, error);
      throw error;
    }
  }

  async getTaskAnalytics(taskId) {
    try {
      await this.ensureInitialized();
      
      const normalizedTaskId = this.normalizeTaskId(taskId);
      
      // Get task and all related branches
      const task = await this.Task.findOne({ taskId: normalizedTaskId });
      const branches = await this.Branch.find({ taskId: normalizedTaskId });

      if (!task && branches.length === 0) {
        return null;
      }

      // Calculate analytics
      const analytics = {
        developmentEfficiency: 0,
        reviewEfficiency: 0,
        overallEfficiency: 0,
        developmentTime: 0,
        reviewTime: 0,
        deploymentTime: 0,
        totalTime: 0,
        codeQualityScore: 0,
        reviewCoverage: 0,
        mergeSuccessRate: 0,
        weeklyProgress: 0,
        monthlyTrend: 'Stable'
      };

      if (branches.length > 0) {
        // Calculate time-based metrics
        const totalDevTime = branches.reduce((sum, b) => sum + (b.waitingTimes?.development || 0), 0);
        const totalReviewTime = branches.reduce((sum, b) => sum + (b.waitingTimes?.review || 0), 0);
        const totalDeployTime = branches.reduce((sum, b) => sum + (b.waitingTimes?.deployment || 0), 0);
        const totalTime = branches.reduce((sum, b) => sum + (b.waitingTimes?.total || 0), 0);

        const totalCommits = branches.reduce((sum, b) => sum + (b.metrics?.commits || 0), 0);
        const totalComments = branches.reduce((sum, b) => sum + (b.metrics?.comments || 0), 0);
        const totalChanges = branches.reduce((sum, b) => sum + (b.metrics?.additions || 0) + (b.metrics?.deletions || 0), 0);

        analytics.developmentTime = totalDevTime;
        analytics.reviewTime = totalReviewTime;
        analytics.deploymentTime = totalDeployTime;
        analytics.totalTime = totalTime;

        // Calculate efficiency metrics
        analytics.developmentEfficiency = totalDevTime > 0 ? (totalCommits / totalDevTime).toFixed(2) : 0;
        analytics.reviewEfficiency = totalReviewTime > 0 ? (totalComments / totalReviewTime).toFixed(2) : 0;
        analytics.overallEfficiency = totalTime > 0 ? (totalChanges / totalTime).toFixed(2) : 0;

        // Calculate quality metrics
        const mergedBranches = branches.filter(b => b.status === 'merged').length;
        analytics.mergeSuccessRate = branches.length > 0 ? ((mergedBranches / branches.length) * 100).toFixed(1) : 0;

        // Calculate review coverage
        const branchesWithReviews = branches.filter(b => b.metrics?.reviewers?.length > 0).length;
        analytics.reviewCoverage = branches.length > 0 ? ((branchesWithReviews / branches.length) * 100).toFixed(1) : 0;

        // Calculate code quality score (simplified)
        const avgCommitsPerBranch = branches.length > 0 ? totalCommits / branches.length : 0;
        const avgChangesPerCommit = totalCommits > 0 ? totalChanges / totalCommits : 0;
        analytics.codeQualityScore = Math.min(10, Math.max(0, 
          (avgCommitsPerBranch * 0.3 + avgChangesPerCommit * 0.7) / 10
        )).toFixed(1);

        // Calculate progress trends
        const recentBranches = branches.filter(b => 
          moment(b.createdAt).isAfter(moment().subtract(7, 'days'))
        );
        analytics.weeklyProgress = branches.length > 0 ? 
          ((recentBranches.length / branches.length) * 100).toFixed(1) : 0;

        // Monthly trend
        const monthlyBranches = branches.filter(b => 
          moment(b.createdAt).isAfter(moment().subtract(30, 'days'))
        );
        const previousMonthBranches = branches.filter(b => 
          moment(b.createdAt).isBetween(
            moment().subtract(60, 'days'), 
            moment().subtract(30, 'days')
          )
        );

        if (previousMonthBranches.length > 0) {
          const currentRate = monthlyBranches.length / 30;
          const previousRate = previousMonthBranches.length / 30;
          analytics.monthlyTrend = currentRate > previousRate ? 'Increasing' : 
                                  currentRate < previousRate ? 'Decreasing' : 'Stable';
        }
      }

      return analytics;
    } catch (error) {
      console.error(`Error getting task analytics for ${taskId}:`, error);
      throw error;
    }
  }

  async getUserTasks(userId, limit = 10) {
    try {
      await this.ensureInitialized();
      
      const tasks = await this.Task.find({
        assignees: { $in: [userId] }
      })
      .sort({ updatedAt: -1 })
      .limit(limit);

      return tasks.map(task => this.formatTaskData(task));
    } catch (error) {
      console.error(`Error getting user tasks for ${userId}:`, error);
      throw error;
    }
  }

  async getRepositoryTasks(repository, limit = 10) {
    try {
      await this.ensureInitialized();
      
      const tasks = await this.Task.find({
        repositories: { $in: [repository] }
      })
      .sort({ updatedAt: -1 })
      .limit(limit);

      return tasks.map(task => this.formatTaskData(task));
    } catch (error) {
      console.error(`Error getting repository tasks for ${repository}:`, error);
      throw error;
    }
  }

  async getTaskTimeline(taskId) {
    try {
      await this.ensureInitialized();
      
      const normalizedTaskId = this.normalizeTaskId(taskId);
      
      const branches = await this.Branch.find({ taskId: normalizedTaskId })
        .sort({ createdAt: -1 });

      return branches.map(branch => ({
        branchName: branch.branchName,
        repository: branch.repository,
        assignee: branch.userName,
        created: branch.stages?.created || branch.createdAt,
        prCreated: branch.stages?.prCreated,
        merged: branch.stages?.merged,
        status: branch.status,
        workTime: branch.waitingTimes?.total || 0
      }));
    } catch (error) {
      console.error(`Error getting task timeline for ${taskId}:`, error);
      throw error;
    }
  }

  async getTaskMetrics(taskId) {
    try {
      await this.ensureInitialized();
      
      const normalizedTaskId = this.normalizeTaskId(taskId);
      
      const branches = await this.Branch.find({ taskId: normalizedTaskId });

      const metrics = {
        byRepository: {},
        byAssignee: {}
      };

      branches.forEach(branch => {
        // Group by repository
        if (!metrics.byRepository[branch.repository]) {
          metrics.byRepository[branch.repository] = {
            total: 0,
            active: 0,
            merged: 0,
            commits: 0,
            workTime: 0
          };
        }
        
        const repo = metrics.byRepository[branch.repository];
        repo.total++;
        if (branch.status === 'active') repo.active++;
        if (branch.status === 'merged') repo.merged++;
        repo.commits += branch.metrics?.commits || 0;
        repo.workTime += branch.waitingTimes?.total || 0;

        // Group by assignee
        if (!metrics.byAssignee[branch.userId]) {
          metrics.byAssignee[branch.userId] = {
            userName: branch.userName,
            total: 0,
            active: 0,
            merged: 0,
            commits: 0,
            workTime: 0,
            repositories: new Set()
          };
        }
        
        const assignee = metrics.byAssignee[branch.userId];
        assignee.total++;
        if (branch.status === 'active') assignee.active++;
        if (branch.status === 'merged') assignee.merged++;
        assignee.commits += branch.metrics?.commits || 0;
        assignee.workTime += branch.waitingTimes?.total || 0;
        assignee.repositories.add(branch.repository);
      });

      // Convert repository sets to arrays
      Object.keys(metrics.byAssignee).forEach(userId => {
        metrics.byAssignee[userId].repositories = Array.from(metrics.byAssignee[userId].repositories);
      });

      return metrics;
    } catch (error) {
      console.error(`Error getting task metrics for ${taskId}:`, error);
      throw error;
    }
  }

  normalizeTaskId(taskId) {
    // Handle different task ID formats
    if (!taskId) return null;
    
    // Remove common prefixes and normalize
    let normalized = taskId.toUpperCase().trim();
    
    // Handle formats like "GS-10262", "GS10262", "gs-10262", etc.
    if (normalized.includes('-')) {
      return normalized;
    }
    
    // Try to add hyphen if missing (e.g., "GS10262" -> "GS-10262")
    const match = normalized.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
    
    return normalized;
  }

  formatTaskData(task) {
    if (!task) return null;

    return {
      taskId: task.taskId,
      taskName: task.taskName,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      totalBranches: task.totalBranches,
      activeBranches: task.activeBranches,
      mergedBranches: task.mergedBranches,
      repositories: task.repositories || [],
      assignees: task.assignees || [],
      timeline: task.timeline || {},
      metrics: task.metrics || {}
    };
  }
} 
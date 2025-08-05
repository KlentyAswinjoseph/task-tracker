import express from "express";
import { Octokit } from "@octokit/rest";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import moment from "moment";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// GitHub API setup with fetch implementation
const octokit = new Octokit({
  auth: process.env.PAT_TOKEN,
  request: {
    fetch: fetch,
  },
});

// MongoDB connection
mongoose.connect(
  process.env.MONGO_URI
);

// Database Schemas
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
    development: Number, // hours
    review: Number, // hours
    deployment: Number, // hours
    total: Number, // hours
  },
  metrics: {
    commits: { type: Number, default: 0 },
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
    filesChanged: { type: Number, default: 0 },
    reviewers: [String],
    comments: { type: Number, default: 0 },
  },
  // Add task information
  taskId: { type: String, default: null }, // Extracted task ID like SQ2-1196
  taskDescription: { type: String, default: null }, // Description part after task ID
  tags: [String], // for categorization
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

// New Task schema for task-level analytics
const taskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  taskName: { type: String, required: true }, // Display name for the task
  totalBranches: { type: Number, default: 0 },
  activeBranches: { type: Number, default: 0 },
  mergedBranches: { type: Number, default: 0 },
  repositories: [String], // List of repositories this task appears in
  assignees: [String], // List of users who worked on this task
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // Timing information
  timeline: {
    startTime: Date, // When first branch was created
    endTime: Date, // When last branch was merged
    reviewStartTime: Date, // When first PR was created
    mergedTime: Date, // When task was completed (last branch merged)
  },

  // Aggregated metrics
  metrics: {
    totalWorkTime: Number, // Total time from start to completion (hours)
    avgWorkTime: Number, // Average work time per branch (hours)
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

const Branch = mongoose.model("Branch", branchSchema);
const User = mongoose.model("User", userSchema);
const Task = mongoose.model("Task", taskSchema);

const calculateWaitingTime = (startDate, endDate) => {
  if (!startDate || !endDate) return null;

  const start = moment(startDate);
  const end = moment(endDate);

  if (!start.isValid() || !end.isValid()) return null;

  const diffInHours = end.diff(start, "hours", true);

  // If the difference is absurdly negative, consider it a data issue
  if (diffInHours < -1000) return null;

  // Ensure no negative waiting time
  return Math.max(0, diffInHours);
};

// Task extraction utility functions
const extractTaskFromBranchName = (branchName) => {
  // Regex patterns for different task ID formats
  const patterns = [
    /^([A-Z]+\d*-\d+)[-_](.+)$/i, // SQ2-1196-description
    /^([A-Z]+[-_]\d+)[-_](.+)$/i, // SQ-123-description
    /^([A-Z]+\d+)[-_](.+)$/i, // SQ123-description
    /^([A-Z]{2,}\d+)[-_](.+)$/i, // TASK123-description
    /^([A-Z]+[-_]\d+[-_]\d+)[-_](.+)$/i, // SQ-2-123-description
  ];

  for (const pattern of patterns) {
    const match = branchName.match(pattern);
    if (match) {
      return {
        taskId: match[1].toUpperCase(),
        taskDescription: match[2].replace(/[-_]/g, " ").trim(),
      };
    }
  }

  return {
    taskId: null,
    taskDescription: null,
  };
};

// Update task statistics
const updateTaskStats = async (taskId, taskDescription, branchData) => {
  if (!taskId) return;

  try {
    const task = await Task.findOne({ taskId });
    const allTaskBranches = await Branch.find({ taskId });

    // If no branches found in DB, use the input branch data
    if (allTaskBranches.length === 0 && branchData) {
      allTaskBranches.push(branchData);
    }

    // Calculate aggregated metrics from database data
    const totalCommits = allTaskBranches.reduce(
      (sum, b) => sum + (b.metrics?.commits || 0),
      0
    );
    const totalAdditions = allTaskBranches.reduce(
      (sum, b) => sum + (b.metrics?.additions || 0),
      0
    );
    const totalDeletions = allTaskBranches.reduce(
      (sum, b) => sum + (b.metrics?.deletions || 0),
      0
    );
    const totalFilesChanged = allTaskBranches.reduce(
      (sum, b) => sum + (b.metrics?.filesChanged || 0),
      0
    );

    // Calculate timeline from database data
    const sortedBranches = allTaskBranches.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    const startTime =
      sortedBranches[0]?.stages.created || sortedBranches[0]?.createdAt;
    const reviewStartTime = sortedBranches.find((b) => b.stages?.prCreated)
      ?.stages.prCreated;
    const mergedBranches = allTaskBranches.filter((b) => b.stages?.merged);
    const endTime =
      mergedBranches.length > 0
        ? mergedBranches.sort(
            (a, b) => new Date(b.stages.merged) - new Date(a.stages.merged)
          )[0].stages.merged
        : null;

    // Calculate work times from database data
    const totalWorkTime =
      endTime && startTime ? calculateWaitingTime(startTime, endTime) : null;
    const avgWorkTime =
      allTaskBranches.length > 0
        ? allTaskBranches.reduce(
            (sum, b) => sum + (b.waitingTimes?.total || 0),
            0
          ) / allTaskBranches.length
        : 0;

    // Determine task status from database data
    let status = "active";
    if (allTaskBranches.every((b) => b.status === "merged")) {
      status = "completed";
    } else if (
      allTaskBranches.some((b) => b.stages?.prCreated && !b.stages?.merged)
    ) {
      status = "in_review";
    }

    // Use existing task data if available, otherwise use input data
    const existingTask = task || {};
    const taskName = existingTask.taskName || taskDescription || taskId;
    const existingRepositories = existingTask.repositories || [];
    const existingAssignees = existingTask.assignees || [];

    // Merge repositories and assignees, avoiding duplicates
    const newRepositories = branchData ? [branchData.repository] : [];
    const newAssignees = branchData ? [branchData.userId] : [];

    const allRepositories = [
      ...new Set([...existingRepositories, ...newRepositories]),
    ];
    const allAssignees = [...new Set([...existingAssignees, ...newAssignees])];

    const taskData = {
      taskId,
      taskName,
      totalBranches: allTaskBranches.length,
      activeBranches: allTaskBranches.filter((b) => b.status === "active")
        .length,
      mergedBranches: allTaskBranches.filter((b) => b.status === "merged")
        .length,
      repositories: allRepositories,
      assignees: allAssignees,
      updatedAt: new Date(),
      timeline: {
        startTime,
        endTime,
        reviewStartTime,
        mergedTime: endTime,
      },
      metrics: {
        totalWorkTime,
        avgWorkTime,
        totalCommits,
        totalAdditions,
        totalDeletions,
        totalFilesChanged,
      },
      status,
    };

    await Task.findOneAndUpdate({ taskId }, taskData, {
      upsert: true,
      new: true,
    });

    console.log(`Updated task stats for ${taskId}`);
  } catch (error) {
    console.error(`Error updating task stats for ${taskId}:`, error);
  }
};

const updateUserStats = async (userId) => {
  try {
    const userBranches = await Branch.find({ userId });
    const stats = {
      totalBranches: userBranches.length,
      activeBranches: userBranches.filter((b) => b.status === "active").length,
      mergedBranches: userBranches.filter((b) => b.status === "merged").length,
      totalCommits: userBranches.reduce(
        (sum, b) => sum + (b.metrics.commits || 0),
        0
      ),
      totalAdditions: userBranches.reduce(
        (sum, b) => sum + (b.metrics.additions || 0),
        0
      ),
      totalDeletions: userBranches.reduce(
        (sum, b) => sum + (b.metrics.deletions || 0),
        0
      ),
    };

    const avgWaitingTime =
      userBranches.length > 0
        ? userBranches.reduce(
            (sum, b) => sum + (b.waitingTimes.total || 0),
            0
          ) / userBranches.length
        : 0;

    stats.avgWaitingTime = avgWaitingTime;

    await User.findOneAndUpdate(
      { userId },
      { stats, lastActivity: new Date() },
      { upsert: true }
    );
  } catch (error) {
    console.error(`Error updating user stats for ${userId}:`, error);
    throw error;
  }
};

// Optimized bulk user stats update
const updateUserStatsBulk = async (userIds) => {
  try {
    const bulkOps = [];

    for (const userId of userIds) {
      // Use aggregation for better performance
      const userStats = await Branch.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalBranches: { $sum: 1 },
            activeBranches: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            mergedBranches: {
              $sum: { $cond: [{ $eq: ["$status", "merged"] }, 1, 0] },
            },
            totalCommits: { $sum: "$metrics.commits" },
            totalAdditions: { $sum: "$metrics.additions" },
            totalDeletions: { $sum: "$metrics.deletions" },
            avgWaitingTime: { $avg: "$waitingTimes.total" },
          },
        },
      ]);

      const stats = userStats[0] || {
        totalBranches: 0,
        activeBranches: 0,
        mergedBranches: 0,
        totalCommits: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        avgWaitingTime: 0,
      };

      bulkOps.push({
        updateOne: {
          filter: { userId },
          update: {
            $set: {
              stats,
              lastActivity: new Date(),
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps, { ordered: false });
    }
  } catch (error) {
    console.error("Error in bulk user stats update:", error);
    throw error;
  }
};

// API Routes

// Get all users with their branch statistics
app.get("/api/users", async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    const users = await User.aggregate([
      {
        $lookup: {
          from: "branches",
          localField: "userId",
          foreignField: "userId",
          as: "branches",
        },
      },
      {
        $addFields: {
          filteredBranches: {
            $filter: {
              input: "$branches",
              as: "branch",
              cond: {
                $and: [
                  // Only apply date filter if both dates are provided
                  ...(startDate && endDate
                    ? [
                        {
                          $and: [
                            {
                              $gte: ["$$branch.createdAt", new Date(startDate)],
                            },
                            { $lte: ["$$branch.createdAt", new Date(endDate)] },
                          ],
                        },
                      ]
                    : []),
                  // Only apply status filter if provided
                  ...(status ? [{ $eq: ["$$branch.status", status] }] : []),
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          "stats.totalBranches": { $size: "$filteredBranches" },
          "stats.activeBranches": {
            $size: {
              $filter: {
                input: "$filteredBranches",
                as: "branch",
                cond: { $eq: ["$$branch.status", "active"] },
              },
            },
          },
          "stats.mergedBranches": {
            $size: {
              $filter: {
                input: "$filteredBranches",
                as: "branch",
                cond: { $eq: ["$$branch.status", "merged"] },
              },
            },
          },
        },
      },
    ]);

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get detailed branch metrics for a specific user
app.get("/api/users/:userId/branches", async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, status } = req.query;

    let query = { userId };
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (status) {
      query.status = status;
    }

    const branches = await Branch.find(query).sort({ createdAt: -1 });

    // Calculate detailed metrics
    const metrics = {
      totalBranches: branches.length,
      activeBranches: branches.filter((b) => b.status === "active").length,
      mergedBranches: branches.filter((b) => b.status === "merged").length,
      totalCommits: branches.reduce(
        (sum, b) => sum + (b.metrics.commits || 0),
        0
      ),
      totalAdditions: branches.reduce(
        (sum, b) => sum + (b.metrics.additions || 0),
        0
      ),
      totalDeletions: branches.reduce(
        (sum, b) => sum + (b.metrics.deletions || 0),
        0
      ),
      avgWaitingTime:
        branches.length > 0
          ? branches.reduce((sum, b) => sum + (b.waitingTimes.total || 0), 0) /
            branches.length
          : 0,
      avgDevelopmentTime:
        branches.length > 0
          ? branches.reduce(
              (sum, b) => sum + (b.waitingTimes.development || 0),
              0
            ) / branches.length
          : 0,
      avgReviewTime:
        branches.length > 0
          ? branches.reduce((sum, b) => sum + (b.waitingTimes.review || 0), 0) /
            branches.length
          : 0,
    };

    res.json({ branches, metrics });
  } catch (error) {
    console.error("Error fetching user branches:", error);
    res.status(500).json({ error: "Failed to fetch user branches" });
  }
});

// Get detailed metrics for a specific branch
app.get("/api/branches/:branchId", async (req, res) => {
  try {
    const { branchId } = req.params;
    const branch = await Branch.findById(branchId);

    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    // Calculate detailed timeline
    const timeline = {
      created: branch.stages.created,
      firstCommit: branch.stages.firstCommit,
      prCreated: branch.stages.prCreated,
      reviewStarted: branch.stages.reviewStarted,
      merged: branch.stages.merged,
      deployed: branch.stages.deployed,
    };

    // Calculate efficiency metrics
    const efficiency = {
      developmentEfficiency: branch.waitingTimes.development
        ? (branch.metrics.commits / branch.waitingTimes.development).toFixed(2)
        : 0,
      reviewEfficiency: branch.waitingTimes.review
        ? (branch.metrics.comments / branch.waitingTimes.review).toFixed(2)
        : 0,
      overallEfficiency: branch.waitingTimes.total
        ? (
            (branch.metrics.additions + branch.metrics.deletions) /
            branch.waitingTimes.total
          ).toFixed(2)
        : 0,
    };

    res.json({ branch, timeline, efficiency });
  } catch (error) {
    console.error("Error fetching branch details:", error);
    res.status(500).json({ error: "Failed to fetch branch details" });
  }
});

// Sync branches from GitHub with enhanced error handling and performance optimization
app.post("/api/sync", async (req, res) => {
  try {
    const {
      owner,
      repo,
      batchSize = 50,
      maxConcurrency = 10,
      startDate,
      endDate,
    } = req.body;

    if (!owner || !repo) {
      return res.status(400).json({
        error: "Owner and repository are required",
        success: false,
      });
    }

    console.log(`Starting optimized sync for ${owner}/${repo}...`);

    // Set up streaming response
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendProgress = (data) => {
      res.write(JSON.stringify(data) + "\n");
    };

    let syncResults = {
      branchesProcessed: 0,
      branchesSuccessful: 0,
      branchesFailed: 0,
      errors: [],
      warnings: [],
      performance: {
        startTime: Date.now(),
        fetchTime: 0,
        processTime: 0,
        dbTime: 0,
      },
    };

    // Helper function to safely fetch with retries and rate limiting
    const fetchWithRetry = async (fetchFunction, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await fetchFunction();
        } catch (error) {
          if (error.status === 403 && error.message.includes("rate limit")) {
            const resetTime = error.response?.headers?.["x-ratelimit-reset"];
            const waitTime = resetTime ? resetTime * 1000 - Date.now() : 60000;
            console.log(`Rate limit hit, waiting ${waitTime}ms...`);
            sendProgress({
              type: "progress",
              status: `Rate limit hit, waiting ${Math.round(
                waitTime / 1000
              )}s...`,
              message: `Rate limit exceeded, retrying in ${Math.round(
                waitTime / 1000
              )} seconds...`,
              messageType: "info",
            });
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(waitTime, 60000))
            );
          }

          console.log(`Attempt ${i + 1} failed:`, error.message);
          sendProgress({
            type: "progress",
            status: `Retry ${i + 1}/${retries}`,
            message: `Attempt ${i + 1} failed: ${error.message}`,
            messageType: "error",
          });
          if (i === retries - 1) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    };

    // Validate repository access
    const fetchStart = Date.now();
    try {
      sendProgress({
        type: "progress",
        status: "Validating repository access...",
        message: "Checking repository permissions...",
        messageType: "info",
      });

      await fetchWithRetry(() => octokit.rest.repos.get({ owner, repo }));
      console.log(`Repository ${owner}/${repo} is accessible`);

      sendProgress({
        type: "progress",
        status: "Repository access confirmed",
        message: `Repository ${owner}/${repo} is accessible`,
        messageType: "success",
      });
    } catch (error) {
      console.error("Repository access error:", error.message);
      sendProgress({
        type: "progress",
        status: "Repository access failed",
        message: `Repository ${owner}/${repo} not found or not accessible. Please check the repository name and your GitHub token permissions.`,
        messageType: "error",
      });
      res.end();
      return;
    }

    // Fetch all branches with optimized pagination
    let allBranches = [];
    let allPullRequests = [];

    try {
      sendProgress({
        type: "progress",
        status: "Fetching repository data...",
        message: "Fetching branches and pull requests...",
        messageType: "info",
      });

      // Fetch branches and PRs in parallel
      const [branchesResult, prsResult] = await Promise.all([
        // Fetch all branches
        (async () => {
          let branches = [];
          let page = 1;
          const perPage = 100;

          while (true) {
            const { data } = await fetchWithRetry(() =>
              octokit.rest.repos.listBranches({
                owner,
                repo,
                per_page: perPage,
                page: page,
              })
            );

            if (data.length === 0) break;
            branches = branches.concat(data);

            sendProgress({
              type: "progress",
              status: `Fetched ${branches.length} branches...`,
              message: `Fetched ${data.length} branches from page ${page} (total: ${branches.length})`,
              messageType: "info",
            });

            if (data.length < perPage) break;
            page++;
          }
          return branches;
        })(),

        // Fetch all pull requests
        (async () => {
          let pullRequests = [];
          let page = 1;
          const perPage = 100;

          while (true) {
            const { data } = await fetchWithRetry(() =>
              octokit.rest.pulls.list({
                owner,
                repo,
                state: "all",
                sort: "created",
                direction: "desc",
                per_page: perPage,
                page: page,
              })
            );

            if (data.length === 0) break;
            pullRequests = pullRequests.concat(data);

            sendProgress({
              type: "progress",
              status: `Fetched ${pullRequests.length} pull requests...`,
              message: `Fetched ${data.length} PRs from page ${page} (total: ${pullRequests.length})`,
              messageType: "info",
            });

            if (data.length < perPage) break;
            page++;
          }
          return pullRequests;
        })(),
      ]);

      allBranches = branchesResult;
      allPullRequests = prsResult;

      syncResults.performance.fetchTime = Date.now() - fetchStart;

      sendProgress({
        type: "progress",
        status: "Data fetch completed",
        message: `Fetch completed in ${syncResults.performance.fetchTime}ms - Branches: ${allBranches.length}, PRs: ${allPullRequests.length}`,
        messageType: "success",
      });

      if (allBranches.length === 0) {
        sendProgress({
          type: "complete",
          message: "No branches found in repository",
          totalBranches: 0,
          successful: 0,
          failed: 0,
        });
        res.end();
        return;
      }
    } catch (error) {
      console.error("Error fetching data:", error.message);
      sendProgress({
        type: "progress",
        status: "Data fetch failed",
        message: `Failed to fetch repository data: ${error.message}`,
        messageType: "error",
      });
      res.end();
      return;
    }

    // Apply date filtering if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      const originalCount = allBranches.length;

      allBranches = allBranches.filter((branch) => {
        const commitDate =
          branch?.commit?.commit?.author?.date &&
          new Date(branch.commit.commit.author.date);
        if (start && commitDate < start) return false;
        if (end && commitDate > end) return false;
        return true;
      });

      sendProgress({
        type: "progress",
        status: "Date filtering applied",
        message: `Date filtering applied: ${originalCount} → ${allBranches.length} branches`,
        messageType: "info",
      });
    }

    // Create PR lookup map for O(1) access
    const prMap = new Map();
    allPullRequests.forEach((pr) => prMap.set(pr.head.ref, pr));

    // Process branches in optimized batches with concurrency control
    const processStart = Date.now();
    const semaphore = new Array(maxConcurrency).fill(null);
    let semaphoreIndex = 0;

    const processBatch = async (batch, batchIndex) => {
      // Wait for semaphore slot
      await new Promise((resolve) => {
        const checkSlot = () => {
          if (semaphore[semaphoreIndex] === null) {
            semaphore[semaphoreIndex] = true;
            resolve();
          } else {
            setTimeout(checkSlot, 10);
          }
        };
        checkSlot();
      });

      const currentSemaphoreIndex = semaphoreIndex;
      semaphoreIndex = (semaphoreIndex + 1) % maxConcurrency;

      try {
        sendProgress({
          type: "progress",
          status: `Processing batch ${batchIndex + 1}`,
          message: `Processing batch ${batchIndex + 1}/${Math.ceil(
            allBranches.length / batchSize
          )} (${batch.length} branches)`,
          messageType: "info",
        });

        const branchPromises = batch.map(async (branch) => {
          try {
            const pr = prMap.get(branch.name);

            // Minimal commit data fetching - only get essential info
            let commits = [];
            let commitData = branch.commit;

            try {
              // Only fetch first page of commits for performance
              const response = await fetchWithRetry(() =>
                octokit.rest.repos.listCommits({
                  owner,
                  repo,
                  sha: branch.commit.sha,
                  per_page: 10, // Reduced from 100 for performance
                })
              );
              commits = response.data;
            } catch (error) {
              // Use fallback data if commit fetch fails
              console.warn(
                `Failed to fetch commits for ${branch.name}, using fallback`
              );
              syncResults.warnings.push(
                `Limited commit data for ${branch.name}`
              );
            }

            // Extract user info with fallbacks
            let userId = "unknown";
            let userName = "Unknown User";

            if (commitData?.author?.login) {
              userId = commitData.author.login;
              userName = commitData.author.login;
            } else if (commitData?.commit?.author?.name) {
              userName = commitData.commit.author.name;
              userId = userName.toLowerCase().replace(/\s+/g, "-");
            } else if (pr?.user?.login) {
              userId = pr.user.login;
              userName = pr.user.login;
            } else if (commits.length > 0) {
              userId = commits[0].author.login;
              userName = commits[0].author.login;
            }

            // Extract task information from branch name
            const taskInfo = extractTaskFromBranchName(branch.name);
            const taskId = taskInfo.taskId;
            const taskDescription = taskInfo.taskDescription;
            if (!taskInfo.taskId && !taskInfo.taskDescription) {
              return { success: false, error: "No task information found" };
            }

            // Build branch data
            const branchData = {
              branchName: branch.name,
              userId: userId,
              userName: userName,
              repository: repo,
              createdAt: commitData?.commit?.author?.date || new Date(),
              updatedAt: new Date(),
              status: pr ? (pr.merged_at ? "merged" : "active") : "active",
              stages: {
                created:
                  commitData?.commit?.author?.date ||
                  commits[commits.length - 1]?.commit?.author?.date ||
                  new Date(),
                firstCommit:
                  commits.length > 0
                    ? commits[commits.length - 1]?.commit?.author?.date
                    : null,
                prCreated: pr?.created_at || null,
                reviewStarted: pr?.updated_at || null,
                merged: pr?.merged_at || null,
                deployed: null,
              },
              metrics: {
                commits: commits.length || 0,
                additions: pr?.additions || 0,
                deletions: pr?.deletions || 0,
                filesChanged: pr?.changed_files || 0,
                reviewers: pr?.requested_reviewers?.map((r) => r.login) || [],
                comments: pr?.comments || 0,
              },
              taskId: taskId,
              taskDescription: taskDescription,
            };

            // Calculate waiting times with better date handling
            const createdDate = branchData.stages.created;
            const prCreatedDate = branchData.stages.prCreated;
            const mergedDate = branchData.stages.merged;
            const deployedDate = branchData.stages.deployed;

            branchData.waitingTimes = {
              development: calculateWaitingTime(createdDate, prCreatedDate),
              review: calculateWaitingTime(prCreatedDate, mergedDate),
              deployment: calculateWaitingTime(mergedDate, deployedDate),
              total: calculateWaitingTime(
                createdDate,
                mergedDate || new Date()
              ),
            };

            // Update task statistics if a task ID was found
            if (taskId) {
              await updateTaskStats(taskId, taskDescription, branchData);
            }

            return { success: true, branchData, userId };
          } catch (error) {
            console.error(
              `Error processing branch ${branch.name}:`,
              error.message
            );
            return {
              success: false,
              error: `Error processing branch ${branch.name}: ${error.message}`,
              branchName: branch.name,
            };
          }
        });

        return await Promise.all(branchPromises);
      } finally {
        // Release semaphore slot
        semaphore[currentSemaphoreIndex] = null;
      }
    };

    // Process all branches in batches
    const batchResults = [];
    for (let i = 0; i < allBranches.length; i += batchSize) {
      const batch = allBranches.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize);

      sendProgress({
        type: "progress",
        status: `Processing batch ${batchIndex + 1}/${Math.ceil(
          allBranches.length / batchSize
        )}`,
        message: `Processing batch ${batchIndex + 1}/${Math.ceil(
          allBranches.length / batchSize
        )} (${batch.length} branches)`,
        messageType: "info",
        processed: syncResults.branchesProcessed,
        successful: syncResults.branchesSuccessful,
        failed: syncResults.branchesFailed,
        total: allBranches.length,
      });

      const batchResult = await processBatch(batch, batchIndex);
      batchResults.push(...batchResult);

      syncResults.branchesProcessed += batch.length;

      // Small delay between batches to prevent overwhelming the API
      if (i + batchSize < allBranches.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    syncResults.performance.processTime = Date.now() - processStart;

    // Bulk database operations for better performance
    const dbStart = Date.now();
    const successfulBranches = batchResults.filter((r) => r.success);
    const failedBranches = batchResults.filter((r) => !r.success);

    sendProgress({
      type: "progress",
      status: "Saving to database...",
      message: `Saving ${successfulBranches.length} branches to database...`,
      messageType: "info",
    });

    // Batch upsert branches
    if (successfulBranches.length > 0) {
      try {
        const bulkOps = successfulBranches.map(({ branchData }) => ({
          updateOne: {
            filter: { branchName: branchData.branchName, repository: repo },
            update: { $set: branchData },
            upsert: true,
          },
        }));

        // Execute bulk operations in chunks to avoid memory issues
        const chunkSize = 100;
        for (let i = 0; i < bulkOps.length; i += chunkSize) {
          const chunk = bulkOps.slice(i, i + chunkSize);
          await Branch.bulkWrite(chunk, { ordered: false });

          sendProgress({
            type: "progress",
            status: `Saving batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(
              bulkOps.length / chunkSize
            )}`,
            message: `Saved batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(
              bulkOps.length / chunkSize
            )} to database`,
            messageType: "success",
          });
        }

        syncResults.branchesSuccessful = successfulBranches.length;

        // Batch update user stats
        const userIds = [...new Set(successfulBranches.map((b) => b.userId))];

        sendProgress({
          type: "progress",
          status: "Updating user statistics...",
          message: `Updating stats for ${userIds.length} users...`,
          messageType: "info",
        });

        await updateUserStatsBulk(userIds);

        sendProgress({
          type: "progress",
          status: "User statistics updated",
          message: `Updated statistics for ${userIds.length} users`,
          messageType: "success",
        });
      } catch (error) {
        console.error("Database bulk operation error:", error);
        syncResults.errors.push(`Database operation failed: ${error.message}`);

        sendProgress({
          type: "progress",
          status: "Database error",
          message: `Database operation failed: ${error.message}`,
          messageType: "error",
        });
      }
    }

    // Record failed branches
    syncResults.branchesFailed = failedBranches.length;
    syncResults.errors.push(...failedBranches.map((f) => f.error));

    syncResults.performance.dbTime = Date.now() - dbStart;
    syncResults.performance.totalTime =
      Date.now() - syncResults.performance.startTime;

    // Generate final report
    const finalMessage = `Optimized sync completed for ${owner}/${repo}. Processed: ${syncResults.branchesProcessed}, Successful: ${syncResults.branchesSuccessful}, Failed: ${syncResults.branchesFailed}`;

    console.log(finalMessage);
    console.log(
      `Performance: Total: ${syncResults.performance.totalTime}ms, Fetch: ${syncResults.performance.fetchTime}ms, Process: ${syncResults.performance.processTime}ms, DB: ${syncResults.performance.dbTime}ms`
    );
    console.log("Errors:", syncResults.errors.length);
    console.log("Warnings:", syncResults.warnings.length);

    sendProgress({
      type: "complete",
      message: finalMessage,
      totalBranches: syncResults.branchesProcessed,
      successful: syncResults.branchesSuccessful,
      failed: syncResults.branchesFailed,
      performance: {
        ...syncResults.performance,
        branchesPerSecond: Math.round(
          syncResults.branchesSuccessful /
            (syncResults.performance.totalTime / 1000)
        ),
        avgTimePerBranch: Math.round(
          syncResults.performance.totalTime / syncResults.branchesProcessed
        ),
      },
    });

    res.end();
  } catch (error) {
    console.error("Critical sync error:", error);

    res.write(
      JSON.stringify({
        type: "progress",
        status: "Critical error",
        message: `Critical sync error: ${error.message}`,
        messageType: "error",
      }) + "\n"
    );

    res.end();
  }
});

// Add bulk sync endpoint for multiple repositories
app.post("/api/sync/bulk", async (req, res) => {
  try {
    const { repositories } = req.body; // Array of {owner, repo} objects

    if (!repositories || !Array.isArray(repositories)) {
      return res.status(400).json({
        error: "Repositories array is required",
        success: false,
      });
    }

    const results = [];

    for (const { owner, repo } of repositories) {
      try {
        console.log(`Starting bulk sync for ${owner}/${repo}...`);

        // Call the single sync logic
        const syncResponse = await fetch(`http://localhost:${PORT}/api/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo }),
        });

        const syncResult = await syncResponse.json();
        results.push({
          repository: `${owner}/${repo}`,
          ...syncResult,
        });
      } catch (error) {
        results.push({
          repository: `${owner}/${repo}`,
          error: error.message,
          success: false,
        });
      }
    }

    res.json({
      message: `Bulk sync completed for ${repositories.length} repositories`,
      results,
      success: results.some((r) => r.success),
    });
  } catch (error) {
    console.error("Bulk sync error:", error);
    res.status(500).json({
      error: `Bulk sync error: ${error.message}`,
      success: false,
    });
  }
});

// Add sync status endpoint
app.get("/api/sync/status", async (req, res) => {
  try {
    const totalBranches = await Branch.countDocuments();
    const totalUsers = await User.countDocuments();
    const lastSyncedBranch = await Branch.findOne().sort({ updatedAt: -1 });

    res.json({
      totalBranches,
      totalUsers,
      lastSync: lastSyncedBranch?.updatedAt || null,
      status: totalBranches > 0 ? "synced" : "not_synced",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get sync status" });
  }
});

// Dashboard summary endpoint
app.get("/api/dashboard/summary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchQuery = {};
    if (startDate && endDate) {
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const summary = await Branch.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalBranches: { $sum: 1 },
          activeBranches: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          mergedBranches: {
            $sum: { $cond: [{ $eq: ["$status", "merged"] }, 1, 0] },
          },
          totalCommits: { $sum: "$metrics.commits" },
          totalAdditions: { $sum: "$metrics.additions" },
          totalDeletions: { $sum: "$metrics.deletions" },
          avgWaitingTime: { $avg: "$waitingTimes.total" },
        },
      },
    ]);

    const topUsers = await Branch.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$userId",
          userName: { $first: "$userName" },
          branchCount: { $sum: 1 },
          totalCommits: { $sum: "$metrics.commits" },
          avgWaitingTime: { $avg: "$waitingTimes.total" },
        },
      },
      { $sort: { branchCount: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      summary: summary[0] || {},
      topUsers,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

// Get all tasks with analytics
app.get("/api/tasks", async (req, res) => {
  try {
    const { startDate, endDate, status, assignee, repository } = req.query;

    let query = {};
    if (startDate && endDate) {
      query["timeline.startTime"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (status) {
      query.status = status;
    }
    if (assignee) {
      query.assignees = assignee;
    }
    if (repository) {
      query.repositories = repository;
    }

    const tasks = await Task.find(query).sort({ updatedAt: -1 }).limit(100);

    // Calculate summary metrics
    const summary = {
      totalTasks: tasks.length,
      activeTasks: tasks.filter((t) => t.status === "active").length,
      inReviewTasks: tasks.filter((t) => t.status === "in_review").length,
      completedTasks: tasks.filter((t) => t.status === "completed").length,
      avgWorkTime:
        tasks.length > 0
          ? tasks.reduce((sum, t) => sum + (t.metrics.totalWorkTime || 0), 0) /
            tasks.length
          : 0,
    };

    res.json({ tasks, summary });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Get detailed task information
app.get("/api/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findOne({ taskId });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Get all branches for this task
    const branches = await Branch.find({ taskId }).sort({ createdAt: -1 });

    // Get user details for assignees
    const assigneeDetails = await User.find({
      userId: { $in: task.assignees },
    }).select("userId userName stats");

    // Calculate detailed metrics
    const branchMetrics = {
      byRepository: {},
      byAssignee: {},
      timeline: [],
    };

    // Group branches by repository
    branches.forEach((branch) => {
      if (!branchMetrics.byRepository[branch.repository]) {
        branchMetrics.byRepository[branch.repository] = {
          total: 0,
          active: 0,
          merged: 0,
          commits: 0,
          workTime: 0,
        };
      }
      const repo = branchMetrics.byRepository[branch.repository];
      repo.total++;
      if (branch.status === "active") repo.active++;
      if (branch.status === "merged") repo.merged++;
      repo.commits += branch.metrics.commits || 0;
      repo.workTime += branch.waitingTimes.total || 0;
    });

    // Group branches by assignee
    branches.forEach((branch) => {
      if (!branchMetrics.byAssignee[branch.userId]) {
        branchMetrics.byAssignee[branch.userId] = {
          userName: branch.userName,
          total: 0,
          active: 0,
          merged: 0,
          commits: 0,
          workTime: 0,
          repositories: new Set(),
        };
      }
      const assignee = branchMetrics.byAssignee[branch.userId];
      assignee.total++;
      if (branch.status === "active") assignee.active++;
      if (branch.status === "merged") assignee.merged++;
      assignee.commits += branch.metrics.commits || 0;
      assignee.workTime += branch.waitingTimes.total || 0;
      assignee.repositories.add(branch.repository);
    });

    // Convert repository sets to arrays
    Object.keys(branchMetrics.byAssignee).forEach((userId) => {
      branchMetrics.byAssignee[userId].repositories = Array.from(
        branchMetrics.byAssignee[userId].repositories
      );
    });

    // Create timeline
    branchMetrics.timeline = branches
      .map((branch) => ({
        branchName: branch.branchName,
        repository: branch.repository,
        assignee: branch.userName,
        created: branch.stages.created,
        prCreated: branch.stages.prCreated,
        merged: branch.stages.merged,
        status: branch.status,
        workTime: branch.waitingTimes.total,
      }))
      .sort((a, b) => new Date(a.created) - new Date(b.created));

    res.json({
      task,
      branches,
      assigneeDetails,
      metrics: branchMetrics,
    });
  } catch (error) {
    console.error("Error fetching task details:", error);
    res.status(500).json({ error: "Failed to fetch task details" });
  }
});

// Get task analytics dashboard
app.get("/api/tasks/analytics/dashboard", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchQuery = {};
    if (startDate && endDate) {
      matchQuery["timeline.startTime"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get task summary statistics
    const taskSummary = await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          activeTasks: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          inReviewTasks: {
            $sum: { $cond: [{ $eq: ["$status", "in_review"] }, 1, 0] },
          },
          completedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          avgWorkTime: { $avg: "$metrics.totalWorkTime" },
          totalCommits: { $sum: "$metrics.totalCommits" },
          totalBranches: { $sum: "$totalBranches" },
        },
      },
    ]);

    // Get top tasks by work time
    const topTasksByWorkTime = await Task.find(matchQuery)
      .sort({ "metrics.totalWorkTime": -1 })
      .limit(10)
      .select(
        "taskId taskName metrics.totalWorkTime status assignees repositories"
      );

    // Get tasks by assignee
    const tasksByAssignee = await Task.aggregate([
      { $match: matchQuery },
      { $unwind: "$assignees" },
      {
        $group: {
          _id: "$assignees",
          taskCount: { $sum: 1 },
          avgWorkTime: { $avg: "$metrics.totalWorkTime" },
          totalCommits: { $sum: "$metrics.totalCommits" },
          completedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
      { $sort: { taskCount: -1 } },
      { $limit: 10 },
    ]);

    // Get tasks by repository
    const tasksByRepository = await Task.aggregate([
      { $match: matchQuery },
      { $unwind: "$repositories" },
      {
        $group: {
          _id: "$repositories",
          taskCount: { $sum: 1 },
          avgWorkTime: { $avg: "$metrics.totalWorkTime" },
          totalBranches: { $sum: "$totalBranches" },
        },
      },
      { $sort: { taskCount: -1 } },
      { $limit: 10 },
    ]);

    // Get user names for assignees
    const assigneeIds = tasksByAssignee.map((t) => t._id);
    const users = await User.find({ userId: { $in: assigneeIds } }).select(
      "userId userName"
    );

    const userMap = new Map(users.map((u) => [u.userId, u.userName]));

    tasksByAssignee.forEach((task) => {
      task.userName = userMap.get(task._id) || task._id;
    });

    res.json({
      summary: taskSummary[0] || {},
      topTasksByWorkTime,
      tasksByAssignee,
      tasksByRepository,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error("Error fetching task analytics:", error);
    res.status(500).json({ error: "Failed to fetch task analytics" });
  }
});

// Get branches for a specific task
app.get("/api/tasks/:taskId/branches", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { repository, assignee } = req.query;

    let query = { taskId };
    if (repository) query.repository = repository;
    if (assignee) query.userId = assignee;

    const branches = await Branch.find(query).sort({ createdAt: -1 });

    res.json({ branches, taskId });
  } catch (error) {
    console.error("Error fetching task branches:", error);
    res.status(500).json({ error: "Failed to fetch task branches" });
  }
});

// Get branches for specific users
app.get("/api/users/branches/specific", async (req, res) => {
  try {
    const { users, startDate, endDate, status, taskId } = req.query;

    // Default users if not provided
    const targetUsers = users
      ? users.split(",")
      : ["KlentyDhanush", "KlentyAswinjoseph"];

    let query = { userId: { $in: targetUsers } };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (status) {
      query.status = status;
    }

    if (taskId) {
      query.taskId = taskId;
    }

    const branches = await Branch.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    // Calculate summary metrics for each user
    const userSummaries = {};
    targetUsers.forEach((userId) => {
      const userBranches = branches.filter((b) => b.userId === userId);
      userSummaries[userId] = {
        totalBranches: userBranches.length,
        activeBranches: userBranches.filter((b) => b.status === "active")
          .length,
        mergedBranches: userBranches.filter((b) => b.status === "merged")
          .length,
        totalCommits: userBranches.reduce(
          (sum, b) => sum + (b.metrics.commits || 0),
          0
        ),
        totalAdditions: userBranches.reduce(
          (sum, b) => sum + (b.metrics.additions || 0),
          0
        ),
        totalDeletions: userBranches.reduce(
          (sum, b) => sum + (b.metrics.deletions || 0),
          0
        ),
        avgWaitingTime:
          userBranches.length > 0
            ? userBranches.reduce(
                (sum, b) => sum + (b.waitingTimes.total || 0),
                0
              ) / userBranches.length
            : 0,
        avgDevelopmentTime:
          userBranches.length > 0
            ? userBranches.reduce(
                (sum, b) => sum + (b.waitingTimes.development || 0),
                0
              ) / userBranches.length
            : 0,
        avgReviewTime:
          userBranches.length > 0
            ? userBranches.reduce(
                (sum, b) => sum + (b.waitingTimes.review || 0),
                0
              ) / userBranches.length
            : 0,
      };
    });

    res.json({
      branches,
      userSummaries,
      totalBranches: branches.length,
      targetUsers,
    });
  } catch (error) {
    console.error("Error fetching specific user branches:", error);
    res.status(500).json({ error: "Failed to fetch user branches" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Git Tracker API running on port ${PORT}`);
});

export default app;

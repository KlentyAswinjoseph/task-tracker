import { Router, Request, Response } from "express";
import { Task } from "../models/Task";
import { Branch } from "../models/Branch";
import { Squad } from "../models/Squad";
import { Octokit } from "@octokit/rest";
import { extractTaskFromBranchName } from "../utils/taskUtils";
import { TaskService } from "../services/TaskService";
import { calculateWaitingTime } from "../utils/timeUtils";

const router = Router();

// GET /api/tasks/analytics/dashboard - Task analytics dashboard
router.get(
  "/analytics/dashboard",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, squadId } = req.query;

      // Build date filter
      let dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter["timeline.startTime"] = {};
        if (startDate)
          dateFilter["timeline.startTime"].$gte = new Date(startDate as string);
        if (endDate)
          dateFilter["timeline.startTime"].$lte = new Date(endDate as string);
      }

      // Build squad filter
      let squadFilter: any = {};
      if (squadId && squadId !== 'all') {
        try {
          const squad = await Squad.findById(squadId);
          if (squad) {
            const squadMemberIds = squad.members.map(member => member.userId);
            squadFilter.assignees = { $in: squadMemberIds };
          }
        } catch (error) {
          console.error('Error fetching squad for task filtering:', error);
        }
      }

      // Combine filters
      const filter = { ...dateFilter, ...squadFilter };

      // Get task summary
      const taskSummary = await Task.aggregate([
        { $match: filter },
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

      const summary = taskSummary[0] || {
        totalTasks: 0,
        activeTasks: 0,
        inReviewTasks: 0,
        completedTasks: 0,
        avgWorkTime: 0,
        totalCommits: 0,
        totalBranches: 0,
      };

      // Get top tasks by work time
      const topTasksByWorkTime = await Task.find(filter)
        .sort({ "metrics.totalWorkTime": -1 })
        .limit(10)
        .select(
          "taskId taskName status activeBranches mergedBranches totalBranches metrics.totalWorkTime repositories assignees"
        );

      // Get tasks by assignee
      const tasksByAssignee = await Task.aggregate([
        { $match: filter },
        { $unwind: "$assignees" },
        {
          $group: {
            _id: "$assignees",
            assignee: { $first: "$assignees" },
            count: { $sum: 1 },
            totalWorkTime: { $sum: "$metrics.totalWorkTime" },
            completedTasks: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Get tasks by repository
      const tasksByRepository = await Task.aggregate([
        { $match: filter },
        { $unwind: "$repositories" },
        {
          $group: {
            _id: "$repositories",
            repository: { $first: "$repositories" },
            count: { $sum: 1 },
            avgWorkTime: { $avg: "$metrics.totalWorkTime" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      res.json({
        summary,
        topTasksByWorkTime,
        tasksByAssignee,
        tasksByRepository,
      });
    } catch (error) {
      console.error("Task analytics dashboard error:", error);
      res.status(500).json({
        error: "Failed to fetch task analytics dashboard",
        success: false,
      });
    }
  }
);

// GET /api/tasks - Get tasks with filters
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, status, assignee } = req.query;

    // Build filters
    let filter: any = {};

    if (startDate || endDate) {
      filter["timeline.startTime"] = {};
      if (startDate)
        filter["timeline.startTime"].$gte = new Date(startDate as string);
      if (endDate)
        filter["timeline.startTime"].$lte = new Date(endDate as string);
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (assignee) {
      filter.assignees = { $in: [assignee] };
    }

    const tasks = await Task.find(filter).sort({ updatedAt: -1 }).limit(100);

    res.json({ tasks });
  } catch (error) {
    console.error("Tasks error:", error);
    res.status(500).json({
      error: "Failed to fetch tasks",
      success: false,
    });
  }
});

// GET /api/tasks/:taskId - Get individual task details
router.get("/:taskId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    // Get task details
    const task = await Task.findOne({ taskId });
    if (!task) {
      res.status(404).json({
        error: "Task not found",
        success: false,
      });
      return;
    }

    // Get branches for this task
    const branches = await Branch.find({ taskId }).sort({ createdAt: -1 });

    // Get assignee details
    const assigneeDetails = task.assignees.map((assignee) => ({
      userName: assignee,
      userId: assignee,
    }));

    // Build metrics
    const metrics = {
      timeline: branches.map((branch) => ({
        branchName: branch.branchName,
        repository: branch.repository,
        assignee: branch.userName,
        status: branch.status,
        workTime: branch.waitingTimes?.total || 0,
        created: branch.createdAt.toISOString(),
      })),
      byRepository: branches.reduce((acc: any, branch) => {
        if (!acc[branch.repository]) {
          acc[branch.repository] = {
            total: 0,
            active: 0,
            merged: 0,
            workTime: 0,
          };
        }
        acc[branch.repository].total += 1;
        if (branch.status === "active") acc[branch.repository].active += 1;
        if (branch.status === "merged") acc[branch.repository].merged += 1;
        acc[branch.repository].workTime += branch.waitingTimes?.total || 0;
        return acc;
      }, {}),
    };

    res.json({
      task,
      branches,
      assigneeDetails,
      metrics,
    });
  } catch (error) {
    console.error("Task details error:", error);
    res.status(500).json({
      error: "Failed to fetch task details",
      success: false,
    });
  }
});

// POST /api/tasks/:taskId/sync - Sync branches for a specific task across an organization or selected branches
router.post(
  "/:taskId/sync",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params as { taskId: string };
      const {
        organization = "klenty",
        owner,
        limitToRepos,
        includeBranchKeys,
        limitToBranches,
        batchSize = 50,
      }: {
        organization?: string;
        owner?: string;
        limitToRepos?: string[];
        includeBranchKeys?: Array<{ repository: string; branchName: string }>;
        limitToBranches?: Record<string, string[]>; // repo => branch names
        batchSize?: number;
      } = req.body || {};

      // Streaming headers
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const sendProgress = (data: any) =>
        res.write(JSON.stringify(data) + "\n");

      const octokit = new Octokit({ auth: process.env.PAT_TOKEN });

      // Retry helper
      async function fetchWithRetry<T>(
        fn: () => Promise<T>,
        retries = 3
      ): Promise<T> {
        let lastErr: any;
        for (let i = 0; i < retries; i++) {
          try {
            return await fn();
          } catch (err: any) {
            lastErr = err;
            if (
              err.status === 403 &&
              (err.message || "").includes("rate limit")
            ) {
              await new Promise((r) => setTimeout(r, 60000));
            } else {
              await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
            }
          }
        }
        throw lastErr;
      }

      /**
       * =======================
       * INCLUDE BRANCH KEYS MODE
       * =======================
       */
      if (Array.isArray(includeBranchKeys) && includeBranchKeys.length > 0) {
        sendProgress({
          type: "progress",
          status: "Syncing selected branches...",
          message: `${includeBranchKeys.length} branches selected`,
          messageType: "info",
        });

        let processed = 0,
          successful = 0,
          failed = 0;
        const batchSizeLimit = 5;

        for (let i = 0; i < includeBranchKeys.length; i += batchSizeLimit) {
          const batch = includeBranchKeys.slice(i, i + batchSizeLimit);

          await Promise.allSettled(
            batch.map(async ({ repository, branchName }) => {
              try {
                const existing = await Branch.findOne({
                  branchName,
                  repository,
                });

                // Direct PR fetch for this branch
                let pr = null;
                try {
                  const prResp = await fetchWithRetry(() =>
                    octokit.rest.pulls.list({
                      owner: owner || organization,
                      repo: repository,
                      state: "all",
                      head: `${owner || organization}:${branchName}`,
                      per_page: 1,
                    })
                  );
                  pr = prResp.data?.[0] || null;
                } catch (_) {}

                // Fetch detailed PR data to access additions/deletions/changed_files/comments
                let prDetails: any = null;
                try {
                  if (pr?.number) {
                    const details = await fetchWithRetry(() =>
                      octokit.rest.pulls.get({
                        owner: owner || organization,
                        repo: repository,
                        pull_number: pr.number,
                      })
                    );
                    prDetails = (details as any).data;
                  }
                } catch (_) {}

                // Commits for this branch
                let commits: any[] = [];
                try {
                  const commitsResp = await fetchWithRetry(() =>
                    octokit.rest.repos.listCommits({
                      owner: owner || organization,
                      repo: repository,
                      sha: branchName,
                      per_page: 10,
                    })
                  );
                  commits = (commitsResp as any).data || [];
                } catch (_) {}

                // User info
                let userId = existing?.userId || "unknown";
                let userName = existing?.userName || "Unknown";
                if (pr?.user?.login) {
                  userId = pr.user.login;
                  userName = pr.user.login;
                } else if (commits[0]?.author?.login) {
                  userId = commits[0].author.login;
                  userName = commits[0].author.login;
                }

                const commitDate = new Date(
                  existing?.createdAt ||
                    commits[0]?.commit?.author?.date ||
                    Date.now()
                );

                const branchData: any = {
                  branchName,
                  userId,
                  userName,
                  repository,
                  createdAt: commitDate,
                  updatedAt: new Date(),
                  status: pr
                    ? pr.merged_at
                      ? "merged"
                      : "active"
                    : existing?.status || "active",
                  stages: {
                    created: commitDate,
                    firstCommit:
                      commits[commits.length - 1]?.commit?.author?.date ||
                      existing?.stages?.firstCommit ||
                      null,
                    prCreated:
                      pr?.created_at || existing?.stages?.prCreated || null,
                    reviewStarted:
                      pr?.updated_at || existing?.stages?.reviewStarted || null,
                    merged: pr?.merged_at || existing?.stages?.merged || null,
                    deployed: existing?.stages?.deployed || null,
                  },
                  metrics: {
                    commits:
                      commits.length || existing?.metrics?.commits || 0,
                    additions:
                      prDetails?.additions || existing?.metrics?.additions || 0,
                    deletions:
                      prDetails?.deletions || existing?.metrics?.deletions || 0,
                    filesChanged:
                      prDetails?.changed_files || existing?.metrics?.filesChanged || 0,
                    reviewers:
                      (prDetails?.requested_reviewers?.map((r: any) => r.login) ||
                        pr?.requested_reviewers?.map((r: any) => r.login) ||
                        existing?.metrics?.reviewers ||
                        []),
                    comments:
                      prDetails?.comments || existing?.metrics?.comments || 0,
                  },
                  taskId,
                  taskDescription: existing?.taskDescription || null,
                };

                // Waiting times
                const { created, prCreated, merged, deployed } =
                  branchData.stages;
                branchData.waitingTimes = {
                  development: calculateWaitingTime(created, prCreated),
                  review: calculateWaitingTime(prCreated, merged),
                  deployment: deployed
                    ? calculateWaitingTime(merged, deployed)
                    : null,
                  total: calculateWaitingTime(
                    created,
                    merged || new Date()
                  ),
                };

                await Branch.findOneAndUpdate(
                  { branchName, repository },
                  branchData,
                  { upsert: true, new: true }
                );

                successful++;
              } catch {
                failed++;
              } finally {
                processed++;
                sendProgress({
                  type: "progress",
                  status: "Processing selected branches",
                  processed,
                  successful,
                  failed,
                  messageType: "info",
                });
              }
            })
          );

          if (i + batchSizeLimit < includeBranchKeys.length) {
            await new Promise((r) => setTimeout(r, 200));
          }
        }

        await TaskService.updateTaskStats(taskId, null);

        sendProgress({
          type: "complete",
          status: "Selected branch sync complete",
          totalBranches: processed,
          successful,
          failed,
        });
        res.end();
        return;
      }

      /**
       * =======================
       * ORG-WIDE MODE
       * =======================
       */
      sendProgress({
        type: "progress",
        status: "Fetching repositories...",
        message: `Organization: ${organization}`,
        messageType: "info",
      });

      const repos: Array<{ name: string }> = [];
      let page = 1;
      const perPage = 100;
      while (true) {
        const resp = await fetchWithRetry(() =>
          octokit.rest.repos.listForOrg({
            org: organization,
            per_page: perPage,
            page,
          })
        );
        const data = (resp as any).data || [];
        if (!data.length) break;
        data.forEach((r: any) => {
          if (!limitToRepos || limitToRepos.includes(r.name)) {
            repos.push({ name: r.name });
          }
        });
        if (data.length < perPage) break;
        page++;
      }

      sendProgress({
        type: "progress",
        status: "Repositories fetched",
        message: `Total repos to scan: ${repos.length}`,
        messageType: "info",
      });

      let processedRepos = 0,
        processedBranches = 0,
        successful = 0,
        failed = 0;

      for (const { name: repo } of repos) {
        try {
          sendProgress({
            type: "progress",
            status: `Scanning repo: ${repo}`,
            messageType: "info",
          });

          // Get branches (specific or all)
          let allBranches: any[] = [];
          const repoSpecificBranches = limitToBranches?.[repo];
          if (Array.isArray(repoSpecificBranches) && repoSpecificBranches.length > 0) {
            // Fetch only the requested branches
            const results = await Promise.allSettled(
              repoSpecificBranches.map(async (branch) => {
                const resp = await fetchWithRetry(() =>
                  octokit.rest.repos.getBranch({
                    owner: organization,
                    repo,
                    branch,
                  })
                );
                // Normalize to a listBranches-like shape used below
                const data: any = (resp as any).data;
                return { name: data.name, commit: data.commit };
              })
            );
            allBranches = results
              .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
              .map((r) => r.value);
          } else {
            // Fallback to all branches pagination
            let bPage = 1;
            while (true) {
              const bResp = await fetchWithRetry(() =>
                octokit.rest.repos.listBranches({
                  owner: organization,
                  repo,
                  per_page: perPage,
                  page: bPage,
                })
              );
              const bData = (bResp as any).data || [];
              if (!bData.length) break;
              allBranches = allBranches.concat(bData);
              if (bData.length < perPage) break;
              bPage++;
            }
          }

          // Filter task-related branches
          const candidateBranches = allBranches.filter((b: any) => {
            const { taskId: extracted } = extractTaskFromBranchName(
              b?.name || ""
            );
            return (
              extracted && extracted.toUpperCase() === taskId.toUpperCase()
            );
          });

          // Process in batches
          for (let i = 0; i < candidateBranches.length; i += batchSize) {
            const batch = candidateBranches.slice(i, i + batchSize);

            await Promise.allSettled(
              batch.map(async (b: any) => {
                try {
                  const branchName = b.name;

                  // Direct PR fetch for branch
                  let pr = null;
                  try {
                    const prResp = await fetchWithRetry(() =>
                      octokit.rest.pulls.list({
                        owner: organization,
                        repo,
                        state: "all",
                        head: `${organization}:${branchName}`,
                        per_page: 1,
                      })
                    );
                    pr = prResp.data?.[0] || null;
                  } catch (_) {}

                  // Fetch detailed PR data for metrics
                  let prDetails: any = null;
                  try {
                    if (pr?.number) {
                      const details = await fetchWithRetry(() =>
                        octokit.rest.pulls.get({
                          owner: organization,
                          repo,
                          pull_number: pr.number,
                        })
                      );
                      prDetails = (details as any).data;
                    }
                  } catch (_) {}

                  // Commits
                  let commits: any[] = [];
                  try {
                    const cResp = await fetchWithRetry(() =>
                      octokit.rest.repos.listCommits({
                        owner: organization,
                        repo,
                        sha: branchName,
                        per_page: 10,
                      })
                    );
                    commits = (cResp as any).data || [];
                  } catch (_) {}

                  // User info
                  let userId = "unknown";
                  let userName = "Unknown";
                  if (pr?.user?.login) {
                    userId = pr.user.login;
                    userName = pr.user.login;
                  } else if (commits[0]?.author?.login) {
                    userId = commits[0].author.login;
                    userName = commits[0].author.login;
                  }

                  const { taskDescription } = extractTaskFromBranchName(
                    branchName
                  );

                  const commitDate = new Date(
                    b?.commit?.commit?.author?.date ||
                      commits[0]?.commit?.author?.date ||
                      Date.now()
                  );

                  const branchData: any = {
                    branchName,
                    userId,
                    userName,
                    repository: repo,
                    createdAt: commitDate,
                    updatedAt: new Date(),
                    status: pr
                      ? pr.merged_at
                        ? "merged"
                        : "active"
                      : "active",
                    stages: {
                      created: commitDate,
                      firstCommit:
                        commits[commits.length - 1]?.commit?.author?.date ||
                        null,
                      prCreated: pr?.created_at || null,
                      reviewStarted: pr?.updated_at || null,
                      merged: pr?.merged_at || null,
                      deployed: null,
                    },
                    metrics: {
                      commits: commits.length || 0,
                      additions: prDetails?.additions || 0,
                      deletions: prDetails?.deletions || 0,
                      filesChanged: prDetails?.changed_files || 0,
                      reviewers:
                        (prDetails?.requested_reviewers?.map((r: any) => r.login) ||
                        pr?.requested_reviewers?.map((r: any) => r.login) ||
                        []),
                      comments: prDetails?.comments || 0,
                    },
                    taskId,
                    taskDescription,
                  };

                  const { created, prCreated, merged, deployed } =
                    branchData.stages;
                  branchData.waitingTimes = {
                    development: calculateWaitingTime(created, prCreated),
                    review: calculateWaitingTime(prCreated, merged),
                    deployment: deployed
                      ? calculateWaitingTime(merged, deployed)
                      : null,
                    total: calculateWaitingTime(
                      created,
                      merged || new Date()
                    ),
                  };

                  await Branch.findOneAndUpdate(
                    { branchName, repository: repo },
                    branchData,
                    { upsert: true, new: true }
                  );

                  successful++;
                  processedBranches++;
                } catch {
                  failed++;
                  processedBranches++;
                }
              })
            );

            sendProgress({
              type: "progress",
              status: `Processed ${processedBranches} branches`,
              successful,
              failed,
              messageType: "info",
            });

            if (i + batchSize < candidateBranches.length) {
              await new Promise((r) => setTimeout(r, 100));
            }
          }

          processedRepos++;
        } catch {
          processedRepos++;
        }
      }

      await TaskService.updateTaskStats(taskId, null);

      sendProgress({
        type: "complete",
        status: "Task sync complete",
        totalRepos: processedRepos,
        totalBranches: processedBranches,
        successful,
        failed,
        messageType: "success",
      });
      res.end();
    } catch (error: any) {
      res.write(
        JSON.stringify({
          type: "progress",
          status: "Critical error",
          message: error.message,
          messageType: "error",
        }) + "\n"
      );
      res.end();
    }
  }
);


export default router;

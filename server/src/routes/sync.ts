import { Router, Request, Response } from "express";
import { Branch } from "../models/Branch";
import { User } from "../models/User";
import { extractTaskFromBranchName } from "../../src/utils/taskUtils";
import { calculateWaitingTime } from "../utils/timeUtils";
import { Octokit } from "@octokit/rest";

const router = Router();

const octokit = new Octokit({
  auth: process.env.PAT_TOKEN,
});

// POST /api/sync - Sync repository data
// router.post('/', async (req: Request, res: Response): Promise<void> => {
//   try {
//     const {
//       owner,
//       repo,
//       batchSize = 50,
//       maxConcurrency = 10,
//       startDate,
//       endDate,
//     } = req.body;

//     if (!owner || !repo) {
//       res.status(400).json({
//         error: "Owner and repository are required",
//         success: false,
//       });
//       return;
//     }

//     console.log(`Starting sync for ${owner}/${repo}...`);

//     // Set up streaming response for real-time progress
//     res.setHeader("Content-Type", "text/plain");
//     res.setHeader("Transfer-Encoding", "chunked");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");

//     const sendProgress = (data: any) => {
//       res.write(JSON.stringify(data) + "\n");
//     };

//     // Start sync process
//     sendProgress({
//       type: "progress",
//       status: "Validating repository access...",
//       message: "Checking repository permissions...",
//       messageType: "info"
//     });

//     // Simulate repository validation
//     await new Promise(resolve => setTimeout(resolve, 1000));

//     sendProgress({
//       type: "progress",
//       status: "Repository access confirmed",
//       message: `Repository ${owner}/${repo} is accessible`,
//       messageType: "success"
//     });

//     // Simulate data fetching
//     sendProgress({
//       type: "progress",
//       status: "Fetching repository data...",
//       message: "Fetching branches and pull requests...",
//       messageType: "info"
//     });

//     await new Promise(resolve => setTimeout(resolve, 2000));

//     // Simulate processing batches
//     const totalBranches = 150; // Simulated
//     for (let i = 0; i < totalBranches; i += batchSize) {
//       const processed = Math.min(i + batchSize, totalBranches);

//       sendProgress({
//         type: "progress",
//         status: `Processed ${processed} branches...`,
//         message: `Processing batch ${Math.floor(i / batchSize) + 1}`,
//         messageType: "info"
//       });

//       await new Promise(resolve => setTimeout(resolve, 500));
//     }

//     // Complete sync
//     sendProgress({
//       type: "complete",
//       status: "Sync completed successfully",
//       message: `Successfully synchronized ${totalBranches} branches from ${owner}/${repo}`,
//       messageType: "success",
//       results: {
//         branchesProcessed: totalBranches,
//         branchesSuccessful: totalBranches,
//         branchesFailed: 0,
//         performance: {
//           totalTime: 5000,
//           avgTimePerBranch: 33
//         }
//       }
//     });

//     res.end();

//   } catch (error) {
//     console.error('Sync error:', error);
//     res.status(500).json({
//       error: 'Sync failed',
//       success: false,
//       message: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      owner,
      repo,
      batchSize = 50,
      maxConcurrency = 10,
      startDate,
      endDate,
    }: {
      owner: string;
      repo: string;
      batchSize?: number;
      maxConcurrency?: number;
      startDate?: string;
      endDate?: string;
    } = req.body;

    if (!owner || !repo) {
      res
        .status(400)
        .json({ error: "Owner and repository are required", success: false });
      return;
    }

    // Streaming/keep-alive headers
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendProgress = (data: any) => res.write(JSON.stringify(data) + "\n");

    //--- Helpers ---
    async function fetchWithRetry<T>(
      fn: () => Promise<T>,
      retries: number = 3
    ): Promise<T> {
      let lastErr;
      for (let i = 0; i < retries; i++) {
        try {
          return await fn();
        } catch (err: any) {
          lastErr = err;
          if (err.status === 403 && err.message?.includes("rate limit")) {
            // Basic sleep for rate-limit
            await new Promise((resolve) => setTimeout(resolve, 60000));
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      }
      throw lastErr;
    }

    // --- Validate repo ---
    sendProgress({
      type: "progress",
      status: "Validating repository access...",
      message: "Checking repository permissions...",
      messageType: "info",
    });
    try {
      await fetchWithRetry(() => octokit.rest.repos.get({ owner, repo }));
      sendProgress({
        type: "progress",
        status: "Repository access confirmed",
        message: `Repository ${owner}/${repo} is accessible`,
        messageType: "success",
      });
    } catch (err: any) {
      sendProgress({
        type: "progress",
        status: "Repository access failed",
        message: `Repository ${owner}/${repo} not found or not accessible. Please check permissions.`,
        messageType: "error",
      });
      res.end();
      return;
    }

    // --- Fetch all branches ---
    sendProgress({
      type: "progress",
      status: "Fetching branches...",
      message: "Fetching branches in pages...",
      messageType: "info",
    });
    let allBranches: any[] = [];
    try {
      let page = 1;
      const perPage = 100;
      while (true) {
        const response = await fetchWithRetry(() =>
          octokit.rest.repos.listBranches({
            owner,
            repo,
            per_page: perPage,
            page,
          })
        );
        const { data } = response as { data: any[] };
        if (!data.length) break;
        allBranches = allBranches.concat(data);
        sendProgress({
          type: "progress",
          status: `Fetched ${allBranches.length} branches...`,
          message: `Fetched ${data.length} branches from page ${page} (total: ${allBranches.length})`,
          messageType: "info",
        });
        if (data.length < perPage) break;
        page++;
      }
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
    } catch (err: any) {
      sendProgress({
        type: "progress",
        status: "Branches fetch failed",
        message: `Failed to fetch branches: ${err.message}`,
        messageType: "error",
      });
      res.end();
      return;
    }

    // --- Fetch all PRs (can be parallelized with branches above) ---
    sendProgress({
      type: "progress",
      status: "Fetching pull requests...",
      message: "Fetching pull requests in pages...",
      messageType: "info",
    });
    let allPullRequests: any[] = [];
    try {
      let page = 1;
      const perPage = 100;
      while (true) {
        const response = await fetchWithRetry(() =>
          octokit.rest.pulls.list({
            owner,
            repo,
            state: "all",
            sort: "created",
            direction: "desc",
            per_page: perPage,
            page,
          })
        );
        const { data } = response as { data: any[] };
        if (!data.length) break;
        allPullRequests = allPullRequests.concat(data);
        sendProgress({
          type: "progress",
          status: `Fetched ${allPullRequests.length} pull requests...`,
          message: `Fetched ${data.length} PRs from page ${page} (total: ${allPullRequests.length})`,
          messageType: "info",
        });
        if (data.length < perPage) break;
        page++;
      }
    } catch (err: any) {
      sendProgress({
        type: "progress",
        status: "PR fetch failed",
        message: `Failed to fetch pull requests: ${err.message}`,
        messageType: "error",
      });
      res.end();
      return;
    }

    // --- Date filtering (by branch commit author date) ---
    let filteredBranches = allBranches;
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      const origCount = allBranches.length;
      filteredBranches = allBranches.filter((branch) => {
        // Handle different possible commit date structures
        let commitDate = null;
        if (branch?.commit?.commit?.author?.date) {
          commitDate = new Date(branch.commit.commit.author.date);
        } else if (branch?.commit?.author?.date) {
          commitDate = new Date(branch.commit.author.date);
        } else if (branch?.commit?.committer?.date) {
          commitDate = new Date(branch.commit.committer.date);
        }

        if (!commitDate) return false;
        if (start && commitDate < start) return false;
        if (end && commitDate > end) return false;
        return true;
      });
      sendProgress({
        type: "progress",
        status: "Date filtering applied",
        message: `Filtered branches from ${origCount} to ${filteredBranches.length}`,
        messageType: "info",
      });
    }

    // --- Create PR lookup (ref => PR) ---
    const prMap = new Map<string, any>();
    allPullRequests.forEach((pr) => prMap.set(pr.head.ref, pr));

    // --- Batch/concurrent processing of branches ---
    sendProgress({
      type: "progress",
      status: "Processing branches...",
      message: "Processing branches in batches...",
      messageType: "info",
    });

    let branchesProcessed = 0,
      branchesSuccessful = 0,
      branchesFailed = 0;
    const processResults: any[] = [];

    const processBatch = async (batch: any[], batchIndex: number) => {
      // Would use a proper concurrency pool for big jobs
      return Promise.all(
        batch.map(async (branch, idx) => {
          try {
            // Debug: Log branch structure for first few branches
            if (batchIndex === 0 && idx < 3) {
              console.log(
                `Branch ${idx + 1} structure:`,
                JSON.stringify(branch, null, 2)
              );
            }

            const pr = prMap.get(branch.name);

            // Fetch commits for branch.head (limit for performance)
            let commits: any[] = [];
            try {
              // Handle different possible commit SHA structures
              let commitSha = branch.commit?.sha;
              if (!commitSha && branch.commit?.url) {
                // Extract SHA from URL if needed
                const urlParts = branch.commit.url.split("/");
                commitSha = urlParts[urlParts.length - 1];
              }

              if (commitSha) {
                const response = await fetchWithRetry(() =>
                  octokit.rest.repos.listCommits({
                    owner,
                    repo,
                    sha: commitSha,
                    per_page: 10,
                  })
                );
                const { data } = response as { data: any[] };
                commits = data;
              }
            } catch (_) {
              // Ignore commit fetch errors
            }

            // User info (fallbacks) - handle different possible structures
            let userId = "unknown";
            let userName = "Unknown";

            if (pr?.user?.login) {
              userId = pr.user.login;
              userName = pr.user.login;
            } else if (branch?.commit?.author?.login) {
              userId = branch.commit.author.login;
              userName = branch.commit.author.login;
            } else if (branch?.commit?.committer?.login) {
              userId = branch.commit.committer.login;
              userName = branch.commit.committer.login;
            } else if (commits[0]?.author?.login) {
              userId = commits[0].author.login;
              userName = commits[0].author.login;
            }

            // Extract taskId/taskDescription
            const { taskId, taskDescription } = extractTaskFromBranchName(
              branch.name
            );

            // Get commit date with fallbacks
            let commitDate = null;
            if (branch?.commit?.commit?.author?.date) {
              commitDate = new Date(branch.commit.commit.author.date);
            } else if (branch?.commit?.author?.date) {
              commitDate = new Date(branch.commit.author.date);
            } else if (branch?.commit?.committer?.date) {
              commitDate = new Date(branch.commit.committer.date);
            }else if(commits[0].commit?.author?.date) {
              commitDate = new Date(commits[0].commit.author.date);

            } else {
              commitDate = new Date();
            }

            // Build branch data
            const branchData = {
              branchName: branch.name,
              userId,
              userName,
              repository: repo,
              createdAt: commitDate,
              updatedAt: new Date(),
              status: pr ? (pr.merged_at ? "merged" : "active") : "active",
              stages: {
                created: commitDate,
                firstCommit:
                  commits[commits.length - 1]?.commit?.author?.date || null,
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
                reviewers:
                  pr?.requested_reviewers?.map((r: any) => r.login) || [],
                comments: pr?.comments || 0,
              },
              taskId,
              taskDescription,
              waitingTimes: {},
            };

            // Calculate waiting times
            const { created, prCreated, merged, deployed } = branchData.stages;
            branchData["waitingTimes"] = {
              development: calculateWaitingTime(created, prCreated),
              review: calculateWaitingTime(prCreated, merged),
              deployment: deployed
                ? calculateWaitingTime(merged, deployed)
                : null,
              total: calculateWaitingTime(created, merged || new Date()),
            } as any;

            // Debug: Log successful branch processing
            if (batchIndex === 0 && idx < 3) {
              console.log(`Successfully processed branch: ${branch.name}`, {
                taskId,
                taskDescription,
                userId,
                userName,
                commitsCount: commits.length,
              });
            }

            branchesSuccessful++;
            return { success: true, branchData, userId };
          } catch (err: any) {
            console.error(
              `Error processing branch ${branch.name}:`,
              err.message
            );
            branchesFailed++;
            return {
              success: false,
              error: err.message,
              branchName: branch.name,
            };
          }
        })
      );
    };

    // Process all filteredBranches in batches
    for (let i = 0; i < filteredBranches.length; i += batchSize) {
      const batch = filteredBranches.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize);

      sendProgress({
        type: "progress",
        status: `Processing batch ${batchIndex + 1}/${Math.ceil(
          filteredBranches.length / batchSize
        )}`,
        message: `Processing batch of ${batch.length} branches`,
        messageType: "info",
        processed: branchesProcessed,
        successful: branchesSuccessful,
        failed: branchesFailed,
        total: filteredBranches.length,
      });

      const results = await processBatch(batch, batchIndex);
      processResults.push(...results);

      branchesProcessed += batch.length;
      // Small delay to avoid rate limit
      if (i + batchSize < filteredBranches.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // --- (Optional) Save to DB, update users/stats here ---

    // Example:
    // const successfulBranches = processResults.filter(r => r.success);
    // await Branch.bulkWrite(successfulBranches.map(...));

    // --- Final Summary ---
    sendProgress({
      type: "complete",
      status: "Sync completed successfully",
      message: `Processed: ${branchesProcessed}, Successful: ${branchesSuccessful}, Failed: ${branchesFailed}`,
      totalBranches: branchesProcessed,
      successful: branchesSuccessful,
      failed: branchesFailed,
    });

    res.end();
  } catch (error: any) {
    // Generic error reporting
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
// GET /api/sync/status - Get sync status
router.get("/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const totalBranches = await Branch.countDocuments();
    const totalUsers = await User.countDocuments();
    const lastSyncedBranch = await Branch.findOne().sort({ updatedAt: -1 });

    res.json({
      totalBranches,
      totalUsers,
      lastSync: lastSyncedBranch?.updatedAt || null,
      status: totalBranches > 0 ? "synced" : "not_synced",
      server: "new-backend",
      version: "1.0.0",
    });
  } catch (error) {
    console.error("Sync status error:", error);
    res.status(500).json({
      error: "Failed to get sync status",
      success: false,
    });
  }
});

// POST /api/sync/users - Sync users from Git organization
router.post("/users", async (req: Request, res: Response): Promise<void> => {
  try {
    const { organization } = req.body;

    if (!organization) {
      res.status(400).json({
        error: "Organization name is required",
        success: false,
      });
      return;
    }

    console.log(`Starting user sync for organization: ${organization}`);

    // Set up streaming response for real-time progress
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendProgress = (data: any) => res.write(JSON.stringify(data) + "\n");

    sendProgress({
      type: "progress",
      status: "Starting user sync...",
      message: `Fetching users from organization: ${organization}`,
      messageType: "info"
    });

    // Fetch organization members
    let allMembers: any[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      try {
        const response = await octokit.orgs.listMembers({
          org: organization,
          per_page: perPage,
          page: page,
        });

        if (response.data.length === 0) break;

        allMembers.push(...response.data);
        
        sendProgress({
          type: "progress",
          status: `Fetched ${allMembers.length} users...`,
          message: `Retrieved page ${page} of organization members`,
          messageType: "info"
        });

        page++;
        
        // Rate limiting - small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        if (error.status === 404) {
          sendProgress({
            type: "progress",
            status: "Organization not found",
            message: `Organization '${organization}' not found or not accessible`,
            messageType: "error"
          });
          res.end();
          return;
        }
        throw error;
      }
    }

    sendProgress({
      type: "progress",
      status: "Processing users...",
      message: `Processing ${allMembers.length} users from organization`,
      messageType: "info"
    });

    // Process and save users
    let usersCreated = 0;
    let usersUpdated = 0;
    let usersSkipped = 0;

    for (const member of allMembers) {
      try {
        // Get detailed user info
        const userResponse = await octokit.users.getByUsername({
          username: member.login,
        });

        const userData = userResponse.data;
        
        // Check if user already exists
        const existingUser = await User.findOne({ userId: userData.login });
        
        if (existingUser) {
          // Update existing user
          existingUser.userName = userData.name || userData.login;
          existingUser.email = userData.email || undefined;
          existingUser.avatar = userData.avatar_url;
          existingUser.lastActivity = new Date();
          await existingUser.save();
          usersUpdated++;
        } else {
          // Create new user
          const newUser = new User({
            userId: userData.login,
            userName: userData.name || userData.login,
            email: userData.email || undefined,
            avatar: userData.avatar_url,
            stats: {
              totalBranches: 0,
              activeBranches: 0,
              mergedBranches: 0,
              avgWaitingTime: 0,
              totalCommits: 0,
              totalAdditions: 0,
              totalDeletions: 0,
            },
            lastActivity: new Date(),
          });
          await newUser.save();
          usersCreated++;
        }

        sendProgress({
          type: "progress",
          status: `Processed ${usersCreated + usersUpdated + usersSkipped}/${allMembers.length} users...`,
          message: `Processing user: ${userData.login}`,
          messageType: "info"
        });

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        console.error(`Error processing user ${member.login}:`, error.message);
        usersSkipped++;
      }
    }

    sendProgress({
      type: "complete",
      status: "User sync completed successfully",
      message: `Sync completed: ${usersCreated} created, ${usersUpdated} updated, ${usersSkipped} skipped`,
      messageType: "success",
      results: {
        totalUsers: allMembers.length,
        usersCreated,
        usersUpdated,
        usersSkipped,
      }
    });

    res.end();
  } catch (error: any) {
    console.error("User sync error:", error);
    res.write(
      JSON.stringify({
        type: "progress",
        status: "Critical error",
        message: `User sync error: ${error.message}`,
        messageType: "error",
      }) + "\n"
    );
    res.end();
  }
});

export default router;

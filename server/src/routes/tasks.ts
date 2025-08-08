import { Router, Request, Response } from "express";
import { Task } from "../models/Task";
import { Branch } from "../models/Branch";

const router = Router();

// GET /api/tasks/analytics/dashboard - Task analytics dashboard
router.get(
  "/analytics/dashboard",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      // Build date filter
      let dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter["timeline.startTime"] = {};
        if (startDate)
          dateFilter["timeline.startTime"].$gte = new Date(startDate as string);
        if (endDate)
          dateFilter["timeline.startTime"].$lte = new Date(endDate as string);
      }

      // Get task summary
      const taskSummary = await Task.aggregate([
        { $match: dateFilter },
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
      const topTasksByWorkTime = await Task.find(dateFilter)
        .sort({ "metrics.totalWorkTime": -1 })
        .limit(10)
        .select(
          "taskId taskName status activeBranches mergedBranches totalBranches metrics.totalWorkTime repositories assignees"
        );

      // Get tasks by assignee
      const tasksByAssignee = await Task.aggregate([
        { $match: dateFilter },
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
        { $match: dateFilter },
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

export default router;

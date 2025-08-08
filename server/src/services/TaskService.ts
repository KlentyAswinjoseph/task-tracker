import { Task } from '../models/Task';
import { Branch } from '../models/Branch';
import { calculateWaitingTime } from '../utils/timeUtils';
import { TaskDashboardResponse, TaskAnalytics, Task as ITask } from '@shared/types';

export class TaskService {
  static async updateTaskStats(
    taskId: string, 
    taskDescription: string | null, 
    branchData?: any
  ): Promise<void> {
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
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const startTime = sortedBranches[0]?.stages.created || sortedBranches[0]?.createdAt;
      const reviewStartTime = sortedBranches.find((b) => b.stages?.prCreated)?.stages.prCreated;
      const mergedBranches = allTaskBranches.filter((b) => b.stages?.merged);
      const endTime = mergedBranches.length > 0
        ? mergedBranches.sort(
            (a, b) => new Date(b.stages.merged!).getTime() - new Date(a.stages.merged!).getTime()
          )[0].stages.merged
        : undefined;

      // Calculate work times from database data
      const totalWorkTime = endTime && startTime 
        ? calculateWaitingTime(startTime, endTime) 
        : undefined;
      const avgWorkTime = allTaskBranches.length > 0
        ? allTaskBranches.reduce(
            (sum, b) => sum + (b.waitingTimes?.total || 0),
            0
          ) / allTaskBranches.length
        : 0;

      // Determine task status from database data
      let status: 'active' | 'in_review' | 'completed' | 'on_hold' = 'active';
      if (allTaskBranches.every((b) => b.status === 'merged')) {
        status = 'completed';
      } else if (
        allTaskBranches.some((b) => b.stages?.prCreated && !b.stages?.merged)
      ) {
        status = 'in_review';
      }

      // Use existing task data if available, otherwise use input data
      const taskName = task?.taskName || taskDescription || taskId;
      const existingRepositories = task?.repositories || [];
      const existingAssignees = task?.assignees || [];

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
        activeBranches: allTaskBranches.filter((b) => b.status === 'active').length,
        mergedBranches: allTaskBranches.filter((b) => b.status === 'merged').length,
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
  }

  static async getTaskDashboard(
    startDate?: string,
    endDate?: string
  ): Promise<TaskDashboardResponse> {
    try {
      const dateFilter: any = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const taskDocs = await Task.find(dateFilter);
      const tasks = taskDocs.map(doc => doc.toObject()) as ITask[];

      const summary = {
        totalTasks: tasks.length,
        activeTasks: tasks.filter(t => t.status === 'active').length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        inReviewTasks: tasks.filter(t => t.status === 'in_review').length,
        avgWorkTime: tasks.reduce((sum, t) => sum + (t.metrics.avgWorkTime || 0), 0) / (tasks.length || 1),
        totalWorkTime: tasks.reduce((sum, t) => sum + (t.metrics.totalWorkTime || 0), 0),
      };

      const topTasksByWorkTime = tasks
        .filter(t => t.metrics.totalWorkTime)
        .sort((a, b) => (b.metrics.totalWorkTime || 0) - (a.metrics.totalWorkTime || 0))
        .slice(0, 10);

      // Group tasks by assignee
      const tasksByAssigneeMap = new Map<string, { count: number; totalWorkTime: number }>();
      tasks.forEach(task => {
        task.assignees.forEach(assignee => {
          const existing = tasksByAssigneeMap.get(assignee) || { count: 0, totalWorkTime: 0 };
          tasksByAssigneeMap.set(assignee, {
            count: existing.count + 1,
            totalWorkTime: existing.totalWorkTime + (task.metrics.totalWorkTime || 0),
          });
        });
      });

      const tasksByAssignee = Array.from(tasksByAssigneeMap.entries()).map(([assignee, data]) => ({
        assignee,
        count: data.count,
        totalWorkTime: data.totalWorkTime,
      }));

      // Group tasks by repository
      const tasksByRepositoryMap = new Map<string, { count: number; totalWorkTime: number }>();
      tasks.forEach(task => {
        task.repositories.forEach(repo => {
          const existing = tasksByRepositoryMap.get(repo) || { count: 0, totalWorkTime: 0 };
          tasksByRepositoryMap.set(repo, {
            count: existing.count + 1,
            totalWorkTime: existing.totalWorkTime + (task.metrics.totalWorkTime || 0),
          });
        });
      });

      const tasksByRepository = Array.from(tasksByRepositoryMap.entries()).map(([repository, data]) => ({
        repository,
        count: data.count,
        avgWorkTime: data.totalWorkTime / data.count,
      }));

      return {
        summary,
        topTasksByWorkTime,
        tasksByAssignee,
        tasksByRepository,
      };
    } catch (error) {
      console.error('Error getting task dashboard:', error);
      throw error;
    }
  }

  static async getTaskAnalytics(taskId: string): Promise<TaskAnalytics | null> {
    try {
      const task = await Task.findOne({ taskId });
      const branches = await Branch.find({ taskId });

      if (!task || branches.length === 0) {
        return null;
      }

      // Calculate efficiency metrics
      const totalTime = task.metrics.totalWorkTime || 0;
      const developmentTime = branches.reduce((sum, b) => sum + (b.waitingTimes.development || 0), 0);
      const reviewTime = branches.reduce((sum, b) => sum + (b.waitingTimes.review || 0), 0);
      const deploymentTime = branches.reduce((sum, b) => sum + (b.waitingTimes.deployment || 0), 0);

      const developmentEfficiency = developmentTime > 0 ? (task.metrics.totalCommits / developmentTime) : 0;
      const reviewEfficiency = reviewTime > 0 ? (branches.length / reviewTime) : 0;
      const overallEfficiency = totalTime > 0 ? (task.metrics.totalCommits / totalTime) : 0;

      // Calculate quality metrics
      const totalChanges = task.metrics.totalAdditions + task.metrics.totalDeletions;
      const codeQualityScore = Math.min(10, (task.metrics.totalAdditions / Math.max(totalChanges, 1)) * 10);
      
      const reviewCoverage = branches.filter(b => b.stages.prCreated).length / branches.length * 100;
      const mergeSuccessRate = branches.filter(b => b.status === 'merged').length / branches.length * 100;

      // Mock some additional metrics (in real implementation, these would be calculated from actual data)
      const weeklyProgress = Math.min(100, (task.mergedBranches / task.totalBranches) * 100);
      const monthlyTrend = task.status === 'completed' ? 'Completed' : 'In Progress';

      return {
        developmentEfficiency,
        reviewEfficiency,
        overallEfficiency,
        developmentTime,
        reviewTime,
        deploymentTime,
        totalTime,
        codeQualityScore,
        reviewCoverage,
        mergeSuccessRate,
        weeklyProgress,
        monthlyTrend,
      };
    } catch (error) {
      console.error('Error getting task analytics:', error);
      return null;
    }
  }
} 
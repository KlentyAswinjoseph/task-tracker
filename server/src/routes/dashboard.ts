import { Router, Request, Response } from 'express';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { Squad } from '../models/Squad';

const router = Router();

// GET /api/dashboard/summary - Dashboard summary with filters
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, status, squadId } = req.query;

    // Build date filter
    let dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.updatedAt = {};
      if (startDate) dateFilter.updatedAt.$gte = new Date(startDate as string);
      if (endDate) dateFilter.updatedAt.$lte = new Date(endDate as string);
    }

    // Build status filter
    let statusFilter: any = {};
    if (status && status !== 'all') {
      statusFilter.status = status;
    }

    // Build squad filter
    let squadFilter: any = {};
    if (squadId && squadId !== 'all') {
      try {
        const squad = await Squad.findById(squadId);
        if (squad) {
          const squadMemberIds = squad.members.map(member => member.userId);
          squadFilter.userId = { $in: squadMemberIds };
        }
      } catch (error) {
        console.error('Error fetching squad for filtering:', error);
      }
    }

    // Combine filters
    const filter = { ...dateFilter, ...statusFilter, ...squadFilter };

    // Get branch summary
    const totalBranches = await Branch.countDocuments(filter);
    const activeBranches = await Branch.countDocuments({ ...filter, status: 'active' });
    const mergedBranches = await Branch.countDocuments({ ...filter, status: 'merged' });
    
    // Calculate commits and waiting time
    const branchStats = await Branch.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCommits: { $sum: '$metrics.commits' },
          totalAdditions: { $sum: '$metrics.additions' },
          totalDeletions: { $sum: '$metrics.deletions' },
          avgWaitingTime: { $avg: '$waitingTimes.total' }
        }
      }
    ]);

    const stats = branchStats[0] || {
      totalCommits: 0,
      totalAdditions: 0,
      totalDeletions: 0,
      avgWaitingTime: 0
    };

    // Get top users with branch stats
    const topUsers = await Branch.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userName' },
          branchCount: { $sum: 1 },
          totalCommits: { $sum: '$metrics.commits' },
          avgWaitingTime: { $avg: '$waitingTimes.total' }
        }
      },
      { $sort: { branchCount: -1 } },
      { $limit: 10 }
    ]);

    // Calculate date range
    const dateRange: any = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const summary = {
      _id: null,
      totalBranches,
      activeBranches,
      mergedBranches,
      totalCommits: stats.totalCommits,
      totalAdditions: stats.totalAdditions,
      totalDeletions: stats.totalDeletions,
      avgWaitingTime: stats.avgWaitingTime || 0
    };

    res.json({
      summary,
      topUsers,
      dateRange
    });

  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard summary',
      success: false
    });
  }
});

export default router; 
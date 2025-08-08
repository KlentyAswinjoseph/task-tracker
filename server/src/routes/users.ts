import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { Branch } from '../models/Branch';

const router = Router();

// GET /api/users - Get users with filters
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, status } = req.query;

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

    // Combine filters
    const filter = { ...dateFilter, ...statusFilter };

    // Get users with their branch stats
    const users = await Branch.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userName' },
          branchCount: { $sum: 1 },
          totalCommits: { $sum: '$metrics.commits' },
          avgWaitingTime: { $avg: '$waitingTimes.total' },
          activeBranches: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          mergedBranches: {
            $sum: { $cond: [{ $eq: ['$status', 'merged'] }, 1, 0] }
          }
        }
      },
      { $sort: { branchCount: -1 } }
    ]);

    // Format users to match expected structure
    const formattedUsers = users.map(user => ({
      userId: user._id,
      userName: user.userName,
      branchCount: user.branchCount,
      totalCommits: user.totalCommits,
      avgWaitingTime: user.avgWaitingTime || 0,
      activeBranches: user.activeBranches,
      mergedBranches: user.mergedBranches
    }));

    res.json(formattedUsers);

  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      success: false
    });
  }
});

export default router; 
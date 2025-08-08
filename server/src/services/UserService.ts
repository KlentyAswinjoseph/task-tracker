import { User } from '../models/User';
import { Branch } from '../models/Branch';
import { DashboardResponse, User as IUser, LegacyUser } from '@shared/types';

export class UserService {
  static async updateUserStats(userId: string): Promise<void> {
    try {
      const userBranches = await Branch.find({ userId });
      const stats = {
        totalBranches: userBranches.length,
        activeBranches: userBranches.filter(b => b.status === 'active').length,
        mergedBranches: userBranches.filter(b => b.status === 'merged').length,
        avgWaitingTime: userBranches.reduce((sum, b) => sum + (b.waitingTimes?.total || 0), 0) / (userBranches.length || 1),
        totalCommits: userBranches.reduce((sum, b) => sum + (b.metrics?.commits || 0), 0),
        totalAdditions: userBranches.reduce((sum, b) => sum + (b.metrics?.additions || 0), 0),
        totalDeletions: userBranches.reduce((sum, b) => sum + (b.metrics?.deletions || 0), 0),
      };

      const userName = userBranches[0]?.userName || userId;

      await User.findOneAndUpdate(
        { userId },
        { 
          userId, 
          userName, 
          stats,
          lastActivity: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log(`Updated user stats for ${userId}`);
    } catch (error) {
      console.error(`Error updating user stats for ${userId}:`, error);
    }
  }

  static async updateUserStatsBulk(userIds: string[]): Promise<void> {
    try {
      const updatePromises = userIds.map(userId => this.updateUserStats(userId));
      await Promise.all(updatePromises);
      console.log(`Updated stats for ${userIds.length} users`);
    } catch (error) {
      console.error('Error in bulk user stats update:', error);
      throw error;
    }
  }

  static async getUsersWithFilter(
    startDate?: string,
    endDate?: string,
    status?: string
  ): Promise<IUser[]> {
    try {
      const pipeline: any[] = [
        {
          $lookup: {
            from: 'branches',
            localField: 'userId',
            foreignField: 'userId',
            as: 'branches',
          },
        },
        {
          $addFields: {
            filteredBranches: {
              $filter: {
                input: '$branches',
                as: 'branch',
                cond: {
                  $and: [
                    // Only apply date filter if both dates are provided
                    ...(startDate && endDate
                      ? [
                          {
                            $and: [
                              {
                                $gte: ['$$branch.createdAt', new Date(startDate)],
                              },
                              { $lte: ['$$branch.createdAt', new Date(endDate)] },
                            ],
                          },
                        ]
                      : []),
                    // Only apply status filter if provided
                    ...(status ? [{ $eq: ['$$branch.status', status] }] : []),
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            'stats.totalBranches': { $size: '$filteredBranches' },
            'stats.activeBranches': {
              $size: {
                $filter: {
                  input: '$filteredBranches',
                  as: 'branch',
                  cond: { $eq: ['$$branch.status', 'active'] },
                },
              },
            },
            'stats.mergedBranches': {
              $size: {
                $filter: {
                  input: '$filteredBranches',
                  as: 'branch',
                  cond: { $eq: ['$$branch.status', 'merged'] },
                },
              },
            },
          },
        },
      ];

      const users = await User.aggregate(pipeline);
      return users as IUser[];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  static async getDashboardSummary(
    startDate?: string,
    endDate?: string,
    status?: string
  ): Promise<DashboardResponse> {
    try {
      const users = await this.getUsersWithFilter(startDate, endDate, status);
      
      // Calculate summary statistics
      const totalUsers = users.length;
      const totalBranches = users.reduce((sum, u) => sum + u.stats.totalBranches, 0);
      const activeBranches = users.reduce((sum, u) => sum + u.stats.activeBranches, 0);
      const mergedBranches = users.reduce((sum, u) => sum + u.stats.mergedBranches, 0);
      const avgWaitingTime = users.reduce((sum, u) => sum + u.stats.avgWaitingTime, 0) / (totalUsers || 1);
      const totalCommits = users.reduce((sum, u) => sum + u.stats.totalCommits, 0);

      // Get repository statistics
      const branches = await Branch.find(
        startDate && endDate 
          ? { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
          : {}
      );
      
      const repositoryMap = new Map<string, number>();
      branches.forEach(branch => {
        repositoryMap.set(branch.repository, (repositoryMap.get(branch.repository) || 0) + 1);
      });

      const topRepositories = Array.from(repositoryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get top users
      const topUsers = users
        .sort((a, b) => b.stats.totalBranches - a.stats.totalBranches)
        .slice(0, 10)  

      return {
        summary: {
          totalUsers,
          totalBranches,
          activeBranches,
          mergedBranches,
          avgWaitingTime,
          totalCommits,
          topRepositories,
        },
        topUsers : topUsers as unknown as LegacyUser[],
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw error;
    }
  }
} 
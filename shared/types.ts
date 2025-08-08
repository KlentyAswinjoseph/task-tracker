export interface BranchStages {
  created: Date;
  firstCommit?: Date;
  prCreated?: Date;
  reviewStarted?: Date;
  merged?: Date;
  deployed?: Date;
}

export interface BranchWaitingTimes {
  development?: number; // hours
  review?: number; // hours
  deployment?: number; // hours
  total?: number; // hours
}

export interface BranchMetrics {
  commits: number;
  additions: number;
  deletions: number;
  filesChanged: number;
  reviewers: string[];
  comments: number;
}

export interface Branch {
  _id?: string;
  branchName: string;
  userId: string;
  userName: string;
  repository: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'merged' | 'deleted' | 'deployed';
  stages: BranchStages;
  waitingTimes: BranchWaitingTimes;
  metrics: BranchMetrics;
  taskId?: string;
  taskDescription?: string;
  tags: string[];
}

export interface UserStats {
  totalBranches: number;
  activeBranches: number;
  mergedBranches: number;
  avgWaitingTime: number;
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
}

export interface User {
  _id?: string;
  userId: string;
  userName: string;
  email?: string;
  avatar?: string;
  stats: UserStats;
  lastActivity: Date;
}

export interface TaskTimeline {
  startTime?: Date;
  endTime?: Date;
  reviewStartTime?: Date;
  mergedTime?: Date;
}

export interface TaskMetrics {
  totalWorkTime?: number;
  avgWorkTime?: number;
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  totalFilesChanged: number;
}

export interface Task {
  _id?: string;
  taskId: string;
  taskName: string;
  totalBranches: number;
  activeBranches: number;
  mergedBranches: number;
  repositories: string[];
  assignees: string[];
  createdAt: Date;
  updatedAt: Date;
  timeline: TaskTimeline;
  metrics: TaskMetrics;
  status: 'active' | 'in_review' | 'completed' | 'on_hold';
}

export interface DashboardSummary {
  _id?: null;
  totalUsers?: number;
  totalBranches: number;
  activeBranches: number;
  mergedBranches: number;
  avgWaitingTime: number;
  totalCommits: number;
  totalAdditions?: number;
  totalDeletions?: number;
  topRepositories?: Array<{ name: string; count: number }>;
}

// Legacy API User format (different from our User interface)
export interface LegacyUser {
  _id: string;
  userName: string;
  branchCount: number;
  totalCommits: number;
  avgWaitingTime: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  topUsers: LegacyUser[];
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

export interface TaskAnalytics {
  developmentEfficiency: number;
  reviewEfficiency: number;
  overallEfficiency: number;
  developmentTime: number;
  reviewTime: number;
  deploymentTime: number;
  totalTime: number;
  codeQualityScore: number;
  reviewCoverage: number;
  mergeSuccessRate: number;
  weeklyProgress: number;
  monthlyTrend: string;
}

export interface TaskDashboardSummary {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  inReviewTasks: number;
  avgWorkTime: number;
  totalWorkTime: number;
}

export interface TaskDashboardResponse {
  summary: TaskDashboardSummary;
  topTasksByWorkTime: Task[];
  tasksByAssignee: Array<{ assignee: string; count: number; totalWorkTime: number }>;
  tasksByRepository: Array<{ repository: string; count: number; avgWorkTime: number }>;
}

export interface ChatMessage {
  message: string;
  sessionId?: string;
  summaryType?: 'task_report' | 'analytics_summary' | 'combined_summary' | 'progress_summary' | 'quality_summary';
}

export interface ChatResponse {
  type: string;
  message: string;
  formattedReport?: string;
  data?: any;
}

export interface SyncRequest {
  owner: string;
  repo: string;
  batchSize?: number;
  maxConcurrency?: number;
  startDate?: string;
  endDate?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Squad Management Types
export interface SquadMember {
  userId: string;
  userName: string;
  email?: string;
  role?: string;
  joinedAt: Date;
}

export interface Squad {
  _id?: string;
  name: string;
  description: string;
  color: string;
  members: SquadMember[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SquadCreateRequest {
  name: string;
  description?: string;
  color?: string;
  createdBy: string;
}

export interface SquadUpdateRequest {
  name?: string;
  description?: string;
  color?: string;
}

export interface SquadMemberRequest {
  memberIds: string[];
}

export interface SquadMemberRoleRequest {
  role: string;
} 
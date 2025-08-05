import moment from 'moment';

export class TaskSummarizer {
  constructor() {
    this.summaryTemplates = {
      task_report: this.generateTaskReport,
      analytics_summary: this.generateAnalyticsSummary,
      combined_summary: this.generateCombinedSummary,
      progress_summary: this.generateProgressSummary,
      quality_summary: this.generateQualitySummary
    };
  }

  generateTaskReport(taskDetails, analytics, taskId) {
    if (!taskDetails) {
      return {
        message: `❌ Task ${taskId} not found in the system.`,
        type: "error",
        data: null
      };
    }

    const status = taskDetails.status || 'unknown';
    const statusEmoji = this.getStatusEmoji(status);
    const totalBranches = taskDetails.totalBranches || 0;
    const activeBranches = taskDetails.activeBranches || 0;
    const mergedBranches = taskDetails.mergedBranches || 0;

    const message = `📋 **Task ${taskId} Summary** ${statusEmoji}

**Task Details:**
• **Name:** ${taskDetails.taskName || 'N/A'}
• **Status:** ${status.toUpperCase()}
• **Total Branches:** ${totalBranches}
• **Active Branches:** ${activeBranches}
• **Merged Branches:** ${mergedBranches}
• **Repositories:** ${(taskDetails.repositories || []).join(', ') || 'N/A'}
• **Assignees:** ${(taskDetails.assignees || []).join(', ') || 'N/A'}

**Key Metrics:**
• **Total Commits:** ${taskDetails.metrics?.totalCommits || 0}
• **Total Changes:** ${(taskDetails.metrics?.totalAdditions || 0) + (taskDetails.metrics?.totalDeletions || 0)}
• **Files Changed:** ${taskDetails.metrics?.totalFilesChanged || 0}
• **Average Work Time:** ${this.formatTime(taskDetails.metrics?.avgWorkTime || 0)}`;

    return {
      message,
      type: "task_report",
      data: {
        taskDetails,
        analytics,
        summary: {
          taskId,
          status,
          totalBranches,
          activeBranches,
          mergedBranches,
          completionRate: totalBranches > 0 ? ((mergedBranches / totalBranches) * 100).toFixed(1) : 0
        }
      }
    };
  }

  generateAnalyticsSummary(taskDetails, analytics, taskId) {
    if (!analytics) {
      return {
        message: `❌ No analytics data available for task ${taskId}.`,
        type: "error",
        data: null
      };
    }

    const efficiency = analytics.overallEfficiency || 0;
    const qualityScore = analytics.codeQualityScore || 0;
    const mergeRate = analytics.mergeSuccessRate || 0;
    const reviewCoverage = analytics.reviewCoverage || 0;

    const message = `📊 **Task ${taskId} Analytics** 📈

**Performance Metrics:**
• **Overall Efficiency:** ${efficiency} (changes/hour)
• **Code Quality Score:** ${qualityScore}/10
• **Merge Success Rate:** ${mergeRate}%
• **Review Coverage:** ${reviewCoverage}%

**Time Breakdown:**
• **Development Time:** ${this.formatTime(analytics.developmentTime || 0)}
• **Review Time:** ${this.formatTime(analytics.reviewTime || 0)}
• **Deployment Time:** ${this.formatTime(analytics.deploymentTime || 0)}
• **Total Time:** ${this.formatTime(analytics.totalTime || 0)}

**Trends:**
• **Weekly Progress:** ${analytics.weeklyProgress || 0}%
• **Monthly Trend:** ${analytics.monthlyTrend || 'Stable'}`;

    return {
      message,
      type: "analytics_summary",
      data: {
        taskDetails,
        analytics,
        summary: {
          taskId,
          efficiency,
          qualityScore,
          mergeRate,
          reviewCoverage,
          totalTime: analytics.totalTime || 0
        }
      }
    };
  }

  generateCombinedSummary(taskDetails, analytics, taskId) {
    if (!taskDetails && !analytics) {
      return {
        message: `❌ No data available for task ${taskId}.`,
        type: "error",
        data: null
      };
    }

    const status = taskDetails?.status || 'unknown';
    const statusEmoji = this.getStatusEmoji(status);
    const totalBranches = taskDetails?.totalBranches || 0;
    const mergedBranches = taskDetails?.mergedBranches || 0;
    const completionRate = totalBranches > 0 ? ((mergedBranches / totalBranches) * 100).toFixed(1) : 0;
    
    const efficiency = analytics?.overallEfficiency || 0;
    const qualityScore = analytics?.codeQualityScore || 0;
    const mergeRate = analytics?.mergeSuccessRate || 0;

    const message = `🎯 **Task ${taskId} Complete Overview** ${statusEmoji}

**Task Status:**
• **Name:** ${taskDetails?.taskName || 'N/A'}
• **Status:** ${status.toUpperCase()}
• **Completion Rate:** ${completionRate}% (${mergedBranches}/${totalBranches} branches)

**Performance Analysis:**
• **Overall Efficiency:** ${efficiency} (changes/hour)
• **Code Quality:** ${qualityScore}/10
• **Merge Success Rate:** ${mergeRate}%
• **Total Work Time:** ${this.formatTime(analytics?.totalTime || 0)}

**Key Metrics:**
• **Total Commits:** ${taskDetails?.metrics?.totalCommits || 0}
• **Total Changes:** ${((taskDetails?.metrics?.totalAdditions || 0) + (taskDetails?.metrics?.totalDeletions || 0))}
• **Files Changed:** ${taskDetails?.metrics?.totalFilesChanged || 0}
• **Repositories:** ${(taskDetails?.repositories || []).join(', ') || 'N/A'}`;

    return {
      message,
      type: "combined_summary",
      data: {
        taskDetails,
        analytics,
        summary: {
          taskId,
          status,
          completionRate,
          efficiency,
          qualityScore,
          mergeRate,
          totalTime: analytics?.totalTime || 0
        }
      }
    };
  }

  generateProgressSummary(taskDetails, analytics, taskId) {
    if (!taskDetails) {
      return {
        message: `❌ No progress data available for task ${taskId}.`,
        type: "error",
        data: null
      };
    }

    const totalBranches = taskDetails.totalBranches || 0;
    const activeBranches = taskDetails.activeBranches || 0;
    const mergedBranches = taskDetails.mergedBranches || 0;
    const completionRate = totalBranches > 0 ? ((mergedBranches / totalBranches) * 100).toFixed(1) : 0;
    const weeklyProgress = analytics?.weeklyProgress || 0;

    const progressBar = this.generateProgressBar(completionRate);

    const message = `📈 **Task ${taskId} Progress Report** 🚀

**Progress Overview:**
${progressBar} ${completionRate}% Complete

**Branch Status:**
• **Total Branches:** ${totalBranches}
• **Active Branches:** ${activeBranches} 🔄
• **Merged Branches:** ${mergedBranches} ✅
• **Remaining:** ${totalBranches - mergedBranches} branches

**Recent Activity:**
• **Weekly Progress:** ${weeklyProgress}%
• **Monthly Trend:** ${analytics?.monthlyTrend || 'Stable'}

**Timeline:**
• **Created:** ${this.formatDate(taskDetails.createdAt)}
• **Last Updated:** ${this.formatDate(taskDetails.updatedAt)}`;

    return {
      message,
      type: "progress_summary",
      data: {
        taskDetails,
        analytics,
        summary: {
          taskId,
          completionRate,
          totalBranches,
          activeBranches,
          mergedBranches,
          weeklyProgress
        }
      }
    };
  }

  generateQualitySummary(taskDetails, analytics, taskId) {
    if (!analytics) {
      return {
        message: `❌ No quality data available for task ${taskId}.`,
        type: "error",
        data: null
      };
    }

    const qualityScore = analytics.codeQualityScore || 0;
    const reviewCoverage = analytics.reviewCoverage || 0;
    const mergeRate = analytics.mergeSuccessRate || 0;
    const efficiency = analytics.overallEfficiency || 0;

    const qualityLevel = this.getQualityLevel(qualityScore);
    const qualityEmoji = this.getQualityEmoji(qualityScore);

    const message = `🔍 **Task ${taskId} Quality Assessment** ${qualityEmoji}

**Quality Metrics:**
• **Code Quality Score:** ${qualityScore}/10 (${qualityLevel})
• **Review Coverage:** ${reviewCoverage}%
• **Merge Success Rate:** ${mergeRate}%
• **Development Efficiency:** ${efficiency} (changes/hour)

**Quality Indicators:**
• **Code Review:** ${reviewCoverage >= 80 ? '✅ Excellent' : reviewCoverage >= 60 ? '⚠️ Good' : '❌ Needs Improvement'}
• **Merge Success:** ${mergeRate >= 90 ? '✅ Excellent' : mergeRate >= 70 ? '⚠️ Good' : '❌ Needs Improvement'}
• **Efficiency:** ${efficiency >= 5 ? '✅ High' : efficiency >= 2 ? '⚠️ Moderate' : '❌ Low'}

**Recommendations:**
${this.generateQualityRecommendations(qualityScore, reviewCoverage, mergeRate)}`;

    return {
      message,
      type: "quality_summary",
      data: {
        taskDetails,
        analytics,
        summary: {
          taskId,
          qualityScore,
          qualityLevel,
          reviewCoverage,
          mergeRate,
          efficiency
        }
      }
    };
  }

  // Helper methods
  getStatusEmoji(status) {
    const emojis = {
      'active': '🟢',
      'in_review': '🟡',
      'completed': '✅',
      'on_hold': '⏸️',
      'unknown': '❓'
    };
    return emojis[status] || '❓';
  }

  getQualityEmoji(score) {
    if (score >= 8) return '🏆';
    if (score >= 6) return '✅';
    if (score >= 4) return '⚠️';
    return '❌';
  }

  getQualityLevel(score) {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Poor';
  }

  formatTime(minutes) {
    if (!minutes || minutes === 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  formatDate(date) {
    if (!date) return 'N/A';
    return moment(date).format('MMM DD, YYYY');
  }

  generateProgressBar(percentage) {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  generateQualityRecommendations(qualityScore, reviewCoverage, mergeRate) {
    const recommendations = [];

    if (qualityScore < 6) {
      recommendations.push('• Improve code quality through better testing and documentation');
    }
    if (reviewCoverage < 80) {
      recommendations.push('• Increase code review coverage for better quality assurance');
    }
    if (mergeRate < 90) {
      recommendations.push('• Focus on reducing merge conflicts and improving PR quality');
    }
    if (recommendations.length === 0) {
      recommendations.push('• Continue maintaining current high standards');
    }

    return recommendations.join('\n');
  }

  // Main summarizer method
  summarize(taskDetails, analytics, taskId, summaryType = 'combined_summary') {
    const template = this.summaryTemplates[summaryType];
    if (!template) {
      return this.generateCombinedSummary(taskDetails, analytics, taskId);
    }
    return template.call(this, taskDetails, analytics, taskId);
  }
} 
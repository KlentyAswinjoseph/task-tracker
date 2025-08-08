export interface TaskExtraction {
  taskId: string | null;
  taskDescription: string | null;
}

export const extractTaskFromBranchName = (branchName: string): TaskExtraction => {
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
        taskDescription: match[2].replace(/[-_]/g, ' ').trim(),
      };
    }
  }

  return {
    taskId: null,
    taskDescription: null,
  };
}; 
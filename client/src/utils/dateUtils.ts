export const formatTimeDisplay = (hours: number | undefined | null): string => {
  if (!hours || hours === 0) return '0h';
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) {
      return `${days}d`;
    } else {
      return `${days}d ${remainingHours.toFixed(1)}h`;
    }
  } else {
    return `${hours.toFixed(1)}h`;
  }
};

export const setDefaultDates = (): { startDate: string; endDate: string } => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  return {
    endDate: endDate.toISOString().split('T')[0],
    startDate: startDate.toISOString().split('T')[0],
  };
};

export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}; 
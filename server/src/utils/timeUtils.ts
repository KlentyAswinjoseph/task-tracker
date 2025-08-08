import moment from 'moment';

export const calculateWaitingTime = (startDate: Date | string, endDate: Date | string): number | null => {
  if (!startDate || !endDate) return null;

  const start = moment(startDate);
  const end = moment(endDate);

  if (!start.isValid() || !end.isValid()) return null;

  const diffInHours = end.diff(start, 'hours', true);

  // If the difference is absurdly negative, consider it a data issue
  if (diffInHours < -1000) return null;

  // Ensure no negative waiting time
  return Math.max(0, diffInHours);
};

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
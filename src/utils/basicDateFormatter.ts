import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Formats a date string to a readable date format
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return 'Invalid date';
    }
    return format(date, 'MMM dd, yyyy');
  } catch {
    return 'Invalid date';
  }
};

/**
 * Formats a date string to include both date and time
 */
export const formatDateTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return 'Invalid date';
    }
    return format(date, 'MMM dd, yyyy h:mm a');
  } catch {
    return 'Invalid date';
  }
};

/**
 * Returns a relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffInMinutes = Math.abs(now.getTime() - date.getTime()) / (1000 * 60);
    
    // If less than 1 minute, show "just now"
    if (diffInMinutes < 1) {
      return 'just now';
    }
    
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
};
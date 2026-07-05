/**
 * Shared date, status, and ID formatting helpers for export modules.
 */

export function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().replace('T', ' ').split('.')[0];
  } catch {
    return dateString;
  }
}

export function formatTimestamp(dateString: string | null): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString();
  } catch {
    return dateString;
  }
}

export function getConditionText(condition: number | null): string {
  if (condition === null) return 'Not Rated';
  switch (condition) {
    case 1: return 'OK';
    case 2: return 'Adjusted';
    case 3: return 'Recommend Repairs';
    case 4: return 'Requires Immediate Repairs';
    case 5: return 'Unsafe Condition Present';
    case 6: return 'Not Applicable';
    default: return 'Unknown';
  }
}

export function calculateDaysOpen(createdDate: string, completedDate: string | null): number | null {
  const created = new Date(createdDate);
  const end = completedDate ? new Date(completedDate) : new Date();
  return Math.floor((end.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export function truncateId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

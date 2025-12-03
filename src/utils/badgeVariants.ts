/**
 * Badge variant utilities for consistent styling across the app.
 * 
 * Usage guidelines:
 * - Use badges sparingly - only for actionable or non-default states
 * - Avoid badges for default states (e.g., "active", "free")
 * - Limit to 1-2 badges per component
 */

export const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
  switch (role) {
    case 'owner':
      return 'default';
    case 'admin':
      return 'secondary';
    default:
      return 'outline';
  }
};

export const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
  switch (status) {
    case 'active':
      return 'default';
    case 'pending':
      return 'secondary';
    default:
      return 'destructive';
  }
};


import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { toast } from 'sonner';

interface ManageSubscriptionButtonProps {
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  className?: string;
}

const ManageSubscriptionButton: React.FC<ManageSubscriptionButtonProps> = ({
  size = 'sm',
  variant = 'outline',
  className = ''
}) => {
  const { openCustomerPortal } = useSubscription();
  const { currentOrganization } = useSimpleOrganization();
  
  const userRole = currentOrganization?.userRole;
  
  // Only allow owners to manage subscriptions
  const canManageSubscription = userRole === 'owner';

  const handleManageSubscription = async () => {
    if (!canManageSubscription) {
      toast.error('Only organization owners can manage subscriptions');
      return;
    }

    try {
      await openCustomerPortal();
      toast.success('Opening subscription management...');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open subscription management');
    }
  };

  // Don't render the button if user doesn't have permission
  if (!canManageSubscription) {
    return null;
  }

  return (
    <Button
      onClick={handleManageSubscription}
      size={size}
      variant={variant}
      className={`w-full sm:w-auto ${className}`}
    >
      <Settings className="mr-2 h-4 w-4" />
      <span className="sm:inline">Manage Subscription</span>
    </Button>
  );
};

export default ManageSubscriptionButton;

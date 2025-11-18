
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { ShoppingCart, Users } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface PurchaseLicensesButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const PurchaseLicensesButton: React.FC<PurchaseLicensesButtonProps> = ({
  variant = "default",
  size = "default",
  className = ""
}) => {
  const { currentOrganization } = useOrganization();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const isMobile = useIsMobile();

  const userRole = currentOrganization?.userRole;
  const canPurchaseLicenses = userRole === 'owner';

  const handlePurchase = async () => {
    if (!currentOrganization) {
      toast.error('No organization selected');
      return;
    }

    if (!canPurchaseLicenses) {
      toast.error('Only organization owners can purchase licenses');
      return;
    }

    if (quantity < 1 || quantity > 100) {
      toast.error('Please select between 1 and 100 licenses');
      return;
    }

    try {
      setIsPurchasing(true);
      toast.loading('Opening Stripe checkout...');
      
      const { data, error } = await supabase.functions.invoke('purchase-user-licenses', {
        body: { 
          quantity: quantity, 
          organizationId: currentOrganization.id 
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      toast.success('Redirecting to Stripe checkout...');
      setDialogOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create checkout';
      console.error('Error creating license checkout:', err);
      toast.error(errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Don't render the button if user doesn't have permission
  if (!canPurchaseLicenses) {
    return null;
  }

  const monthlyTotal = quantity * 10;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={isMobile ? "sm" : size}
          className={className}
          disabled={isPurchasing}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Purchase Licenses
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Purchase User Licenses
          </DialogTitle>
          <DialogDescription className="text-sm">
            Add more user licenses to your organization. Each license allows one additional team member.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Number of licenses</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="Enter number of licenses"
            />
            <p className="text-sm text-muted-foreground">
              Select between 1 and 100 licenses. Each license costs $10/month.
            </p>
          </div>
          
          <div className="rounded-lg bg-muted p-3">
            <div className="flex justify-between text-sm">
              <span>{quantity} × $10/month per license</span>
              <span className="font-medium">${monthlyTotal}/month</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Billing starts immediately and recurs monthly
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => setDialogOpen(false)}
            disabled={isPurchasing}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePurchase}
            disabled={isPurchasing || quantity < 1}
            className="w-full sm:w-auto"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isPurchasing ? 'Processing...' : `Purchase ${quantity} License${quantity !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseLicensesButton;

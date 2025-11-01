
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, CreditCard, Calendar, RefreshCw } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

const SubscriptionManagement = () => {
  const { 
    isLoading, 
    error, 
    checkSubscription, 
    createCheckout, 
    openCustomerPortal,
    isSubscribed,
    subscriptionTier,
    subscriptionEnd 
  } = useSubscription();

  const handleUpgrade = async (priceId: string) => {
    try {
      await createCheckout(priceId);
      toast.success('Redirecting to Stripe checkout...');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create checkout');
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
      toast.success('Opening subscription management...');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open customer portal');
    }
  };

  const handleRefresh = async () => {
    toast.promise(checkSubscription(), {
      loading: 'Checking subscription status...',
      success: 'Subscription status updated',
      error: 'Failed to check subscription status'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Subscription Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={handleRefresh} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Subscription Status
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={isSubscribed ? 'default' : 'secondary'}>
                {isSubscribed ? 'Active' : 'Free Plan'}
              </Badge>
            </div>
            
            {subscriptionTier && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <Badge variant="outline">{subscriptionTier}</Badge>
              </div>
            )}
            
            {subscriptionEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Next Billing</span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {new Date(subscriptionEnd).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            {isSubscribed && (
              <Button onClick={handleManageSubscription} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      {!isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Basic Plan */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold">Basic</h3>
                  <div className="text-2xl font-bold">$9.99</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Up to 10 team members</li>
                  <li>• Basic equipment tracking</li>
                  <li>• Standard work orders</li>
                  <li>• Email support</li>
                </ul>
                <Button 
                  onClick={() => handleUpgrade('price_basic_monthly')} 
                  className="w-full"
                  variant="outline"
                >
                  Choose Basic
                </Button>
              </div>

              {/* Premium Plan */}
              <div className="border-2 border-primary rounded-lg p-4 space-y-4 relative">
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  Most Popular
                </Badge>
                <div className="text-center">
                  <h3 className="font-semibold">Premium</h3>
                  <div className="text-2xl font-bold">$29.99</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Unlimited team members</li>
                  <li>• Advanced equipment tracking</li>
                  <li>• Fleet map visualization</li>
                  <li>• Priority support</li>
                  <li>• Advanced analytics</li>
                </ul>
                <Button 
                  onClick={() => handleUpgrade('price_premium_monthly')} 
                  className="w-full"
                >
                  Choose Premium
                </Button>
              </div>

              {/* Enterprise Plan */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold">Enterprise</h3>
                  <div className="text-2xl font-bold">$99.99</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Everything in Premium</li>
                  <li>• Custom integrations</li>
                  <li>• Dedicated support</li>
                  <li>• On-premise options</li>
                  <li>• SLA guarantee</li>
                </ul>
                <Button 
                  onClick={() => handleUpgrade('price_enterprise_monthly')} 
                  className="w-full"
                  variant="outline"
                >
                  Choose Enterprise
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-800 text-sm">
              Error: {error}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionManagement;

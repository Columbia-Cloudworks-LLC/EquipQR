
# EquipQR Billing and Pricing Model Documentation

## Overview

EquipQR operates on a flexible pay-as-you-go billing model designed to scale with organizations of all sizes. This document provides comprehensive details about the pricing structure, billing rules, implementation, and technical specifications.

## Pricing Structure

### Core Pricing Components

#### 1. User Licenses
- **First User**: Free (organization owner)
- **Additional Users**: $10.00 per user per month
- **Billing Rule**: Only active users are billed
- **User Types Billed**: Admin and Member roles
- **User Types Free**: Organization owners

Users can choose the quantity of user licenses they want to buy from 1 to 99 using a Stripe subscription page.
Users must buy licenses before they can send an invitation via e-mail to someone that will occupy the slots.
Users buy licenses by purchasing a quantity of a Stripe subscription at $10 a month.

#### Billing Exemptions
- **Purpose**: Administrative tool to provide additional license capacity without billing
- **Effect**: Increases available license slots but does not reduce billing costs
- **Use Case**: Trials, support escalations, or special arrangements
- **Management**: Only organization owners can manage exemptions through admin tools

#### 2. Storage
- **Free Tier**: 5GB included
- **Overage Rate**: $0.10 per GB per month
- **Billing Rule**: Charged for usage above free tier
- **Calculation**: Monthly total storage at time of billing

#### 3. Premium Add-ons
- **Fleet Map**: $10.00 per month
- **Status**: Optional feature toggle
- **Billing Rule**: Prorated monthly charges

### Pricing Tiers Comparison

| Feature | Free (Base) | Pay-as-you-go |
|---------|-------------|---------------|
| First User | ✓ Included | ✓ Included |
| Additional Users | ❌ Not available | $10/user/month |
| Storage | 5GB + $0.10/GB | 5GB + $0.10/GB |
| Equipment Management | ✓ Included | ✓ Included |
| Work Orders | ✓ Included | ✓ Included |
| Team Management | ❌ Not available | ✓ Included |
| Fleet Map | $10/month | $10/month |
| QR Scanner | ✓ Included | ✓ Included |

## Billing Rules and Logic

### User License Billing

#### Active User Calculation
```typescript
const calculateUserLicenseCost = (members: OrganizationMember[]) => {
  const activeMembers = members.filter(member => 
    member.status === 'active' && 
    member.role !== 'owner'
  );
  return activeMembers.length * 10; // $10 per user
};
```

#### Billing States
- **Active**: User is billed
- **Pending**: User is billed
- **Inactive**: User is not billed only if inactive for 30 days or more

#### Role-Based Billing
- **Owner**: Always free (first user benefit)
- **Admin**: Billable if active
- **Member**: Billable if active

### Storage Billing

#### Storage Calculation
```typescript
const calculateStorageCost = (usageGB: number) => {
  const freeStorageGB = 5;
  const overageGB = Math.max(0, usageGB - freeStorageGB);
  return overageGB * 0.10; // $0.10 per GB
};
```

#### Storage Tracking
- **Measurement**: Monthly total usage
- **Granularity**: Megabyte precision
- **Billing Frequency**: Monthly

### Premium Features Billing

#### Fleet Map Add-on
```typescript
const calculateFleetMapCost = (enabled: boolean) => {
  return enabled ? 10 : 0; // $10/month when enabled
};
```

#### Feature Toggle Rules
- **Activation**: Immediate billing upon enablement
- **Deactivation**: feature subscription cancelled, feature deactivated at start of next billing cycle
- **Billing Cycle**: Aligns with organization billing date

## Total Monthly Cost Calculation

### Billing Formula
```typescript
const calculateTotalMonthlyCost = (organization: Organization) => {
  const userCost = calculateUserLicenseCost(organization.members);
  const storageCost = calculateStorageCost(organization.storageUsageGB);
  const fleetMapCost = calculateFleetMapCost(organization.fleetMapEnabled);
  
  return {
    userLicenses: userCost,
    storage: storageCost,
    fleetMap: fleetMapCost,
    total: userCost + storageCost + fleetMapCost
  };
};
```

### Example Billing Scenarios

#### Scenario 1: Small Team
- **Users**: 1 Owner + 2 Members = 3 total users
- **Storage**: 3.2GB used
- **Fleet Map**: Disabled

**Calculation**:
- User Licenses: 2 billable users × $10 = $20.00
- Storage: 0GB overage × $0.10 = $0.00
- Fleet Map: $0.00
- **Total**: $20.00/month

#### Scenario 2: Growing Organization
- **Users**: 1 Owner + 1 Admin + 8 Members = 10 total users
- **Storage**: 12.5GB used
- **Fleet Map**: Enabled

**Calculation**:
- User Licenses: 9 billable users × $10 = $90.00
- Storage: 7.5GB overage × $0.10 = $0.75
- Fleet Map: $10.00
- **Total**: $100.75/month

#### Scenario 3: Enterprise Usage
- **Users**: 1 Owner + 5 Admins + 25 Members = 31 total users
- **Storage**: 45.8GB used
- **Fleet Map**: Enabled

**Calculation**:
- User Licenses: 30 billable users × $10 = $300.00
- Storage: 40.8GB overage × $0.10 = $4.08
- Fleet Map: $10.00
- **Total**: $314.08/month

## Database Schema

### Core Tables

#### organizations
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  plan organization_plan DEFAULT 'free',
  member_count INTEGER DEFAULT 1,
  max_members INTEGER DEFAULT 5,
  billable_members INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  fleet_map_enabled BOOLEAN DEFAULT false,
  last_billing_calculation TIMESTAMPTZ DEFAULT now(),
  next_billing_date TIMESTAMPTZ,
  billing_cycle TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### organization_members
```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  joined_date TIMESTAMPTZ DEFAULT now()
);
```

#### organization_subscriptions
```sql
CREATE TABLE organization_subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  feature_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  billing_cycle TEXT DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### billing_events
```sql
CREATE TABLE billing_events (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  event_data JSONB DEFAULT '{}',
  amount_change NUMERIC DEFAULT 0,
  effective_date TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### billing_usage
```sql
CREATE TABLE billing_usage (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  usage_type TEXT NOT NULL,
  usage_value INTEGER NOT NULL,
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Database Functions

#### calculate_billable_members
```sql
CREATE OR REPLACE FUNCTION calculate_billable_members(org_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM organization_members om
  WHERE om.organization_id = org_id 
    AND om.status = 'active'
    AND om.role IN ('admin', 'member');
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

#### calculate_organization_billing
```sql
CREATE OR REPLACE FUNCTION calculate_organization_billing(org_id UUID)
RETURNS JSONB AS $$
DECLARE
  active_users INTEGER;
  storage_mb INTEGER;
  result JSONB;
BEGIN
  SELECT calculate_billable_members(org_id) INTO active_users;
  
  SELECT COALESCE(storage_used_mb, 0) INTO storage_mb
  FROM organizations WHERE id = org_id;

  result := jsonb_build_object(
    'organization_id', org_id,
    'active_users', active_users,
    'storage_mb', storage_mb,
    'user_license_cost', active_users * 1000,
    'storage_overage_cost', GREATEST(0, storage_mb - 1000) * 10,
    'calculated_at', now()
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Stripe Integration

### Product and Price Configuration

#### Stripe Products
```json
{
  "user_licenses": {
    "id": "prod_user_licenses",
    "name": "User Licenses",
    "description": "Additional user licenses beyond the first free user"
  },
  "storage": {
    "id": "prod_storage",
    "name": "Storage",
    "description": "Additional storage beyond 5GB free tier"
  },
  "fleet_map": {
    "id": "prod_fleet_map",
    "name": "Fleet Map Add-on",
    "description": "Interactive equipment location mapping"
  }
}
```

#### Stripe Prices
```json
{
  "user_license_monthly": {
    "id": "price_user_monthly",
    "product": "prod_user_licenses",
    "unit_amount": 1000,
    "currency": "usd",
    "recurring": {
      "interval": "month"
    }
  },
  "storage_monthly": {
    "id": "price_storage_monthly",
    "product": "prod_storage",
    "unit_amount": 10,
    "currency": "usd",
    "recurring": {
      "interval": "month"
    }
  },
  "fleet_map_monthly": {
    "id": "price_fleet_map_monthly",
    "product": "prod_fleet_map",
    "unit_amount": 1000,
    "currency": "usd",
    "recurring": {
      "interval": "month"
    }
  }
}
```

### Subscription Management

#### Creating Usage-Based Subscriptions
```typescript
// Example: Create subscription with multiple line items
const createSubscription = async (customerId: string, organization: Organization) => {
  const lineItems = [];
  
  // User licenses
  if (organization.billableMembers > 0) {
    lineItems.push({
      price: 'price_user_monthly',
      quantity: organization.billableMembers
    });
  }
  
  // Storage overage
  const storageOverageGB = Math.max(0, organization.storageUsageGB - 5);
  if (storageOverageGB > 0) {
    lineItems.push({
      price: 'price_storage_monthly',
      quantity: Math.ceil(storageOverageGB)
    });
  }
  
  // Fleet Map add-on
  if (organization.fleetMapEnabled) {
    lineItems.push({
      price: 'price_fleet_map_monthly',
      quantity: 1
    });
  }
  
  return stripe.subscriptions.create({
    customer: customerId,
    items: lineItems,
    billing_cycle_anchor: getNextBillingDate(organization),
    proration_behavior: 'always_invoice'
  });
};
```

## Edge Functions Documentation

### check-subscription Function

#### Purpose
Verifies user subscription status and updates local database cache.

#### Implementation
```typescript
// Located at: supabase/functions/check-subscription/index.ts
export const checkSubscription = async (user: User) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  // Get customer from Stripe
  const customers = await stripe.customers.list({
    email: user.email,
    limit: 1
  });
  
  if (customers.data.length === 0) {
    return { subscribed: false };
  }
  
  // Check active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    customer: customers.data[0].id,
    status: 'active'
  });
  
  const hasActiveSub = subscriptions.data.length > 0;
  
  // Update local cache
  await supabase.from('subscribers').upsert({
    user_id: user.id,
    email: user.email,
    subscribed: hasActiveSub,
    updated_at: new Date().toISOString()
  });
  
  return { subscribed: hasActiveSub };
};
```

### create-checkout Function

#### Purpose
Creates Stripe checkout sessions for subscription purchases.

#### Implementation
```typescript
// Located at: supabase/functions/create-checkout/index.ts
export const createCheckout = async (priceId: string, organizationId: string) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1
    }],
    mode: 'subscription',
    success_url: `${origin}/billing?success=true`,
    cancel_url: `${origin}/billing?canceled=true`,
    metadata: {
      organization_id: organizationId
    }
  });
  
  return { url: session.url };
};
```

### customer-portal Function

#### Purpose
Provides access to Stripe Customer Portal for subscription management.

#### Implementation
```typescript
// Located at: supabase/functions/customer-portal/index.ts
export const customerPortal = async (customerId: string) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/billing`
  });
  
  return { url: portalSession.url };
};
```

## Frontend Implementation

### Billing Components

#### RealMemberBilling Component
- **Purpose**: Display user license billing details
- **Features**: Real-time member count, cost calculation, status tracking
- **Location**: `src/components/billing/RealMemberBilling.tsx`

#### OrganizationBilling Component  
- **Purpose**: Comprehensive billing overview
- **Features**: All billing components, usage tracking, add-on management
- **Location**: `src/components/billing/OrganizationBilling.tsx`

### Billing Hooks

#### useSubscription Hook
```typescript
export const useSubscription = () => {
  const [subscriptionData, setSubscriptionData] = useState(null);
  
  const checkSubscription = async () => {
    const { data } = await supabase.functions.invoke('check-subscription');
    setSubscriptionData(data);
  };
  
  const createCheckout = async (priceId: string) => {
    const { data } = await supabase.functions.invoke('create-checkout', {
      body: { priceId }
    });
    window.open(data.url, '_blank');
  };
  
  return { subscriptionData, checkSubscription, createCheckout };
};
```

#### useOrganizationMembers Hook
```typescript
export const useOrganizationMembers = (organizationId: string) => {
  return useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('organization_members')
        .select('*, profiles(*)')
        .eq('organization_id', organizationId);
      return data;
    }
  });
};
```

## Billing Events and Tracking

### Event Types

#### Member Events
- **member_added**: New user joins organization
- **member_removed**: User leaves or is removed
- **member_updated**: Role or status change
- **member_activated**: Pending user accepts invitation

#### Usage Events
- **storage_updated**: Storage usage changes
- **feature_enabled**: Premium feature activated
- **feature_disabled**: Premium feature deactivated

#### Billing Events
- **billing_calculated**: Monthly billing calculation
- **invoice_generated**: New invoice created
- **payment_succeeded**: Successful payment
- **payment_failed**: Failed payment attempt

### Event Processing
```typescript
const processBillingEvent = async (event: BillingEvent) => {
  switch (event.event_type) {
    case 'member_added':
      await updateOrganizationBilling(event.organization_id);
      await logBillingChange(event);
      break;
    
    case 'storage_updated':
      await recalculateStorageBilling(event.organization_id);
      break;
    
    case 'feature_enabled':
      await activateFeatureBilling(event);
      break;
  }
};
```

## Implementation Guidelines

### Best Practices

#### 1. Real-time Updates
- Update billing immediately when membership changes
- Recalculate costs on feature toggles
- Sync with Stripe for authoritative data

#### 2. Error Handling
- Graceful degradation for billing failures
- Retry logic for Stripe API calls
- Fallback to cached data when available

#### 3. Security
- Validate all billing calculations server-side
- Use Row Level Security for billing data
- Audit all billing changes

#### 4. Performance
- Cache frequently accessed billing data
- Use database functions for complex calculations
- Optimize queries for large organizations

### Development Workflow

#### 1. Testing
```bash
# Run billing calculation tests
npm run test:billing

# Test Stripe integration
npm run test:stripe

# Validate billing rules
npm run validate:billing
```

#### 2. Deployment
```bash
# Deploy edge functions
supabase functions deploy

# Run database migrations
supabase db push

# Update Stripe products/prices
npm run stripe:sync
```

## Monitoring and Analytics

### Key Metrics

#### Revenue Metrics
- Monthly Recurring Revenue (MRR)
- Average Revenue Per User (ARPU)
- Customer Lifetime Value (CLV)
- Churn Rate

#### Usage Metrics
- Active organizations
- Average users per organization
- Storage usage distribution
- Feature adoption rates

### Billing Analytics Queries

#### Monthly Revenue Breakdown
```sql
SELECT 
  DATE_TRUNC('month', created_at) AS month,
  SUM(CASE WHEN event_type = 'user_license' THEN amount_change ELSE 0 END) AS user_revenue,
  SUM(CASE WHEN event_type = 'storage' THEN amount_change ELSE 0 END) AS storage_revenue,
  SUM(CASE WHEN event_type = 'fleet_map' THEN amount_change ELSE 0 END) AS addon_revenue,
  SUM(amount_change) AS total_revenue
FROM billing_events 
WHERE processed = true
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

#### Organization Size Distribution
```sql
SELECT 
  CASE 
    WHEN billable_members = 0 THEN '1 user (free)'
    WHEN billable_members BETWEEN 1 AND 5 THEN '2-6 users'
    WHEN billable_members BETWEEN 6 AND 20 THEN '7-21 users'
    WHEN billable_members BETWEEN 21 AND 50 THEN '22-51 users'
    ELSE '50+ users'
  END AS organization_size,
  COUNT(*) as count,
  AVG(billable_members * 10) as avg_user_revenue
FROM organizations 
GROUP BY 1
ORDER BY avg_user_revenue DESC;
```

## Troubleshooting

### Common Issues

#### 1. Billing Calculation Discrepancies
- **Cause**: Stale data or race conditions
- **Solution**: Refresh billing cache, verify Stripe sync
- **Prevention**: Use database triggers, atomic operations

#### 2. Stripe Sync Failures
- **Cause**: API rate limits, network issues
- **Solution**: Implement retry logic, use webhooks
- **Prevention**: Proper error handling, monitoring

#### 3. User Count Mismatches  
- **Cause**: Pending invitations, status changes
- **Solution**: Verify member status, recalculate
- **Prevention**: Real-time status tracking

### Debugging Tools

#### Billing Debug Panel
```typescript
const BillingDebugPanel = () => {
  const { organization } = useOrganization();
  const billing = calculateBilling(organization);
  
  return (
    <div className="debug-panel">
      <h3>Billing Debug</h3>
      <pre>{JSON.stringify(billing, null, 2)}</pre>
    </div>
  );
};
```

## Future Enhancements

### Planned Features

#### 1. Annual Billing
- Discount for annual payments
- Prorated upgrades/downgrades
- Annual usage reporting

#### 2. Enterprise Plans
- Custom pricing tiers
- Volume discounts
- Dedicated support

#### 3. Usage-Based Pricing
- API call metering
- Advanced analytics
- Custom integrations

#### 4. Multi-Currency Support
- Regional pricing
- Currency conversion
- Local payment methods

## Conclusion

This billing and pricing model provides a scalable, transparent, and fair approach to monetizing EquipQR. The pay-as-you-go structure ensures organizations only pay for what they use, while the technical implementation provides accurate billing, real-time updates, and comprehensive tracking.

The system is designed to grow with organizations of all sizes, from small teams to large enterprises, while maintaining simplicity and transparency in pricing and billing operations.

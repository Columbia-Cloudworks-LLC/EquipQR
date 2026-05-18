import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, Link2 } from 'lucide-react';
import { useCustomer } from '@/features/teams/hooks/useCustomerAccount';

interface CustomerAccountCardProps {
  customerId: string;
}

const statusStyles: Record<string, string> = {
  active: 'bg-success/20 text-success border-success/30',
  prospect: 'bg-info/20 text-info border-info/30',
  inactive: 'bg-muted text-muted-foreground border-border',
  'on-hold': 'bg-warning/20 text-warning border-warning/30',
};

const CustomerAccountCard: React.FC<CustomerAccountCardProps> = ({ customerId }) => {
  const { data: customer, isLoading } = useCustomer(customerId);

  if (isLoading || !customer) return null;

  const status = customer.status ?? 'active';

  return (
    <Card className="shadow-elevation-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Customer Account
        </CardTitle>
        <CardDescription className="text-xs">
          Parent account for this team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{customer.name}</span>
          <div className="flex items-center gap-2">
            {customer.is_tax_exempt !== null && customer.is_tax_exempt !== undefined && (
              <Badge
                variant="outline"
                className={
                  customer.is_tax_exempt
                    ? 'text-xs bg-success/10 text-success border-success/30'
                    : 'text-xs bg-muted text-muted-foreground border-border'
                }
              >
                {customer.is_tax_exempt ? 'Tax Exempt' : 'Taxable'}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`text-xs ${statusStyles[status] ?? statusStyles.active}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {customer.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {customer.email}
            </span>
          )}
          {customer.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {customer.phone}
            </span>
          )}
        </div>

        {customer.quickbooks_customer_id && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link2 className="h-3 w-3" />
            QB linked
            {customer.quickbooks_synced_at && (
              <span>
                &middot; synced {new Date(customer.quickbooks_synced_at).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {customer.notes && (
          <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
            {customer.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerAccountCard;

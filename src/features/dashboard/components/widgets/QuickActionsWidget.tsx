import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, QrCode, Forklift, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ACTIONS = [
  {
    label: 'New Work Order',
    icon: Plus,
    to: '/dashboard/work-orders/create',
    variant: 'default' as const,
  },
  {
    label: 'Scan QR',
    icon: QrCode,
    to: '/dashboard/scan',
    variant: 'outline' as const,
  },
  {
    label: 'Add Equipment',
    icon: Forklift,
    to: '/dashboard/equipment/create',
    variant: 'outline' as const,
  },
  {
    label: 'All Work Orders',
    icon: ClipboardList,
    to: '/dashboard/work-orders',
    variant: 'outline' as const,
  },
] as const;

/**
 * Quick action buttons for common dashboard operations.
 */
const QuickActionsWidget: React.FC = () => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant={action.variant}
                size="sm"
                asChild
                className="h-auto py-3 flex-col gap-1.5"
              >
                <Link to={action.to}>
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{action.label}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionsWidget;

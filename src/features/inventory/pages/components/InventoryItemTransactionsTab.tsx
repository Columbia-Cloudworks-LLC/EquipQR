import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InventoryTransaction } from '@/features/inventory/types/inventory';

interface InventoryItemTransactionsTabProps {
  transactions: InventoryTransaction[];
}

const InventoryItemTransactionsTab: React.FC<InventoryItemTransactionsTabProps> = ({
  transactions,
}) => {
  const formatLocalDateTimeWithZone = (timestamp: string) => {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZoneName: 'short',
    }).format(new Date(timestamp));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{transaction.transaction_type}</Badge>
                    <span className="font-medium">
                      {transaction.change_amount > 0 ? '+' : ''}
                      {transaction.change_amount}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {transaction.previous_quantity} -&gt; {transaction.new_quantity}
                  </p>
                  {transaction.notes && (
                    <p className="text-sm mt-1">{transaction.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {transaction.userName || 'Unknown'} •{' '}
                    {formatLocalDateTimeWithZone(transaction.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryItemTransactionsTab;

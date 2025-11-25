
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Crown } from 'lucide-react';
import { useOrganizationMembers, RealOrganizationMember } from '@/hooks/useOrganizationMembers';
import { useOrganization } from '@/contexts/OrganizationContext';
import { calculateBilling, isFreeOrganization } from '@/utils/billing';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const RealMemberBilling = () => {
  const { currentOrganization } = useOrganization();
  const { data: members = [], isLoading } = useOrganizationMembers(currentOrganization?.id || '');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const billing = calculateBilling({ members, storageGB: 0, fleetMapEnabled: true });
  const { totalUsers, billableUsers, cost: totalMembersCost } = { totalUsers: billing.userSlots.totalUsers, billableUsers: billing.userSlots.billableUsers, cost: billing.userSlots.totalCost };
  const isFree = isFreeOrganization(members);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getMemberCost = (member: RealOrganizationMember, index: number) => {
    if (member.status !== 'active') return 0;
    // First active user (typically owner) is free
    if (index === 0 && member.role === 'owner') return 0;
    return 10;
  };

  // Sort members to put owner first, then by active status
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === 'owner') return -1;
    if (b.role === 'owner') return 1;
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    return 0;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Licenses ({totalUsers} total members)
            {isFree && <Badge variant="secondary">Free Plan</Badge>}
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Monthly Subtotal</div>
            <div className="text-lg font-bold">${totalMembersCost.toFixed(2)}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {isFree 
              ? 'Your single-user organization is free forever. Invite team members to unlock collaboration features.'
              : 'Your first user is always free. Each additional active user costs $10/month. Pending users are not billed until they accept their invitation.'
            }
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Monthly Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMembers.map((member, index) => {
                const cost = getMemberCost(member, index);
                const isOwnerAndFree = index === 0 && member.role === 'owner' && member.status === 'active';
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            {member.name}
                            {member.role === 'owner' && <Crown className="h-3 w-3 text-yellow-500" />}
                          </div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(member.status)}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono">
                        ${cost.toFixed(2)}
                        {isOwnerAndFree && (
                          <span className="text-sm text-muted-foreground ml-1">(free)</span>
                        )}
                        {member.status === 'pending' && (
                          <span className="text-sm text-muted-foreground ml-1">(not billed until active)</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {isFree 
                ? 'Free single-user plan'
                : `${billableUsers} billable users × $10/month (first user free)`
              }
            </div>
            <div className="text-lg font-bold">
              Monthly Subtotal: ${totalMembersCost.toFixed(2)}
            </div>
          </div>

          {isFree && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
              <div className="text-sm text-blue-800">
                <strong>Free Plan Benefits:</strong> Perfect for individual users managing their own equipment. 
                Includes basic equipment tracking, work orders, and QR code scanning at no cost.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RealMemberBilling;

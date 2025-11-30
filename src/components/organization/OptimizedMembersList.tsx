/**
 * Members List Component
 * 
 * This component displays a list of organization members with search, filter,
 * and management capabilities.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, MoreVertical, UserMinus, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebouncedSearch } from "@/hooks/useDebounced";
import { useUpdateMemberRole, useRemoveMember } from "@/hooks/useOptimizedOrganizationMembers";
import type { OrganizationMember } from "@/types/organization";
import OptimizedVirtualizedList from "@/components/performance/OptimizedVirtualizedList";
import { toast } from "sonner";
import { type UseMutationResult } from "@tanstack/react-query";

// Re-export type for backward compatibility
export type RealOrganizationMember = OrganizationMember;

// Type for organization member record returned from Supabase
type OrganizationMemberRecord = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_date: string;
  slot_purchase_id: string | null;
  activated_slot_at: string | null;
};

// Move components outside to prevent re-creation on every render
const MobileListItem = React.memo<{
  member: RealOrganizationMember;
  index: number;
  currentUserRole: 'owner' | 'admin' | 'member';
  ownerCount: number;
  onRoleChange: (memberId: string, newRole: 'admin' | 'member') => void;
  onRemoveMember: (member: RealOrganizationMember) => void;
  updateMemberRole: UseMutationResult<OrganizationMemberRecord, Error, { memberId: string; newRole: 'admin' | 'member' }, unknown>;
  getRoleBadgeVariant: (role: string) => 'default' | 'secondary' | 'outline';
  getStatusBadgeVariant: (status: string) => 'default' | 'secondary' | 'destructive' | 'outline';
}>(({ member, currentUserRole, ownerCount, onRoleChange, onRemoveMember, updateMemberRole, getRoleBadgeVariant, getStatusBadgeVariant }) => {
  const canEdit = currentUserRole === 'owner' || (currentUserRole === 'admin' && member.role !== 'owner');
  const canRemove = (currentUserRole === 'owner' && member.role !== 'owner') || (currentUserRole === 'admin' && member.role === 'member');
  const isLastOwnerCheck = member.role === 'owner' && ownerCount === 1;
  
  return (
    <div className="flex items-center justify-between p-4 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={member.avatar} alt={member.name} />
          <AvatarFallback>
            {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{member.name}</p>
            <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
              {member.role}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{member.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={getStatusBadgeVariant(member.status)} className="text-xs">
              {member.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(member.joinedDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {member.role !== 'owner' && (
              <DropdownMenuItem
                onSelect={() => onRoleChange(member.id, member.role === 'admin' ? 'member' : 'admin')}
                disabled={updateMemberRole.isPending}
              >
                Change to {member.role === 'admin' ? 'Member' : 'Admin'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => onRemoveMember(member)}
              disabled={!canRemove || isLastOwnerCheck}
              className="text-destructive disabled:text-muted-foreground"
            >
              <UserMinus className="mr-2 h-4 w-4" />
              Remove Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});

const DesktopTableRow = React.memo<{
  member: RealOrganizationMember;
  index: number;
  currentUserRole: 'owner' | 'admin' | 'member';
  ownerCount: number;
  onRoleChange: (memberId: string, newRole: 'admin' | 'member') => void;
  onRemoveMember: (member: RealOrganizationMember) => void;
  updateMemberRole: UseMutationResult<OrganizationMemberRecord, Error, { memberId: string; newRole: 'admin' | 'member' }, unknown>;
  getRoleBadgeVariant: (role: string) => 'default' | 'secondary' | 'outline';
  getStatusBadgeVariant: (status: string) => 'default' | 'secondary' | 'destructive' | 'outline';
}>(({ member, currentUserRole, ownerCount, onRoleChange, onRemoveMember, updateMemberRole, getRoleBadgeVariant, getStatusBadgeVariant }) => {
  const canEdit = currentUserRole === 'owner' || (currentUserRole === 'admin' && member.role !== 'owner');
  const canRemove = (currentUserRole === 'owner' && member.role !== 'owner') || (currentUserRole === 'admin' && member.role === 'member');
  const isLastOwnerCheck = member.role === 'owner' && ownerCount === 1;
  
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={member.avatar} alt={member.name} />
            <AvatarFallback>
              {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getRoleBadgeVariant(member.role)}>
          {member.role}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(member.status)}>
          {member.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(member.joinedDate).toLocaleDateString()}
      </TableCell>
      <TableCell>
        {canEdit && (
          <div className="flex items-center gap-2">
            {member.role !== 'owner' && (
              <Select
                value={member.role}
                onValueChange={(value) => onRoleChange(member.id, value as 'admin' | 'member')}
                disabled={updateMemberRole.isPending}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveMember(member)}
                  disabled={!canRemove || isLastOwnerCheck}
                  className="h-8 w-8 p-0 text-destructive disabled:text-muted-foreground"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              {(!canRemove || isLastOwnerCheck) && (
                <TooltipContent>
                  {isLastOwnerCheck 
                    ? "Cannot remove the last owner" 
                    : "Insufficient permissions to remove this member"}
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
});

interface OptimizedMembersListProps {
  members: RealOrganizationMember[];
  organizationId: string;
  currentUserRole: 'owner' | 'admin' | 'member';
  isLoading?: boolean;
}

const MOBILE_ITEM_HEIGHT = 72;
const DESKTOP_ROW_HEIGHT = 64;
const VIRTUALIZATION_THRESHOLD = 50;

export default function OptimizedMembersList({
  members,
  organizationId,
  currentUserRole,
  isLoading
}: OptimizedMembersListProps) {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [memberToRemove, setMemberToRemove] = useState<RealOrganizationMember | null>(null);

  const updateMemberRole = useUpdateMemberRole(organizationId);
  const removeMember = useRemoveMember(organizationId);

  // Search and filter logic
  const searchFields: (keyof RealOrganizationMember)[] = ['name', 'email'];
  const { filteredItems: searchFilteredMembers } = useDebouncedSearch(
    members,
    searchTerm,
    searchFields,
    300
  );

  const filteredMembers = useMemo(() => {
    let filtered = searchFilteredMembers;

    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }

    return filtered;
  }, [searchFilteredMembers, roleFilter, statusFilter]);

  // Memoize owner count to prevent recalculation on every render
  const ownerCount = useMemo(() => 
    members.filter(m => m.role === 'owner').length, 
    [members]
  );

  const isLastOwner = useCallback((member: RealOrganizationMember): boolean => {
    return member.role === 'owner' && ownerCount === 1;
  }, [ownerCount]);

  // Handlers
  const handleRoleChange = useCallback(async (memberId: string, newRole: 'admin' | 'member') => {
    try {
      await updateMemberRole.mutateAsync({ memberId, newRole });
    } catch (error) {
      console.error('Error updating member role:', error);
    }
  }, [updateMemberRole]);

  const handleRemoveMember = useCallback(async (member: RealOrganizationMember) => {
    if (isLastOwner(member)) {
      toast.error('Cannot remove the last owner from the organization');
      return;
    }

    try {
      await removeMember.mutateAsync(member.id);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  }, [removeMember, isLastOwner]);

  // Badge variants
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'member': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'inactive': return 'destructive';
      default: return 'outline';
    }
  };


  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const shouldUseVirtualization = filteredMembers.length > VIRTUALIZATION_THRESHOLD;

  return (
    <TooltipProvider>
      <Card className="p-6">
        <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Organization Members</h3>
          <span className="text-sm text-muted-foreground">
            ({filteredMembers.length} of {members.length})
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {filteredMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No members found
          </div>
        ) : isMobile ? (
          /* Mobile List View */
          shouldUseVirtualization ? (
            <OptimizedVirtualizedList
              items={filteredMembers}
              itemHeight={MOBILE_ITEM_HEIGHT}
              height={400}
              renderItem={(member: RealOrganizationMember, index: number) => (
                <MobileListItem 
                  member={member} 
                  index={index}
                  currentUserRole={currentUserRole}
                  ownerCount={ownerCount}
                  onRoleChange={handleRoleChange}
                  onRemoveMember={setMemberToRemove}
                  updateMemberRole={updateMemberRole}
                  getRoleBadgeVariant={getRoleBadgeVariant}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                />
              )}
              className="border border-border rounded-lg"
            />
          ) : (
            <div className="border border-border rounded-lg">
              {filteredMembers.map((member, index) => (
                <MobileListItem 
                  key={member.id} 
                  member={member} 
                  index={index}
                  currentUserRole={currentUserRole}
                  ownerCount={ownerCount}
                  onRoleChange={handleRoleChange}
                  onRemoveMember={setMemberToRemove}
                  updateMemberRole={updateMemberRole}
                  getRoleBadgeVariant={getRoleBadgeVariant}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                />
              ))}
            </div>
          )
        ) : (
          /* Desktop Table View */
          shouldUseVirtualization ? (
            <div className="border border-border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              <OptimizedVirtualizedList
                items={filteredMembers}
                itemHeight={DESKTOP_ROW_HEIGHT}
                height={400}
                renderItem={(member: RealOrganizationMember, index: number) => (
                  <div className="w-full">
                    <Table>
                      <TableBody>
                        <DesktopTableRow 
                          member={member} 
                          index={index}
                          currentUserRole={currentUserRole}
                          ownerCount={ownerCount}
                          onRoleChange={handleRoleChange}
                          onRemoveMember={setMemberToRemove}
                          updateMemberRole={updateMemberRole}
                          getRoleBadgeVariant={getRoleBadgeVariant}
                          getStatusBadgeVariant={getStatusBadgeVariant}
                        />
                      </TableBody>
                    </Table>
                  </div>
                )}
              />
            </div>
          ) : (
            <div className="border border-border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member, index) => (
                    <DesktopTableRow 
                      key={member.id} 
                      member={member} 
                      index={index}
                      currentUserRole={currentUserRole}
                      ownerCount={ownerCount}
                      onRoleChange={handleRoleChange}
                      onRemoveMember={setMemberToRemove}
                      updateMemberRole={updateMemberRole}
                      getRoleBadgeVariant={getRoleBadgeVariant}
                      getStatusBadgeVariant={getStatusBadgeVariant}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </div>

      {/* Remove Member Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.name} from the organization?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? 'Removing...' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </Card>
    </TooltipProvider>
  );
}
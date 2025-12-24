
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTeamMembers } from '@/features/teams/hooks/useTeamManagement';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { TeamWithMembers } from '@/features/teams/services/teamService';

interface AddTeamMemberDialogProps {
  open: boolean;
  onClose: () => void;
  team: TeamWithMembers;
}

const AddTeamMemberDialog: React.FC<AddTeamMemberDialogProps> = ({ 
  open, 
  onClose, 
  team 
}) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'manager' | 'technician' | 'requestor' | 'viewer'>('technician');
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const { availableUsers, addMember } = useTeamMembers(team?.id, currentOrganization?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Please select a user to add",
        variant: "destructive"
      });
      return;
    }

    try {
      await addMember.mutateAsync({
        teamId: team.id,
        userId: selectedUser,
        role: selectedRole,
      });
      
      setSelectedUser('');
      setSelectedRole('technician');
      onClose();
    } catch {
      // Error is handled by the mutation
    }
  };

  const roleOptions = [
    { value: 'manager', label: 'Manager', description: 'Can manage team members and assign work orders' },
    { value: 'technician', label: 'Technician', description: 'Can update work orders and record maintenance' },
    { value: 'requestor', label: 'Requestor', description: 'Can create and submit work orders' },
    { value: 'viewer', label: 'Viewer', description: 'Can view work orders and equipment but not modify' },
  ];

  const isLoading = availableUsers.isLoading;
  const users = availableUsers.data || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Add an existing organization member to {team.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Select User *</Label>
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading available users...</div>
                ) : users.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No available users to add</div>
                ) : (
                  <Select value={selectedUser} onValueChange={setSelectedUser} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user to add" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-48">
                        {users.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {(user.profiles?.name || 'U').split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.profiles?.name || 'Unknown'}</div>
                                <div className="text-sm text-muted-foreground">{user.profiles?.email}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Team Role *</Label>
                <Select 
                  value={selectedRole} 
                  onValueChange={(value: string) => setSelectedRole(value as 'manager' | 'technician' | 'requestor' | 'viewer')} 
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-sm text-muted-foreground">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedUser || addMember.isPending}
            >
              {addMember.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTeamMemberDialog;

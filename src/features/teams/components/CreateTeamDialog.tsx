
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { useTeamMutations } from '@/features/teams/hooks/useTeamManagement';
import { useQueryClient } from '@tanstack/react-query';

interface CreateTeamDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}

const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({ open, onClose, organizationId }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const { createTeamWithCreator } = useTeamMutations();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a team",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTeamWithCreator.mutateAsync({
        teamData: {
          name: name.trim(),
          description: description.trim() || null,
          organization_id: organizationId
        },
        creatorId: user.id
      });

      toast({
        title: "Success",
        description: "Team created successfully",
      });

      // Invalidate access snapshot for permissions
      queryClient.invalidateQueries({ queryKey: ['access-snapshot'] });
      
      
      // Reset form and close
      setName('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error creating team:', error);
      // Error toast is handled by useTeamMutations hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new team to organize your maintenance work and assign team members.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter team description (optional)"
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTeamWithCreator.isPending}>
              {createTeamWithCreator.isPending ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamDialog;

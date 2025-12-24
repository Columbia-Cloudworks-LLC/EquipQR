
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { TeamWithMembers } from '@/features/teams/services/teamService';
import { updateTeam } from '@/features/teams/services/teamService';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface TeamMetadataEditorProps {
  open: boolean;
  onClose: () => void;
  team: TeamWithMembers;
}

const TeamMetadataEditor: React.FC<TeamMetadataEditorProps> = ({ 
  open, 
  onClose, 
  team 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const updates = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
    };

    setIsLoading(true);
    try {
      await updateTeam(team.id, updates);
      
      // Invalidate queries to refresh team data
      queryClient.invalidateQueries({ queryKey: ['team', team.id] });
      queryClient.invalidateQueries({ queryKey: ['teams', team.organization_id] });
      
      toast({
        title: "Team updated",
        description: "Team information has been successfully updated.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error updating team",
        description: error instanceof Error ? error.message : "Failed to update team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Team Information</DialogTitle>
          <DialogDescription>
            Update the team's basic information and settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={team.name}
                  placeholder="e.g., Maintenance Team"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={team.description}
                  placeholder="Brief description of the team's responsibilities..."
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMetadataEditor;

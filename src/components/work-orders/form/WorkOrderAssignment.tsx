import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { User, Users } from "lucide-react";
import { WorkOrderFormData } from '@/hooks/useWorkOrderForm';
import { useWorkOrderAssignmentOptions } from '@/hooks/useWorkOrderAssignment';
import { useTeams } from '@/hooks/useTeamManagement';

interface WorkOrderAssignmentProps {
  values: Pick<WorkOrderFormData, 'assignmentType' | 'assignmentId'>;
  errors: Partial<Record<'assignmentType' | 'assignmentId', string>>;
  setValue: <K extends keyof WorkOrderFormData>(field: K, value: WorkOrderFormData[K]) => void;
  organizationId: string;
}

export const WorkOrderAssignment: React.FC<WorkOrderAssignmentProps> = ({
  values,
  errors,
  setValue,
  organizationId
}) => {
  const { assignmentOptions, isLoading: isLoadingMembers } = useWorkOrderAssignmentOptions(organizationId);
  const { data: teams = [], isLoading: isLoadingTeams } = useTeams(organizationId);

  const assignmentType = values.assignmentType || 'unassigned';

  const handleAssignmentTypeChange = (type: 'unassigned' | 'user' | 'team') => {
    setValue('assignmentType', type);
    // Clear assignment ID when switching types
    setValue('assignmentId', null);
  };

  const handleAssigneeChange = (userId: string) => {
    setValue('assignmentId', userId);
  };

  const handleTeamChange = (teamId: string) => {
    setValue('assignmentId', teamId);
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Assignment
        </h3>
        
        <div className="space-y-2">
          <Label>Assignment Type</Label>
          <Select 
            value={assignmentType}
            onValueChange={handleAssignmentTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select assignment type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Unassigned
                </div>
              </SelectItem>
              <SelectItem value="user">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assign to User
                </div>
              </SelectItem>
              <SelectItem value="team">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assign to Team
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.assignmentType && (
            <p className="text-sm text-destructive">{errors.assignmentType}</p>
          )}
        </div>

        {assignmentType === 'user' && (
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select
              value={values.assignmentId || ''}
              onValueChange={handleAssigneeChange}
              disabled={isLoadingMembers}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee..." />
              </SelectTrigger>
              <SelectContent>
                {assignmentOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div>
                        <span>{option.name}</span>
                        {option.role && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({option.role})
                          </span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assignmentId && (
              <p className="text-sm text-destructive">{errors.assignmentId}</p>
            )}
          </div>
        )}

        {assignmentType === 'team' && (
          <div className="space-y-2">
            <Label>Team</Label>
            <Select
              value={values.assignmentId || ''}
              onValueChange={handleTeamChange}
              disabled={isLoadingTeams}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team..." />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <div>
                        <span>{team.name}</span>
                        {team.member_count !== undefined && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({team.member_count} members)
                          </span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assignmentId && (
              <p className="text-sm text-destructive">{errors.assignmentId}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


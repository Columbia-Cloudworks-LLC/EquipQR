import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from 'react-hook-form';
import { useTeams } from '@/features/teams/hooks/useTeams';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';

interface TeamSelectionSectionProps {
  form: UseFormReturn<import('@/features/equipment/types/equipment').EquipmentFormData>;
}

const TeamSelectionSection: React.FC<TeamSelectionSectionProps> = ({ form }) => {
  const { teams, isLoading } = useTeams();
  const { hasRole, canCreateEquipmentForTeam } = usePermissions();
  const isAdmin = hasRole(['owner', 'admin']);

  // Owners/admins see every team in the org; team managers and technicians
  // see only the teams where they hold a create-capable role (issue #650).
  // The per-team gate mirrors the equipment.create permission rule and the
  // `team_members_create_equipment` RLS policy.
  const availableTeams = isAdmin
    ? teams
    : teams.filter(team => canCreateEquipmentForTeam(team.id));
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">Loading teams...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Team Assignment
        </h3>
        
        <FormField
          control={form.control}
          name="team_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Assign to Team {!isAdmin && '*'}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      isAdmin 
                        ? "Select a team (optional)" 
                        : "Select a team"
                    } />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isAdmin && (
                    <SelectItem value="unassigned">No team assigned</SelectItem>
                  )}
                  {availableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                      {team.description && (
                        <span className="text-muted-foreground ml-2">
                          - {team.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isAdmin && availableTeams.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  You must be a team manager or technician on at least one team to create equipment.
                </p>
              )}
              {!isAdmin && availableTeams.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  You can only assign equipment to teams where you are a manager or technician.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default TeamSelectionSection;
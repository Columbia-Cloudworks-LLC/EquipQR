import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { useTeams } from '@/features/teams/hooks/useTeams';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';
import TeamPickerWithCreate from '@/features/teams/components/TeamPickerWithCreate';

interface TeamSelectionSectionProps {
  form: UseFormReturn<import('@/features/equipment/types/equipment').EquipmentFormData>;
  onRequestUnassignedConfirm?: () => void;
}

const TeamSelectionSection: React.FC<TeamSelectionSectionProps> = ({
  form,
  onRequestUnassignedConfirm,
}) => {
  const { teams, isLoading } = useTeams();
  const { hasRole, canCreateEquipmentForTeam } = usePermissions();
  const isAdmin = hasRole(['owner', 'admin']);
  const teamFilter = isAdmin
    ? undefined
    : (team: { id: string }) => canCreateEquipmentForTeam(team.id);
  const filteredTeamCount = isAdmin
    ? teams.length
    : teams.filter((team) => canCreateEquipmentForTeam(team.id)).length;

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
              <TeamPickerWithCreate
                value={field.value && field.value !== 'unassigned' ? field.value : ''}
                onChange={(teamId) => field.onChange(teamId || 'unassigned')}
                requireTeam={!isAdmin}
                showBillingCallout
                allowUnassigned={isAdmin}
                onRequestUnassignedConfirm={isAdmin ? onRequestUnassignedConfirm : undefined}
                teamFilter={teamFilter}
                id="equipment-form-team"
              />
              {!isAdmin && filteredTeamCount === 0 && (
                <p className="text-sm text-muted-foreground">
                  You must be a team manager or technician on at least one team to create equipment.
                </p>
              )}
              {!isAdmin && filteredTeamCount > 0 && (
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

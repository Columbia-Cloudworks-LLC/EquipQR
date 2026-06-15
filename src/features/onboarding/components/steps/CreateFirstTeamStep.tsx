import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Users } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMutations } from '@/features/teams/hooks/useTeamManagement';
import { useCustomerMutations } from '@/features/teams/hooks/useCustomerAccount';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  TeamCreateFields,
  buildTeamCreatePayload,
  emptyTeamCreateFieldsValue,
  resolveTeamCreateCustomerId,
} from '@/features/teams/components/TeamCreateFields';

interface CreateFirstTeamStepProps {
  onTeamCreated: (teamId: string) => void;
}

export const CreateFirstTeamStep: React.FC<CreateFirstTeamStepProps> = ({ onTeamCreated }) => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { createTeamWithCreator } = useTeamMutations();
  const customerMutations = useCustomerMutations(currentOrganization?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [fields, setFields] = useState(emptyTeamCreateFieldsValue);
  const [nameError, setNameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.name.trim()) {
      setNameError('Team name is required');
      return;
    }
    if (!currentOrganization?.id || !user?.id) {
      return;
    }

    setIsSubmitting(true);
    try {
      const customerId = await resolveTeamCreateCustomerId(
        currentOrganization.id,
        fields,
        (input) => customerMutations.create.mutateAsync(input),
      );

      const team = await createTeamWithCreator.mutateAsync({
        teamData: buildTeamCreatePayload(currentOrganization.id, fields, customerId),
        creatorId: user.id,
      });

      queryClient.invalidateQueries({ queryKey: ['access-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['teams', currentOrganization.id] });

      toast({
        title: 'Team created',
        description: `"${team.name}" is ready for equipment.`,
      });

      onTeamCreated(team.id);
    } catch (error) {
      console.error('Create first team failed:', error);
      toast({
        title: 'Could not create team',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentOrganization?.id) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="onboarding-step-create-team">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertTitle>What is a team?</AlertTitle>
        <AlertDescription>
          A team can represent people in a department at your organization, or a customer whose
          heavy equipment you service. Equipment and work orders are organized by team so invoices
          reach the right account.
        </AlertDescription>
      </Alert>

      <TeamCreateFields
        organizationId={currentOrganization.id}
        value={fields}
        onChange={(next) => {
          setFields(next);
          if (next.name.trim()) setNameError('');
        }}
        nameError={nameError}
        idPrefix="onboarding-team"
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating team...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
};

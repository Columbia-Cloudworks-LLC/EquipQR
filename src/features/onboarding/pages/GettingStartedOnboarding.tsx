import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAppToast } from '@/hooks/useAppToast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { CreateFirstTeamStep } from '@/features/onboarding/components/steps/CreateFirstTeamStep';
import { CreateFirstEquipmentStep } from '@/features/onboarding/components/steps/CreateFirstEquipmentStep';
import { QRCodeOnboardingStep } from '@/features/onboarding/components/steps/QRCodeOnboardingStep';
import {
  useCompleteProductOnboarding,
  useProductOnboardingStatus,
} from '@/features/onboarding/hooks/useProductOnboarding';
import { useEquipmentList } from '@/features/equipment/hooks/useEquipment';
import { useTeams } from '@/features/teams/hooks/useTeams';
import { cn } from '@/lib/utils';

const STEP_LABELS = ['Create your first team', 'Add your first equipment', 'Affix the QR code'] as const;

function resolveInitialStep(teamsCount: number, equipmentCount: number): number {
  if (teamsCount === 0) {
    return 1;
  }
  if (equipmentCount === 0) {
    return 2;
  }
  return 3;
}

const GettingStartedOnboarding = () => {
  useDocumentTitle('Getting Started');
  const navigate = useNavigate();
  const { toast } = useAppToast();
  const { organizationId } = useOrganization();
  const completeOnboarding = useCompleteProductOnboarding();
  const {
    data: status,
    isLoading,
    isPending,
    isFetched,
    isError,
  } = useProductOnboardingStatus();

  const [step, setStep] = useState(1);
  const [stepInitialized, setStepInitialized] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [equipmentName, setEquipmentName] = useState('');

  const initialStep = useMemo(() => {
    if (!status) {
      return 1;
    }
    return resolveInitialStep(status.teams_count, status.equipment_count);
  }, [status]);

  useEffect(() => {
    if (status && !stepInitialized) {
      setStep(initialStep);
      setStepInitialized(true);
    }
  }, [status, initialStep, stepInitialized]);

  const { teams } = useTeams();
  useEffect(() => {
    if (teamId || !teams?.length) {
      return;
    }
    if (step >= 2 && (status?.teams_count ?? 0) > 0) {
      setTeamId(teams[0].id);
    }
  }, [teamId, teams, step, status?.teams_count]);

  const shouldPreloadEquipment =
    step === 3 && !equipmentId && (status?.equipment_count ?? 0) > 0;
  const { data: equipmentListResult } = useEquipmentList(
    organizationId,
    {},
    { pageSize: 1, sortField: 'created_at', sortDirection: 'desc' },
    { enabled: shouldPreloadEquipment },
  );

  useEffect(() => {
    const firstEquipment = equipmentListResult?.data?.[0];
    if (firstEquipment && !equipmentId) {
      setEquipmentId(firstEquipment.id);
      setEquipmentName(firstEquipment.name);
    }
  }, [equipmentListResult, equipmentId]);

  const handleFinish = useCallback(async () => {
    try {
      await completeOnboarding.mutateAsync();
      toast({
        title: 'Setup complete',
        description: 'Your organization is ready. Scan the QR code you printed to try it in the field.',
        variant: 'success',
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Complete onboarding failed:', error);
      toast({
        title: 'Could not finish setup',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  }, [completeOnboarding, navigate, toast]);

  const statusPending = isPending || isLoading || (!isFetched && !isError);

  if (statusPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-muted-foreground"
          aria-label="Loading onboarding"
        />
      </div>
    );
  }

  if (!isError && status && (!status.is_org_admin || !status.needs_onboarding)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Page maxWidth="2xl" padding="responsive" data-testid="getting-started-onboarding">
      <PageHeader
        title="Welcome to EquipQR"
        description="Complete these steps to connect your equipment to the field."
      />

      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = step === stepNumber;
          const isComplete = step > stepNumber;
          return (
            <div
              key={label}
              className={cn(
                'flex items-center gap-2 text-sm',
                isActive && 'font-medium text-foreground',
                isComplete && 'text-muted-foreground',
                !isActive && !isComplete && 'text-muted-foreground/70',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs',
                  isActive && 'border-primary bg-primary text-primary-foreground',
                  isComplete && 'border-primary/50 bg-primary/10 text-primary',
                )}
              >
                {stepNumber}
              </span>
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <CreateFirstTeamStep
          onTeamCreated={(id) => {
            setTeamId(id);
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <CreateFirstEquipmentStep
          defaultTeamId={teamId}
          onEquipmentCreated={(id, name) => {
            setEquipmentId(id);
            setEquipmentName(name);
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && equipmentId && (
        <QRCodeOnboardingStep
          equipmentId={equipmentId}
          equipmentName={equipmentName}
          onFinish={handleFinish}
          isFinishing={completeOnboarding.isPending}
        />
      )}
    </Page>
  );
};

export default GettingStartedOnboarding;

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAppToast } from '@/hooks/useAppToast';
import { CreateFirstTeamStep } from '@/features/onboarding/components/steps/CreateFirstTeamStep';
import { CreateFirstEquipmentStep } from '@/features/onboarding/components/steps/CreateFirstEquipmentStep';
import { QRCodeOnboardingStep } from '@/features/onboarding/components/steps/QRCodeOnboardingStep';
import { useCompleteProductOnboarding } from '@/features/onboarding/hooks/useProductOnboarding';
import { cn } from '@/lib/utils';

const STEP_LABELS = ['Create your first team', 'Add your first equipment', 'Affix the QR code'] as const;

const GettingStartedOnboarding = () => {
  useDocumentTitle('Getting Started');
  const navigate = useNavigate();
  const { toast } = useAppToast();
  const completeOnboarding = useCompleteProductOnboarding();

  const [step, setStep] = useState(1);
  const [teamId, setTeamId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [equipmentName, setEquipmentName] = useState('');

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

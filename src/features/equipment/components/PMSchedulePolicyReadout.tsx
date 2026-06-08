import type { PMSchedulePolicyDisplay } from '@/features/pm-templates/services/pmIntervalPolicyService';

type PMSchedulePolicyReadoutProps = {
  display: PMSchedulePolicyDisplay;
  className?: string;
};

export function PMSchedulePolicyReadout({ display, className }: PMSchedulePolicyReadoutProps) {
  return (
    <div className={className ?? 'flex min-w-0 flex-col gap-0.5'}>
      <span className="text-base text-foreground">{display.primary}</span>
      {display.secondary ? (
        <span className="text-sm text-muted-foreground">{display.secondary}</span>
      ) : null}
    </div>
  );
}

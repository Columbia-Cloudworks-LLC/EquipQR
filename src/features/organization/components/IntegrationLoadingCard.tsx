import { Loader2 } from 'lucide-react';
import { IntegrationCardLayout } from '@/features/organization/components/IntegrationCardLayout';

type IntegrationLoadingCardProps = {
  label: string;
};

export function IntegrationLoadingCard({ label }: IntegrationLoadingCardProps) {
  return (
    <IntegrationCardLayout>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </IntegrationCardLayout>
  );
}

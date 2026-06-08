import { Loader2 } from 'lucide-react';

type IntegrationLoadingCardProps = {
  label: string;
};

export function IntegrationLoadingCard({ label }: IntegrationLoadingCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}

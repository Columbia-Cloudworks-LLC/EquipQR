import { Badge } from '@/components/ui/badge';

type IntegrationNotConfiguredCardProps = {
  title: string;
  description: string;
};

export function IntegrationNotConfiguredCard({
  title,
  description,
}: IntegrationNotConfiguredCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary" className="self-start sm:self-auto">
          Not configured
        </Badge>
      </div>
    </div>
  );
}

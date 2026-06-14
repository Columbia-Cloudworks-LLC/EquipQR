import { Badge } from '@/components/ui/badge';
import {
  IntegrationCardHeader,
  IntegrationCardLayout,
} from '@/features/organization/components/IntegrationCardLayout';

type IntegrationNotConfiguredCardProps = {
  title: string;
  description: string;
};

export function IntegrationNotConfiguredCard({
  title,
  description,
}: IntegrationNotConfiguredCardProps) {
  return (
    <IntegrationCardLayout>
      <IntegrationCardHeader
        title={title}
        description={description}
        badge={
          <Badge variant="secondary" className="text-xs">
            Not configured
          </Badge>
        }
      />
    </IntegrationCardLayout>
  );
}

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  IntegrationCardHeader,
  IntegrationCardLayout,
} from '@/features/organization/components/IntegrationCardLayout';

type IntegrationNotConfiguredCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
};

export function IntegrationNotConfiguredCard({
  title,
  description,
  icon,
}: IntegrationNotConfiguredCardProps) {
  return (
    <IntegrationCardLayout>
      <IntegrationCardHeader
        title={title}
        description={description}
        icon={icon}
        badge={
          <Badge variant="secondary" className="text-xs">
            Not configured
          </Badge>
        }
      />
    </IntegrationCardLayout>
  );
}

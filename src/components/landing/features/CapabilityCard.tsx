import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface CapabilityCardProps {
  icon: LucideIcon;
  name: string;
  description: string;
}

export const CapabilityCard = ({ icon: Icon, name, description }: CapabilityCardProps) => {
  return (
    <Card className="border-border bg-card hover:bg-card/80 transition-colors">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <Icon className="h-6 w-6 text-primary" />
          <CardTitle className="text-lg">{name}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
};

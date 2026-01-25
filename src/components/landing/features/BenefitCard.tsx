import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface BenefitCardProps {
  icon: LucideIcon;
  iconColor?: 'success' | 'warning' | 'info' | 'error';
  title: string;
  subtitle: string;
  description: string;
  benefits: string[];
  benefitColor?: 'success' | 'warning' | 'info' | 'error';
}

const colorMap = {
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
  error: 'text-destructive',
};

const dotColorMap = {
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  error: 'bg-destructive',
};

export const BenefitCard = ({
  icon: Icon,
  iconColor = 'success',
  title,
  subtitle,
  description,
  benefits,
  benefitColor = 'success',
}: BenefitCardProps) => {
  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
      <CardHeader className="pb-4">
        <div className="mb-4">
          <Icon className={`h-10 w-10 ${colorMap[iconColor]}`} />
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="text-base">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
        <ul className="mt-4 space-y-2">
          {benefits.map((benefit, index) => (
            <li key={index} className="text-sm text-muted-foreground flex items-center">
              <span className={`w-1.5 h-1.5 ${dotColorMap[benefitColor]} rounded-full mr-2 flex-shrink-0`} />
              {benefit}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

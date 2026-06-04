import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LegalPolicySectionProps {
  title: string;
  id?: string;
  className?: string;
  children: ReactNode;
}

/** Shared Card shell for legal policy pages (wording lives in children). */
export const LegalPolicySection = ({ title, id, className, children }: LegalPolicySectionProps) => (
  <Card id={id} className={className}>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="prose prose-sm max-w-none dark:prose-invert">{children}</CardContent>
  </Card>
);

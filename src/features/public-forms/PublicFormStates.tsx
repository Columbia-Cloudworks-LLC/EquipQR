/**
 * Shared page states for public token-gated forms: loading, unavailable
 * link, and post-submit confirmation.
 */

import { CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PublicFormLoadingState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

export function PublicFormErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Alert className="max-w-md">
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}

export function PublicFormSuccessCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground text-center">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DsrRequest } from '@/features/dsr/api/dsrApi';

interface DsrChecklistPanelProps {
  request: DsrRequest;
}

export function DsrChecklistPanel({ request }: DsrChecklistPanelProps) {
  const requiredSteps = request.required_checklist_steps ?? [];
  const progress = (request.checklist_progress ?? {}) as Record<string, { completed_at?: string; actor_email?: string }>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {requiredSteps.map((step) => {
          const info = progress[step];
          const done = Boolean(info?.completed_at);
          return (
            <div key={step} className="rounded-md border p-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{step}</p>
                <span className={`text-xs ${done ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {done ? 'Completed' : 'Pending'}
                </span>
              </div>
              {done && (
                <p className="text-xs text-muted-foreground mt-1">
                  {info?.actor_email ?? 'admin'} at {new Date(info?.completed_at as string).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

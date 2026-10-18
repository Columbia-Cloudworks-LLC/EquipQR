import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ShieldAlert } from 'lucide-react';
import Page from '@/components/layout/Page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewYardForm } from '@/features/dfy/components/NewYardForm';
import { ProvisionedYardDetail } from '@/features/dfy/components/ProvisionedYardDetail';
import { useIsDfyOperator } from '@/features/dfy/hooks/useDfyOperator';
import { dfyProvisioning } from '@/features/dfy/services/dfyProvisioningService';

/**
 * "Provision a yard" for EquipQR operators (issue #1648 review). Hidden from
 * everyone else; the dfy-provisioning Edge Function enforces access.
 */
const ProvisionYardPage = () => {
  const { data: isOperator, isLoading } = useIsDfyOperator();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: yards = [], isLoading: yardsLoading } = useQuery({
    queryKey: ['dfy-unclaimed-yards'],
    queryFn: dfyProvisioning.list,
    enabled: isOperator === true,
  });

  if (isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" />
      </Page>
    );
  }

  if (!isOperator) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Page not available</AlertTitle>
          <AlertDescription>This page is only for EquipQR staff.</AlertDescription>
        </Alert>
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Provision a yard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up a customer&apos;s organization before anyone there has an account. You can change a
            yard here only until its first person signs in.
          </p>
        </div>

        <NewYardForm onCreated={setSelectedId} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Waiting for first sign-in</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {yardsLoading && <Loader2 className="h-4 w-4 animate-spin" aria-label="Loading yards" />}
              {!yardsLoading && yards.length === 0 && (
                <p className="text-sm text-muted-foreground">No unclaimed yards.</p>
              )}
              {yards.map((yard) => (
                <Button
                  key={yard.id}
                  variant={yard.id === selectedId ? 'secondary' : 'ghost'}
                  className="h-auto w-full justify-between whitespace-normal py-2 text-left"
                  onClick={() => setSelectedId(yard.id)}
                >
                  <span className="truncate">{yard.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {yard.pending_staff} staff · {yard.equipment_count} equipment
                  </span>
                </Button>
              ))}
            </CardContent>
          </Card>
          {selectedId && (
            <ProvisionedYardDetail
              key={selectedId}
              organizationId={selectedId}
              onGone={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </Page>
  );
};

export default ProvisionYardPage;

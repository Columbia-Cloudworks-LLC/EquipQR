import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DsrEvidencePanelProps {
  canManageDsr: boolean;
  exportArtifacts: Record<string, unknown> | null;
  onGenerate: () => void;
  onRetry: () => void;
  disabled?: boolean;
}

export function DsrEvidencePanel({
  canManageDsr,
  exportArtifacts,
  onGenerate,
  onRetry,
  disabled,
}: DsrEvidencePanelProps) {
  const status = (exportArtifacts?.status as string | undefined) ?? 'none';
  const version = exportArtifacts?.version as number | undefined;
  const checksum = exportArtifacts?.checksum_sha256 as string | undefined;
  const actionsDisabled = disabled || !canManageDsr;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Evidence Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant={status === 'failed' ? 'destructive' : 'outline'}>{status}</Badge>
        </div>
        {version ? <p className="text-xs text-muted-foreground">Version: {version}</p> : null}
        {checksum ? <p className="text-xs text-muted-foreground break-all">Checksum: {checksum}</p> : null}
        {canManageDsr ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onGenerate} disabled={actionsDisabled}>
              Generate
            </Button>
            <Button size="sm" variant="secondary" onClick={onRetry} disabled={actionsDisabled || status !== 'failed'}>
              Retry
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

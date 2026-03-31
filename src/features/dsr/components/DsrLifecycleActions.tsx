import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DsrLifecycleActionsProps {
  canManageDsr: boolean;
  isProcessing: boolean;
  onStartProcessing: () => void;
  onComplete: () => void;
  onDeny: (reason: string) => void;
  onExtend: (reason: string) => void;
}

export function DsrLifecycleActions({
  canManageDsr,
  isProcessing,
  onStartProcessing,
  onComplete,
  onDeny,
  onExtend,
}: DsrLifecycleActionsProps) {
  const [denyReason, setDenyReason] = useState('');
  const [extendReason, setExtendReason] = useState('');

  if (!canManageDsr) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <h3 className="text-sm font-medium">Lifecycle Actions</h3>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onStartProcessing}>
          Start Processing
        </Button>
        <Button size="sm" onClick={onComplete} disabled={!isProcessing}>
          Complete
        </Button>
      </div>

      <div className="space-y-2">
        <Input
          value={denyReason}
          onChange={(event) => setDenyReason(event.target.value)}
          placeholder="Denial reason"
          aria-label="Denial reason"
        />
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onDeny(denyReason)}
          disabled={!denyReason.trim()}
        >
          Deny Request
        </Button>
      </div>

      <div className="space-y-2">
        <Input
          value={extendReason}
          onChange={(event) => setExtendReason(event.target.value)}
          placeholder="Extension reason"
          aria-label="Extension reason"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => onExtend(extendReason)}
          disabled={!extendReason.trim()}
        >
          Extend Deadline
        </Button>
      </div>
    </div>
  );
}

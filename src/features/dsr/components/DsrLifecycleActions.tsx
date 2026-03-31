import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DsrLifecycleActionsProps {
  canManageDsr: boolean;
  canVerify: boolean;
  isProcessing: boolean;
  onVerify: (verificationMethod: string) => void;
  onComplete: () => void;
  onDeny: (reason: string) => void;
  onExtend: (reason: string) => void;
}

export function DsrLifecycleActions({
  canManageDsr,
  canVerify,
  isProcessing,
  onVerify,
  onComplete,
  onDeny,
  onExtend,
}: DsrLifecycleActionsProps) {
  const [verificationMethod, setVerificationMethod] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [extendReason, setExtendReason] = useState('');

  if (!canManageDsr) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <h3 className="text-sm font-medium">Lifecycle Actions</h3>
      <div className="space-y-2">
        <Select value={verificationMethod} onValueChange={setVerificationMethod} disabled={!canVerify}>
          <SelectTrigger aria-label="Verification method">
            <SelectValue placeholder="Select verification method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="authenticated_match">Authenticated Match</SelectItem>
            <SelectItem value="email_challenge">Email Challenge</SelectItem>
            <SelectItem value="manual_review">Manual Review</SelectItem>
            <SelectItem value="authorized_agent">Authorized Agent</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onVerify(verificationMethod)}
          disabled={!canVerify || !verificationMethod}
        >
          Verify & Start Processing
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
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

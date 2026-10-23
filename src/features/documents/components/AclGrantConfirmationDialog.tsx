import React from 'react';
import { ShieldCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FREE_TIER_DOCUMENT_LIMITS,
  type AclRecipientCandidate,
  type DocumentScopeType,
} from '@/features/documents/types/hierarchicalDocuments';

interface AclGrantConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  scopeType: DocumentScopeType;
  isOverride: boolean;
  recipients: AclRecipientCandidate[];
  isSubmitting: boolean;
  onConfirm: () => void;
}

export const AclGrantConfirmationDialog: React.FC<
  AclGrantConfirmationDialogProps
> = ({
  open,
  onOpenChange,
  documentTitle,
  scopeType,
  isOverride,
  recipients,
  isSubmitting,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Confirm Google Drive Reader Grants
          </DialogTitle>
          <DialogDescription>
            Attaching <strong>{documentTitle}</strong> at the{' '}
            <span className="capitalize">{scopeType}</span> scope (
            {isOverride ? 'override' : 'inherited reference'}) will record and grant
            Google Drive Reader access to the eligible team managers and technicians
            below (capped at {FREE_TIER_DOCUMENT_LIMITS.maxAclEmailsPerAction} recipients).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Users className="h-4 w-4" />
              Eligible Recipients ({recipients.length} /{' '}
              {FREE_TIER_DOCUMENT_LIMITS.maxAclEmailsPerAction})
            </span>
            <span>Org owners/admins excluded (act via Workspace token)</span>
          </div>

          {recipients.length === 0 ? (
            <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              No additional non-admin team managers or technicians require explicit Drive
              Reader grants for this scope. The attachment reference will still be
              recorded.
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
              {recipients.map((recipient) => (
                <div
                  key={recipient.email}
                  className="flex items-center justify-between px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium text-foreground">{recipient.name}</p>
                    <p className="text-muted-foreground">{recipient.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {recipient.teamName && (
                      <Badge variant="outline" className="text-[10px]">
                        {recipient.teamName}
                      </Badge>
                    )}
                    {recipient.teamRole && (
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {recipient.teamRole}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Attaching & Granting...' : 'Confirm Grants & Attach'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

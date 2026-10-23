import React, { useState } from 'react';
import { CheckCircle2, FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useDocumentSignoffs,
  useSignOffCanonicalDocument,
} from '@/features/documents/hooks/useHierarchicalDocuments';
import { formatDateTime, defaultUserSettings } from '@/utils/dateFormatter';
import type { OrganizationDocumentRow } from '@/features/documents/types/hierarchicalDocuments';

interface DocumentSignoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  document: OrganizationDocumentRow | null;
}

export const DocumentSignoffDialog: React.FC<DocumentSignoffDialogProps> = ({
  open,
  onOpenChange,
  organizationId,
  document,
}) => {
  const signoffMutation = useSignOffCanonicalDocument();
  const { data: signoffs = [] } = useDocumentSignoffs(organizationId, document?.id);

  const [mode, setMode] = useState<'affirm' | 'replace'>('affirm');
  const [replacementFileId, setReplacementFileId] = useState('');
  const [replacementTitle, setReplacementTitle] = useState('');
  const [replacementLink, setReplacementLink] = useState('');
  const [notes, setNotes] = useState('');

  if (!document) return null;

  const handleConfirmSignoff = async (event: React.FormEvent) => {
    event.preventDefault();
    await signoffMutation.mutateAsync({
      organizationId,
      documentId: document.id,
      action: mode,
      previousFileId: document.file_id,
      newFileId: mode === 'replace' ? replacementFileId : undefined,
      newTitle: mode === 'replace' ? replacementTitle : undefined,
      newWebViewLink: mode === 'replace' ? replacementLink : undefined,
      notes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" />
            Renewal Sign-Off: {document.title}
          </DialogTitle>
          <DialogDescription>
            Signing off resets the renewal window for all active attachments referencing
            this canonical document.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirmSignoff} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === 'affirm' ? 'default' : 'outline'}
              onClick={() => setMode('affirm')}
            >
              Affirm Current Drive File
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'replace' ? 'default' : 'outline'}
              onClick={() => setMode('replace')}
            >
              Replace Drive File Reference
            </Button>
          </div>

          {mode === 'replace' && (
            <div className="space-y-3 rounded-md border bg-muted/20 p-3">
              <div className="space-y-1">
                <Label htmlFor="signoff-replace-file-id">New Google Drive File ID</Label>
                <Input
                  id="signoff-replace-file-id"
                  value={replacementFileId}
                  onChange={(e) => setReplacementFileId(e.target.value)}
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="signoff-replace-title">Updated Title (optional)</Label>
                <Input
                  id="signoff-replace-title"
                  value={replacementTitle}
                  onChange={(e) => setReplacementTitle(e.target.value)}
                  placeholder={document.title}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="signoff-replace-link">Google Drive Web Link (optional)</Label>
                <Input
                  id="signoff-replace-link"
                  value={replacementLink}
                  onChange={(e) => setReplacementLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="signoff-notes">Audit Notes (optional)</Label>
            <Textarea
              id="signoff-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Policy verified with carrier for current coverage term..."
            />
          </div>

          {signoffs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Recent Sign-Off History
              </p>
              <div className="max-h-32 overflow-y-auto rounded border divide-y text-xs">
                {signoffs.map((entry) => (
                  <div key={entry.id} className="px-2.5 py-1.5 flex items-center justify-between">
                    <span className="capitalize font-medium">{entry.action}</span>
                    <span className="text-muted-foreground">
                      {formatDateTime(entry.signed_at, defaultUserSettings)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={
                signoffMutation.isPending ||
                (mode === 'replace' && !replacementFileId.trim())
              }
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {signoffMutation.isPending ? 'Recording Sign-Off...' : 'Record Sign-Off'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

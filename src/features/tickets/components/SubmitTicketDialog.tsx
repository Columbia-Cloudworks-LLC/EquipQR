import React, { useState } from 'react';
import { useMountFocus } from '@/components/a11y/keyboard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';
import { useSubmitTicket } from '../hooks/useSubmitTicket';
import { collectSessionDiagnostics } from '../utils/sessionDiagnostics';
import {
  DEFAULT_SUPPORT_ACCESS_HOURS,
  grantSupportAccess,
} from '@/features/organization/hooks/useSupportAccess';

interface SubmitTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for submitting in-app bug reports.
 * Automatically gathers comprehensive session diagnostics (anonymized, no PII).
 * Creates a GitHub issue and a database record.
 */
const SubmitTicketDialog: React.FC<SubmitTicketDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { mutate: submitTicket, isPending } = useSubmitTicket();
  const queryClient = useQueryClient();
  const orgContext = useSimpleOrganizationSafe();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [grantSupport, setGrantSupport] = useState(false);
  const supportOrganizationId = orgContext?.currentOrganization?.id;
  const isOwner = orgContext?.currentOrganization?.userRole === 'owner';
  const titleInputRef = useMountFocus<HTMLInputElement>(open);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGrantSupport(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      toast.error('Please fill in both title and description.');
      return;
    }

    if (trimmedTitle.length < 5) {
      toast.error('Title must be at least 5 characters.');
      return;
    }

    if (trimmedDescription.length < 10) {
      toast.error('Description must be at least 10 characters.');
      return;
    }

    // Collect comprehensive session diagnostics (anonymized, no PII)
    const metadata = collectSessionDiagnostics(
      orgContext ? {
        organizationId: orgContext.organizationId,
        currentOrganization: orgContext.currentOrganization,
      } : undefined,
      queryClient,
    );

    submitTicket(
      {
        title: trimmedTitle,
        description: trimmedDescription,
        metadata,
      },
      {
        onSuccess: (result) => {
          toast.success('Issue reported successfully! Our team will review it shortly.');
          if (grantSupport && isOwner && supportOrganizationId) {
            grantSupportAccess({
              organizationId: supportOrganizationId,
              durationHours: DEFAULT_SUPPORT_ACCESS_HOURS,
              source: 'bug_report',
              ticketRef: result.ticketId,
            })
              .then(() => {
                toast.success('EquipQR Support can access your organization for 72 hours.');
                void queryClient.invalidateQueries({ queryKey: ['support-access', supportOrganizationId] });
              })
              .catch((error: unknown) =>
                toast.error(error instanceof Error ? error.message : 'Could not grant support access'),
              );
          }
          resetForm();
          onOpenChange(false);
        },
        onError: (error) => {
          console.error('Failed to submit ticket:', error);
          toast.error('Failed to submit issue. Please try again or email support.');
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isPending) {
      if (!newOpen) {
        resetForm();
      }
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            Describe the problem you encountered. Our team will be notified and
            will follow up. Session diagnostics are automatically captured to
            help us investigate faster.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-title">Title</Label>
            <Input
              ref={titleInputRef}
              id="ticket-title"
              placeholder="Brief summary of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-description">Description / Steps to Reproduce</Label>
            <Textarea
              id="ticket-description"
              placeholder="What happened? What did you expect to happen? How can we reproduce this?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={5000}
              disabled={isPending}
            />
          </div>

          {supportOrganizationId && (
            isOwner ? (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="ticket-grant-support"
                  checked={grantSupport}
                  onCheckedChange={(checked) => setGrantSupport(checked === true)}
                  disabled={isPending}
                />
                <Label htmlFor="ticket-grant-support" className="text-sm font-normal leading-snug">
                  Let EquipQR Support access my organization for 72 hours to look into this
                </Label>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ask your organization owner to grant support access.
              </p>
            )
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitTicketDialog;

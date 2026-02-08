import React, { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';
import { useSubmitTicket } from '../hooks/useSubmitTicket';
import { collectSessionDiagnostics } from '../utils/sessionDiagnostics';

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
  const { user } = useAuth();
  const { mutate: submitTicket, isPending } = useSubmitTicket();
  const queryClient = useQueryClient();
  const orgContext = useSimpleOrganizationSafe();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
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
        onSuccess: () => {
          toast.success('Issue reported successfully! Our team will review it shortly.');
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
      <DialogContent className="sm:max-w-[500px]">
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
              id="ticket-title"
              placeholder="Brief summary of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={isPending}
              autoFocus
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

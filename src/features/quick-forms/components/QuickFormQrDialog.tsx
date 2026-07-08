import React, { useEffect, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { generateQRDataUrl, qrFullUrl, quickFormQRPath } from '@/utils/qr';
import { getQuickFormToken } from '@/features/quick-forms/services/quickFormsService';
import type { QuickForm } from '@/features/quick-forms/services/quickFormsService';
import { logger } from '@/utils/logger';

export interface QuickFormQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: QuickForm | null;
  onRotateToken: (formId: string) => Promise<string>;
  isRotating: boolean;
}

/** QR link dialog for one quick form: shows the QR code, copyable public URL, and rotate control. */
export function QuickFormQrDialog({
  open,
  onOpenChange,
  form,
  onRotateToken,
  isRotating,
}: QuickFormQrDialogProps) {
  const [loading, setLoading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadToken() {
      if (!open || !form) return;
      setLoading(true);
      setPublicUrl(null);
      setQrDataUrl(null);
      try {
        const rawToken = await getQuickFormToken(form.id, form.organization_id);
        if (cancelled) return;
        if (!rawToken) {
          setPublicUrl(null);
          return;
        }
        const url = qrFullUrl(quickFormQRPath(rawToken));
        setPublicUrl(url);
        const dataUrl = await generateQRDataUrl(url);
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (error) {
        logger.error('Failed to load quick form token', error);
        if (!cancelled) toast.error('Unable to load the QR link.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadToken();
    return () => {
      cancelled = true;
    };
  }, [open, form]);

  const handleCopy = () => {
    if (!publicUrl || !navigator.clipboard?.writeText) return;
    navigator.clipboard
      .writeText(publicUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error('Unable to copy the link.'));
  };

  const handleRotate = async () => {
    if (!form) return;
    setConfirmRotate(false);
    try {
      const rawToken = await onRotateToken(form.id);
      const url = qrFullUrl(quickFormQRPath(rawToken));
      setPublicUrl(url);
      setQrDataUrl(await generateQRDataUrl(url));
      toast.success('QR link rotated. Old links no longer work.');
    } catch (error) {
      logger.error('Failed to rotate quick form token', error);
      toast.error('Unable to rotate the QR link.');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick form QR link</DialogTitle>
            <DialogDescription>
              {form?.name} — anyone with this link can submit the form without
              signing in. Rotate the link to revoke previously shared copies.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            {loading ? (
              <Skeleton className="h-56 w-56" />
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ${form?.name ?? 'quick form'}`}
                className="h-56 w-56 rounded-md border bg-white p-2"
                data-testid="quick-form-qr-image"
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center px-4">
                No QR link is available for this form yet. Rotate the link to
                generate a new one.
              </p>
            )}

            {publicUrl && (
              <div className="flex w-full items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">
                  {publicUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handleCopy}
                  aria-label="Copy public link"
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRotate(true)}
              disabled={isRotating || !form}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isRotating ? 'Rotating…' : 'Rotate QR link'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRotate} onOpenChange={setConfirmRotate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate this QR link?</AlertDialogTitle>
            <AlertDialogDescription>
              A new link and QR code will be generated. Every previously printed
              or shared QR code for this form will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRotate()}>
              Rotate link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

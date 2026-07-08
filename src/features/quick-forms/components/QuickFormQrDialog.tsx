import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import AssetQRCodeDisplay from '@/components/common/AssetQRCodeDisplay';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { qrFullUrl, quickFormQRPath } from '@/utils/qr';
import { getQuickFormToken } from '@/features/quick-forms/services/quickFormsService';
import type { QuickForm } from '@/features/quick-forms/services/quickFormsService';
import { logger } from '@/utils/logger';

const QUICK_FORM_QR_INSTRUCTIONS = [
  'Print this QR code or share the link with people on site',
  'Anyone can open the form and submit — no EquipQR sign-in required',
  'Submissions appear in the Quick Forms ledger for owners and admins',
  'Rotate the link to revoke previously printed or shared copies',
];

export interface QuickFormQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: QuickForm | null;
  onRotateToken: (formId: string) => Promise<string>;
  isRotating: boolean;
}

/** QR link dialog for one quick form: shared asset QR layout, rotate control, and public-use instructions. */
export function QuickFormQrDialog({
  open,
  onOpenChange,
  form,
  onRotateToken,
  isRotating,
}: QuickFormQrDialogProps) {
  const [loading, setLoading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadToken() {
      if (!open || !form) return;
      setLoading(true);
      setPublicUrl(null);
      try {
        const rawToken = await getQuickFormToken(form.id, form.organization_id);
        if (cancelled) return;
        if (!rawToken) {
          setPublicUrl(null);
          return;
        }
        setPublicUrl(qrFullUrl(quickFormQRPath(rawToken)));
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

  const handleClose = () => onOpenChange(false);

  const handleRotate = async () => {
    if (!form) return;
    setConfirmRotate(false);
    try {
      const rawToken = await onRotateToken(form.id);
      setPublicUrl(qrFullUrl(quickFormQRPath(rawToken)));
      toast.success('QR link rotated. Old links no longer work.');
    } catch (error) {
      logger.error('Failed to rotate quick form token', error);
      toast.error('Unable to rotate the QR link.');
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick form QR link</DialogTitle>
            <DialogDescription className="sr-only">
              Loading QR link for {form?.name ?? 'quick form'}
            </DialogDescription>
          </DialogHeader>
          <Skeleton className="mx-auto h-56 w-56" />
        </DialogContent>
      </Dialog>
    );
  }

  if (!publicUrl) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            className="max-w-md"
            onInteractOutside={(event) => {
              if (confirmRotate) event.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>Quick form QR link</DialogTitle>
              <DialogDescription>
                {form?.name} — no QR link is available yet. Generate one to share
                with unauthenticated users on site.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground text-center px-4">
              Rotate the link to mint a new public URL and QR code for this form.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mx-auto"
              onClick={() => setConfirmRotate(true)}
              disabled={isRotating || !form}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isRotating ? 'Generating…' : 'Generate QR link'}
            </Button>
          </DialogContent>
        </Dialog>

        <AlertDialog open={confirmRotate} onOpenChange={setConfirmRotate}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Generate this QR link?</AlertDialogTitle>
              <AlertDialogDescription>
                A new public link and QR code will be created for{' '}
                <strong>{form?.name}</strong>. Anyone with the link can submit
                without signing in.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleRotate()}>
                Generate link
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <AssetQRCodeDisplay
        open={open}
        onClose={handleClose}
        entityId={form?.id ?? 'quick-form'}
        entityName={form?.name}
        title="Quick form QR link"
        resourceLabel="quick form"
        qrCodeUrl={publicUrl}
        qrImageAlt={`QR code for ${form?.name ?? 'quick form'}`}
        defaultFilenameStem={form?.name?.replace(/\s+/g, '-') ?? 'quick-form'}
        instructionBullets={QUICK_FORM_QR_INSTRUCTIONS}
        formatSelectId={`quick-form-qr-download-format-${form?.id ?? 'new'}`}
        qrImageTestId="quick-form-qr-image"
        urlTestId="quick-form-public-url"
        onInteractOutside={(event) => {
          if (confirmRotate) event.preventDefault();
        }}
        headerExtra={
          form?.description ? (
            <p className="text-sm text-muted-foreground pb-2">{form.description}</p>
          ) : undefined
        }
        footerExtra={
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setConfirmRotate(true)}
            disabled={isRotating || !form}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isRotating ? 'Rotating…' : 'Rotate QR link'}
          </Button>
        }
      />

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

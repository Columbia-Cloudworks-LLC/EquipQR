import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import AssetQRCodePanel from '@/components/common/AssetQRCodePanel';

export interface AssetQRCodeDisplayProps {
  open: boolean;
  onClose: () => void;
  entityId: string;
  entityName?: string;
  title: string;
  /** Screen-reader description prefix, e.g. "equipment" or "inventory item" */
  resourceLabel: string;
  qrCodeUrl: string;
  qrImageAlt: string;
  /** Used when entityName is absent: `${defaultFilenameStem}-qr.{ext}` */
  defaultFilenameStem: string;
  instructionBullets: string[];
  formatSelectId?: string;
  imageLoading?: 'lazy';
  headerExtra?: React.ReactNode;
  footerExtra?: React.ReactNode;
  suppressQrPanel?: boolean;
  onInteractOutside?: (event: Event) => void;
  qrImageTestId?: string;
  urlTestId?: string;
}

const AssetQRCodeDisplay: React.FC<AssetQRCodeDisplayProps> = ({
  open,
  onClose,
  entityId,
  entityName,
  title,
  resourceLabel,
  qrCodeUrl,
  qrImageAlt,
  defaultFilenameStem,
  instructionBullets,
  formatSelectId = 'qr-code-download-format',
  imageLoading,
  headerExtra,
  footerExtra,
  suppressQrPanel = false,
  onInteractOutside,
  qrImageTestId,
  urlTestId,
}) => {
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onOpenChange={(dialogOpen) => !dialogOpen && onClose()}>
      <DialogContent
        className={`max-w-md ${isMobile ? 'max-h-[calc(100dvh-2rem)] overflow-y-auto p-4' : ''}`}
        onInteractOutside={onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Generate, view, and download QR code for {resourceLabel} {entityName || entityId}
          </DialogDescription>
        </DialogHeader>

        {headerExtra}

        {!suppressQrPanel && (
          <AssetQRCodePanel
            entityId={entityId}
            entityName={entityName}
            qrCodeUrl={qrCodeUrl}
            qrImageAlt={qrImageAlt}
            defaultFilenameStem={defaultFilenameStem}
            instructionBullets={instructionBullets}
            formatSelectId={formatSelectId}
            imageLoading={imageLoading}
            showCloseButton
            onClose={onClose}
            qrImageTestId={qrImageTestId}
            urlTestId={urlTestId}
          />
        )}

        {footerExtra}
      </DialogContent>
    </Dialog>
  );
};

export default AssetQRCodeDisplay;

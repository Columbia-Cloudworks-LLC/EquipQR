import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import AssetQRCodePanel from '@/components/common/AssetQRCodePanel';
import { FIELD_WORKSHEET_EXPORT_POLICY } from '@/features/work-orders/constants/workOrderExportPolicy';
import { useIsMobile } from '@/hooks/use-mobile';
import { qrFullUrl, workOrderQRPath } from '@/utils/qr';
import { ClipboardList, Loader2 } from 'lucide-react';

interface WorkOrderQRCodeDisplayProps {
  open: boolean;
  onClose: () => void;
  workOrderId: string;
  workOrderTitle?: string;
  onPrintFieldWorksheet: () => void;
  isPrintingWorksheet?: boolean;
}

const WORK_ORDER_QR_INSTRUCTIONS = [
  'Print the field worksheet or download this QR code for paperwork you take into the field',
  'The worksheet footer includes a QR code that links directly back to this work order',
  'Office staff can scan completed paperwork to reopen the work order and enter results',
  'Technicians who cannot use the app in adverse conditions can complete the paper checklist instead',
];

const WorkOrderQRCodeDisplay: React.FC<WorkOrderQRCodeDisplayProps> = ({
  open,
  onClose,
  workOrderId,
  workOrderTitle,
  onPrintFieldWorksheet,
  isPrintingWorksheet = false,
}) => {
  const isMobile = useIsMobile();
  const qrCodeUrl = qrFullUrl(workOrderQRPath(workOrderId));
  const filenameStem = workOrderTitle
    ? workOrderTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    : `work-order-${workOrderId}`;

  return (
    <Dialog open={open} onOpenChange={(dialogOpen) => !dialogOpen && onClose()}>
      <DialogContent className={`max-w-md ${isMobile ? 'max-h-[calc(100dvh-2rem)] overflow-y-auto p-4' : ''}`}>
        <DialogHeader>
          <DialogTitle>Work Order QR &amp; Print</DialogTitle>
          <DialogDescription className="sr-only">
            Generate a QR code and printable field worksheet for work order {workOrderTitle || workOrderId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <AssetQRCodePanel
            entityId={workOrderId}
            entityName={workOrderTitle}
            qrCodeUrl={qrCodeUrl}
            qrImageAlt="Work order QR code"
            defaultFilenameStem={filenameStem}
            instructionBullets={WORK_ORDER_QR_INSTRUCTIONS}
            formatSelectId="work-order-qr-download-format"
            imageLoading="lazy"
          />

          <Separator />

          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {FIELD_WORKSHEET_EXPORT_POLICY.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {FIELD_WORKSHEET_EXPORT_POLICY.description}
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="w-full min-h-11"
              onClick={onPrintFieldWorksheet}
              disabled={isPrintingWorksheet}
            >
              {isPrintingWorksheet ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ClipboardList className="h-4 w-4" aria-hidden />
              )}
              Print field worksheet (PDF)
            </Button>
          </div>

          <Button type="button" variant="outline" className="w-full min-h-11" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderQRCodeDisplay;

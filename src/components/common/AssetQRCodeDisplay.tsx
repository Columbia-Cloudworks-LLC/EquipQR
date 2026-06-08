import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { generateQRDataUrl } from '@/utils/qr';

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
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
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
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [selectedFormat, setSelectedFormat] = React.useState<'png' | 'jpg'>('png');
  const isMobile = useIsMobile();

  const generateQRCode = React.useCallback(async () => {
    try {
      const dataUrl = await generateQRDataUrl(qrCodeUrl);
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    }
  }, [qrCodeUrl]);

  React.useEffect(() => {
    if (open && entityId) {
      generateQRCode();
    }
  }, [open, entityId, generateQRCode]);

  React.useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  const baseFilename = entityName ? sanitizeFilename(entityName) : defaultFilenameStem;

  const downloadQRCode = async () => {
    if (!qrCodeDataUrl) return;

    try {
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(qrCodeUrl, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        type: selectedFormat === 'jpg' ? 'image/jpeg' : 'image/png',
      });

      const link = document.createElement('a');
      link.download = `${baseFilename}-qr.${selectedFormat}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`QR code downloaded as ${selectedFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    }
  };

  const copyQRCodeUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      setCopied(true);
      toast.success('QR code URL copied to clipboard');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      toast.error('Failed to copy URL');
    }
  };

  const testQRCodeUrl = () => {
    window.open(qrCodeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={(dialogOpen) => !dialogOpen && onClose()}>
      <DialogContent className={`max-w-md ${isMobile ? 'max-h-[calc(100dvh-2rem)] overflow-y-auto p-4' : ''}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Generate, view, and download QR code for {resourceLabel} {entityName || entityId}
          </DialogDescription>
        </DialogHeader>

        <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
          <div className="flex justify-center">
            {qrCodeDataUrl ? (
              <div className={`${isMobile ? 'p-2' : 'p-4'} bg-background rounded-lg border`}>
                <img
                  src={qrCodeDataUrl}
                  alt={qrImageAlt}
                  loading={imageLoading}
                  className={isMobile ? 'w-48 h-48' : 'w-64 h-64'}
                />
              </div>
            ) : (
              <div
                className={`${isMobile ? 'w-48 h-48' : 'w-64 h-64'} bg-muted rounded-lg flex items-center justify-center`}
              >
                <div className="text-muted-foreground text-center px-2">Generating QR code...</div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">QR Code URL:</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-muted rounded border text-sm font-mono break-all text-muted-foreground">
                {qrCodeUrl}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyQRCodeUrl}
                  className="flex items-center gap-1"
                  aria-label="Copy URL to clipboard"
                  disabled={copied}
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                {copied && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testQRCodeUrl}
                    className="flex items-center gap-1"
                    aria-label="Open URL in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Test
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor={formatSelectId} className="text-sm font-medium text-foreground">
                Download Format:
              </label>
              <Select value={selectedFormat} onValueChange={(value: 'png' | 'jpg') => setSelectedFormat(value)}>
                <SelectTrigger id={formatSelectId} className={isMobile ? 'w-full min-h-11' : 'w-full'}>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Filename:</span> {`${baseFilename}-qr.${selectedFormat}`}
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1 text-foreground">How to use:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {instructionBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2 [&>button]:min-h-[44px]">
            <Button onClick={downloadQRCode} disabled={!qrCodeDataUrl} className="flex-1">
              <Download className="h-4 w-4" />
              Download {selectedFormat.toUpperCase()}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssetQRCodeDisplay;

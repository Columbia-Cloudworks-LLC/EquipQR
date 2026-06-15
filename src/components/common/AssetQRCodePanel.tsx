import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { generateQRDataUrl } from '@/utils/qr';

export interface AssetQRCodePanelProps {
  entityId: string;
  entityName?: string;
  qrCodeUrl: string;
  qrImageAlt: string;
  defaultFilenameStem: string;
  instructionBullets: string[];
  formatSelectId?: string;
  imageLoading?: 'lazy';
  showCloseButton?: boolean;
  onClose?: () => void;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

const AssetQRCodePanel: React.FC<AssetQRCodePanelProps> = ({
  entityId,
  entityName,
  qrCodeUrl,
  qrImageAlt,
  defaultFilenameStem,
  instructionBullets,
  formatSelectId = 'qr-code-download-format',
  imageLoading,
  showCloseButton = false,
  onClose,
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
    if (entityId) {
      generateQRCode();
    }
  }, [entityId, generateQRCode]);

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
        <span className="text-sm font-medium text-foreground">QR Code URL:</span>
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
        {showCloseButton && onClose && (
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        )}
      </div>
    </div>
  );
};

export default AssetQRCodePanel;


import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Copy, CheckCircle } from 'lucide-react';
// QRCode is loaded dynamically to reduce initial bundle size (~100KB)
// It's only needed when the QR code dialog is opened
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface QRCodeDisplayProps {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentName?: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ open, onClose, equipmentId, equipmentName }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string>('');
  const [copied, setCopied] = React.useState(false);
  const [selectedFormat, setSelectedFormat] = React.useState<'png' | 'jpg'>('png');
  const isMobile = useIsMobile();

  // Generate QR code URL - use explicit route to avoid collisions with other QR types
  const qrCodeUrl = `${window.location.origin}/qr/equipment/${equipmentId}`;

  const generateQRCode = React.useCallback(async () => {
    try {
      // Dynamically load QRCode only when QR generation is triggered
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(qrCodeUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    }
  }, [qrCodeUrl]);

  React.useEffect(() => {
    if (open && equipmentId) {
      generateQRCode();
    }
  }, [open, equipmentId, generateQRCode]);

  // Sanitize equipment name for filename
  const sanitizeFilename = (name: string) => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };

  const downloadQRCode = async () => {
    if (!qrCodeDataUrl) return;

    try {
      // Generate QR code in the selected format
      const formatOptions = {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        type: selectedFormat === 'jpg' ? 'image/jpeg' : 'image/png'
      };

      const dataUrl = await QRCode.toDataURL(qrCodeUrl, formatOptions);
      
      const link = document.createElement('a');
      const baseFilename = equipmentName ? sanitizeFilename(equipmentName) : `equipment-${equipmentId}`;
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
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      toast.error('Failed to copy URL');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`max-w-md ${isMobile ? 'max-h-[calc(100dvh-2rem)] overflow-y-auto p-4' : ''}`}>
        <DialogHeader>
          <DialogTitle>Equipment QR Code</DialogTitle>
          <DialogDescription className="sr-only">
            Generate, view, and download QR code for equipment {equipmentName || equipmentId}
          </DialogDescription>
        </DialogHeader>
        
        <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
          {/* QR Code Display */}
          <div className="flex justify-center">
            {qrCodeDataUrl ? (
              <div className={`${isMobile ? 'p-2' : 'p-4'} bg-white rounded-lg border`}>
                <img 
                  src={qrCodeDataUrl} 
                  alt="Equipment QR Code"
                  className={isMobile ? 'w-48 h-48' : 'w-64 h-64'}
                />
              </div>
            ) : (
              <div className={`${isMobile ? 'w-48 h-48' : 'w-64 h-64'} bg-muted rounded-lg flex items-center justify-center`}>
                <div className="text-muted-foreground text-center px-2">Generating QR code...</div>
              </div>
            )}
          </div>

          {/* QR Code URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              QR Code URL:
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-muted rounded border text-sm font-mono break-all text-muted-foreground">
                {qrCodeUrl}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyQRCodeUrl}
                className="flex items-center gap-1"
                aria-label="Copy URL to clipboard"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Download Options */}
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Download Format:
              </label>
              <Select value={selectedFormat} onValueChange={(value: 'png' | 'jpg') => setSelectedFormat(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Filename:</span>{' '}
              {(() => {
                const baseFilename = equipmentName ? sanitizeFilename(equipmentName) : `equipment-${equipmentId}`;
                return `${baseFilename}-qr.${selectedFormat}`;
              })()}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1 text-foreground">How to use:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Print this QR code and attach it to the equipment</li>
              <li>Users can scan it with any QR code scanner</li>
              <li>They'll be taken directly to this equipment's details</li>
              <li>Scans are automatically logged with location data</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={downloadQRCode}
              disabled={!qrCodeDataUrl}
              className="flex items-center gap-2 flex-1"
            >
              <Download className="h-4 w-4" />
              Download {selectedFormat.toUpperCase()}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeDisplay;

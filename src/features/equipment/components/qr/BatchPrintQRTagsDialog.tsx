import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Printer, QrCode, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createQRTagBatch,
  listUnassignedQRTags,
  type EquipmentQRTagRow,
} from '@/features/equipment/services/equipmentQRTagService';
import { equipmentQRPath, generateQRDataUrl, qrFullUrl } from '@/utils/qr';

interface BatchPrintQRTagsDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
}

type LabelPrintFormat = 'sheet' | 'roll-2x2';

const BatchPrintQRTagsDialog: React.FC<BatchPrintQRTagsDialogProps> = ({
  open,
  onClose,
  organizationId,
  organizationName,
}) => {
  const [batchSize, setBatchSize] = useState<string>('12');
  const [batchName, setBatchName] = useState<string>('');
  const [printFormat, setPrintFormat] = useState<LabelPrintFormat>('sheet');
  const [tags, setTags] = useState<EquipmentQRTagRow[]>([]);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadTags = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const existing = await listUnassignedQRTags(organizationId, 48);
      setTags(existing);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load unassigned QR tags');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (open) {
      void loadTags();
    }
  }, [open, loadTags]);

  useEffect(() => {
    if (!open || tags.length === 0) return;

    let cancelled = false;
    const renderMissingQrCodes = async () => {
      const updates: Record<string, string> = {};
      for (const tag of tags) {
        if (qrDataUrls[tag.id]) continue;
        try {
          const url = qrFullUrl(equipmentQRPath(tag.id, organizationId));
          const dataUrl = await generateQRDataUrl(url);
          updates[tag.id] = dataUrl;
        } catch {
          // Skip failed QR image generation
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setQrDataUrls((prev) => ({ ...prev, ...updates }));
      }
    };

    void renderMissingQrCodes();
    return () => {
      cancelled = true;
    };
  }, [open, tags, organizationId, qrDataUrls]);

  const handleGenerateBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedCount = Number.parseInt(batchSize, 10);
    if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 100) {
      toast.error('Enter a batch size between 1 and 100 tags.');
      return;
    }

    setIsGenerating(true);
    try {
      const created = await createQRTagBatch({
        organizationId,
        count: parsedCount,
        labelBatchName: batchName,
      });
      setTags((prev) => [...created, ...prev]);
      toast.success(`Generated ${created.length} unassigned QR tags for ${organizationName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate QR tags');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Pre-Printed Unassigned QR Tags ("Tag First, Fill Later")
          </DialogTitle>
          <DialogDescription>
            Generate and print durable unassigned QR code labels for {organizationName}. Slap a tag
            onto any incoming machine and scan it with a mobile camera to create or link the
            equipment record on the spot.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleGenerateBatch}
          className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-4 sm:items-end print:hidden"
        >
          <div className="space-y-1.5">
            <Label htmlFor="qr-batch-size">Number of Tags</Label>
            <Select value={batchSize} onValueChange={setBatchSize}>
              <SelectTrigger id="qr-batch-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 tags</SelectItem>
                <SelectItem value="12">12 tags (1 sheet)</SelectItem>
                <SelectItem value="24">24 tags (2 sheets)</SelectItem>
                <SelectItem value="48">48 tags (roll batch)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qr-batch-name">Batch Label (Optional)</Label>
            <Input
              id="qr-batch-name"
              placeholder="e.g. Yard Intake Roll"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qr-print-format">Print Layout</Label>
            <Select
              value={printFormat}
              onValueChange={(value) => setPrintFormat(value as LabelPrintFormat)}
            >
              <SelectTrigger id="qr-print-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sheet">Avery Label Sheet (3×4 Grid)</SelectItem>
                <SelectItem value="roll-2x2">2&quot;×2&quot; Industrial Roll</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? 'Minting...' : 'Generate Batch'}
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{tags.length} Unassigned Tags Ready</Badge>
            <span className="text-xs text-muted-foreground">
              Layout:{' '}
              {printFormat === 'sheet'
                ? 'Avery 3×4 Label Sheet'
                : '2"×2" Thermal Adhesive Roll'}
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={tags.length === 0}
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Labels
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading unassigned QR tags...
          </div>
        ) : tags.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No unassigned QR tags in pool</p>
            <p className="text-xs text-muted-foreground">
              Generate a batch above to print pre-allocated QR stickers for your yard or shop.
            </p>
          </div>
        ) : (
          <div
            data-testid="qr-tag-print-grid"
            data-print-format={printFormat}
            className={
              printFormat === 'sheet'
                ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3'
                : 'mx-auto flex max-w-xs flex-col gap-3'
            }
          >
            {tags.map((tag) => {
              const dataUrl = qrDataUrls[tag.id];
              return (
                <div
                  key={tag.id}
                  className="flex flex-col items-center justify-between rounded-lg border bg-background p-3 text-center shadow-2xs print:break-inside-avoid"
                >
                  <p className="w-full truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {organizationName}
                  </p>
                  {dataUrl ? (
                    <img
                      src={dataUrl}
                      alt={`Unassigned QR tag ${tag.short_code}`}
                      className="my-1.5 h-28 w-28 object-contain"
                    />
                  ) : (
                    <div className="my-1.5 flex h-28 w-28 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                      Rendering QR...
                    </div>
                  )}
                  <p className="font-mono text-xs font-bold text-foreground">{tag.short_code}</p>
                  <p className="text-[10px] text-muted-foreground">Scan to Claim Equipment</p>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BatchPrintQRTagsDialog;

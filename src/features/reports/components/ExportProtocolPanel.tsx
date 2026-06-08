import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExportProtocolPanelProps {
  isGoogleWorkspaceConnected: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProtocolRowProps {
  code: string;
  title: string;
  detail: React.ReactNode;
}

const ProtocolRow: React.FC<ProtocolRowProps> = ({ code, title, detail }) => (
  <div className="flex gap-3 border-l-2 border-primary/40 pl-3">
    <div className="flex-shrink-0">
      <span className="font-tabular text-[10px] font-medium uppercase tracking-wider text-primary">
        {code}
      </span>
    </div>
    <div className="min-w-0 space-y-0.5">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </div>
  </div>
);

/**
 * Collapsible export protocol reference for the Fleet Export Console.
 */
export const ExportProtocolPanel: React.FC<ExportProtocolPanelProps> = ({
  isGoogleWorkspaceConnected,
  open,
  onOpenChange,
}) => {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card className="border-border/60">
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full text-left">
            <CardHeader className="cursor-pointer transition-colors hover:bg-muted/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <CardTitle className="text-base">Export Protocol</CardTitle>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform duration-200',
                    open && 'rotate-180',
                  )}
                  aria-hidden
                />
              </div>
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <ProtocolRow
              code="FMT-01"
              title="CSV dataset exports"
              detail="Fleet Asset Register, Parts Inventory Snapshot, QR Scan Evidence Log, and Alternate Parts Cross-Reference export as CSV with selectable columns."
            />
            <ProtocolRow
              code="FMT-02"
              title="Internal Work Order Packet"
              detail={
                <>
                  Multi-sheet Excel workbook for shop and office workflows.
                  {isGoogleWorkspaceConnected
                    ? ' Google Sheets export is available when Workspace is connected.'
                    : ' Connect Google Workspace in Integrations to enable Google Sheets export.'}
                </>
              }
            />
            <ProtocolRow
              code="COL-01"
              title="Column selection"
              detail={
                <>
                  Use <strong>Quick Export</strong> for default columns, or{' '}
                  <strong>Customize</strong> to choose specific fields. Column preferences are saved per report type.
                </>
              }
            />
            <ProtocolRow
              code="LIM-01"
              title="Row limits"
              detail="Large datasets over 50,000 records are automatically capped. Apply filters in the export dialog to narrow results."
            />
            <ProtocolRow
              code="RL-01"
              title="Rate limits"
              detail="Exports are limited to 5 per minute and 50 per hour per organization to protect system stability."
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

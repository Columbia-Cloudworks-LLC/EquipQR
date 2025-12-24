import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, AlertTriangle, XCircle, Download, Loader2 } from 'lucide-react';

import type { ImportDryRunResult } from '@/types/csvImport';

interface CSVPreviewStepProps {
  dryRunResult: ImportDryRunResult | null;
  onImport: () => void;
  onBack: () => void;
  importProgress: {
    processed: number;
    total: number;
    isImporting: boolean;
    completed: boolean;
    errors: Array<{ row: number; reason: string }>;
  };
  parsedData: Record<string, string>[] | null;
  onDownloadErrors: () => void;
}

export const CSVPreviewStep: React.FC<CSVPreviewStepProps> = ({
  dryRunResult,
  onImport,
  onBack,
  importProgress,
  onDownloadErrors
}) => {
  if (!dryRunResult) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Validating import data...</span>
        </div>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Create</Badge>;
      case 'merge':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Merge</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const progressPercentage = importProgress.total > 0 
    ? (importProgress.processed / importProgress.total) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Will Create</p>
                <p className="text-2xl font-bold">{dryRunResult.willCreate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Will Merge</p>
                <p className="text-2xl font-bold">{dryRunResult.willMerge}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Errors</p>
                <p className="text-2xl font-bold">{dryRunResult.errorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Valid Rows</p>
                <p className="text-2xl font-bold">{dryRunResult.validCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {dryRunResult.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Warnings:</p>
              {dryRunResult.warnings.map((warning, index) => (
                <div key={index} className="text-sm">• {warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Errors */}
      {dryRunResult.errors.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                {dryRunResult.errors.length} rows have errors and will be skipped:
              </p>
              <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                {dryRunResult.errors.slice(0, 10).map((error, index) => (
                  <div key={index}>
                    Row {error.row}: {error.reason}
                  </div>
                ))}
                {dryRunResult.errors.length > 10 && (
                  <div className="text-muted-foreground">
                    ... and {dryRunResult.errors.length - 10} more errors
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDownloadErrors}
                className="mt-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Error Report
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview (First 20 rows)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Last Maintenance</TableHead>
                  <TableHead>Custom Attributes</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dryRunResult.sample.slice(0, 20).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{getActionBadge(row.action)}</TableCell>
                    <TableCell>{row.manufacturer || '-'}</TableCell>
                    <TableCell>{row.model || '-'}</TableCell>
                    <TableCell>{row.serial || '-'}</TableCell>
                    <TableCell>{row.last_maintenance || '-'}</TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {Object.keys(row.customAttributes).length} attributes
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.error && (
                        <div className="text-xs text-red-600">{row.error}</div>
                      )}
                      {row.warning && (
                        <div className="text-xs text-yellow-600">{row.warning}</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Import Progress */}
      {importProgress.isImporting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Import Progress</span>
                <span>{importProgress.processed.toLocaleString()} / {importProgress.total.toLocaleString()}</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Processing equipment records...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
          disabled={importProgress.isImporting}
        >
          Back
        </Button>
        <Button 
          onClick={onImport}
          disabled={importProgress.isImporting || dryRunResult.validCount === 0}
          className="bg-primary hover:bg-primary/90"
        >
          {importProgress.isImporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            'Start Import'
          )}
        </Button>
      </div>
    </div>
  );
};
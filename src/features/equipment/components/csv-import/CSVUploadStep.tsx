import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Info } from 'lucide-react';

interface CSVUploadStepProps {
  onFileUpload: (file: File) => void;
  file: File | null;
  rowCount: number;
  delimiter: string;
}

export const CSVUploadStep: React.FC<CSVUploadStepProps> = ({
  onFileUpload,
  file,
  rowCount,
  delimiter
}) => {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(f => f.name.toLowerCase().endsWith('.csv'));
    
    if (csvFile) {
      onFileUpload(csvFile);
    }
  }, [onFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          Upload a CSV file with equipment data. Maximum 10,000 rows and 5MB file size.
          The CSV should include columns for manufacturer, model, serial number, and any custom attributes.
        </AlertDescription>
      </Alert>

      <Card 
        className="border-dashed border-2 p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById('csv-upload')?.click()}
      >
        <CardContent className="pt-6">
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
          <p className="text-muted-foreground mb-4">
            Drag and drop your CSV file here, or click to browse
          </p>
          <Button variant="outline">
            Choose File
          </Button>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

      {file && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <h4 className="font-semibold">{file.name}</h4>
                <div className="text-sm text-muted-foreground space-y-1 mt-1">
                  <div>Size: {(file.size / 1024).toFixed(1)} KB</div>
                  <div>Rows: {rowCount.toLocaleString()}</div>
                  <div>Delimiter: "{delimiter}"</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 text-sm text-muted-foreground">
        <h4 className="font-semibold text-foreground">Requirements:</h4>
        <ul className="space-y-1 ml-4">
          <li>• CSV format with header row</li>
          <li>• Maximum 10,000 data rows</li>
          <li>• Maximum 5MB file size</li>
          <li>• Include manufacturer, model, or serial number for equipment identification</li>
          <li>• Dates should be in YYYY-MM-DD, MM/DD/YYYY, or YYYY/MM/DD format</li>
        </ul>
      </div>
    </div>
  );
};

export default CSVUploadStep;
import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeams } from '@/features/teams/hooks/useTeamManagement';
import { Upload, CheckCircle } from 'lucide-react';

import { CSVUploadStep } from './csv-import/CSVUploadStep';
import { CSVMappingStep } from './csv-import/CSVMappingStep';
import { CSVPreviewStep } from './csv-import/CSVPreviewStep';
import { CSVSuccessStep } from './csv-import/CSVSuccessStep';

import type { CSVImportState } from '@/types/csvImport';
import { stripBOM, generateImportId, downloadErrorsCSV } from '@/utils/csvImportUtils';

interface ImportCsvWizardProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  onSuccess?: () => void;
}

const ImportCsvWizard: React.FC<ImportCsvWizardProps> = ({
  open,
  onClose,
  organizationId,
  organizationName,
  onSuccess
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: teams = [] } = useTeams(organizationId);
  
  const [state, setState] = useState<CSVImportState>({
    step: 1,
    file: null,
    parsedData: null,
    headers: [],
    delimiter: ',',
    rowCount: 0,
    mappings: [],
    selectedTeamId: null,
    dryRunResult: null,
    importProgress: {
      processed: 0,
      total: 0,
      isImporting: false,
      completed: false,
      errors: []
    },
    importId: generateImportId()
  });

  const resetState = useCallback(() => {
    setState({
      step: 1,
      file: null,
      parsedData: null,
      headers: [],
      delimiter: ',',
      rowCount: 0,
      mappings: [],
      selectedTeamId: null,
      dryRunResult: null,
      importProgress: {
        processed: 0,
        total: 0,
        isImporting: false,
        completed: false,
        errors: []
      },
      importId: generateImportId()
    });
  }, []);
  React.useEffect(() => {
    if (state.importProgress.completed) {
      onSuccess?.();
    }
  }, [state.importProgress.completed, onSuccess]);


  const handleClose = useCallback(() => {
    if (state.importProgress.isImporting) {
      toast({
        title: "Import in progress",
        description: "Please wait for the import to complete before closing.",
        variant: "destructive"
      });
      return;
    }
    
    // If import was completed successfully, invalidate equipment queries to refresh the list
    if (state.importProgress.completed) {
      queryClient.invalidateQueries({ queryKey: ['equipment', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['equipment-optimized', organizationId] });
    }
    
    resetState();
    onClose();
  }, [state.importProgress.isImporting, state.importProgress.completed, resetState, onClose, toast, queryClient, organizationId]);

  const handleFileUpload = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "CSV files must be under 5MB.",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = stripBOM(e.target?.result as string);
      
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        worker: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            toast({
              title: "Parse error",
              description: "Failed to parse CSV file. Please check the format.",
              variant: "destructive"
            });
            return;
          }

          const data = results.data as Record<string, string>[];
          
          if (data.length === 0) {
            toast({
              title: "Empty file",
              description: "The CSV file contains no data rows.",
              variant: "destructive"
            });
            return;
          }

          if (data.length > 10000) {
            toast({
              title: "Too many rows",
              description: "CSV files are limited to 10,000 rows maximum.",
              variant: "destructive"
            });
            return;
          }

          const headers = Object.keys(data[0]);
          const delimiter = results.meta.delimiter || ',';

          setState(prev => ({
            ...prev,
            file,
            parsedData: data,
            headers,
            delimiter,
            rowCount: data.length,
            step: 2
          }));
        },
        error: (error) => {
          toast({
            title: "Parse error",
            description: error.message || "Failed to parse CSV file.",
            variant: "destructive"
          });
        }
      });
    };

    reader.onerror = () => {
      toast({
        title: "File read error",
        description: "Failed to read the CSV file.",
        variant: "destructive"
      });
    };

    reader.readAsText(file);
  }, [toast]);

  const performDryRun = useCallback(async () => {
    if (!state.parsedData || !state.mappings.length) return;

    try {
      const { data, error } = await supabase.functions.invoke('import-equipment-csv', {
        body: {
          dryRun: true,
          rows: state.parsedData.slice(0, 100), // First 100 rows for dry run
          mappings: state.mappings,
          importId: state.importId,
          teamId: state.selectedTeamId,
          organizationId
        }
      });

      if (error) {
        throw new Error(error.message || 'Dry run failed');
      }
      
      setState(prev => ({
        ...prev,
        dryRunResult: data,
        step: 3
      }));
    } catch (error) {
      console.error('Dry run error:', error);
      toast({
        title: "Dry run failed",
        description: "Failed to validate import data. Please try again.",
        variant: "destructive"
      });
    }
  }, [state.parsedData, state.mappings, state.importId, state.selectedTeamId, organizationId, toast]);

  const performImport = useCallback(async () => {
    if (!state.parsedData || !state.dryRunResult) return;

    setState(prev => ({
      ...prev,
      importProgress: {
        ...prev.importProgress,
        isImporting: true,
        processed: 0,
        total: state.parsedData!.length
      }
    }));

    const chunkSize = 500;
    const chunks = [];
    
    for (let i = 0; i < state.parsedData.length; i += chunkSize) {
      chunks.push(state.parsedData.slice(i, i + chunkSize));
    }

    let totalCreated = 0;
    let totalMerged = 0;
    let totalFailed = 0;
    const allErrors: Array<{ row: number; reason: string }> = [];

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        const { data: chunkResult, error } = await supabase.functions.invoke('import-equipment-csv', {
          body: {
            dryRun: false,
            rows: chunk,
            mappings: state.mappings,
            importId: state.importId,
            teamId: state.selectedTeamId,
            organizationId,
            chunkIndex: i
          }
        });

        if (error) {
          throw new Error(`Chunk ${i + 1} failed: ${error.message}`);
        }
        
        totalCreated += chunkResult.created;
        totalMerged += chunkResult.merged;
        totalFailed += chunkResult.failed;
        allErrors.push(...chunkResult.failures.map(f => ({ 
          row: f.row + (i * chunkSize), 
          reason: f.reason 
        })));

        setState(prev => ({
          ...prev,
          importProgress: {
            ...prev.importProgress,
            processed: (i + 1) * chunkSize
          }
        }));
      }

      setState(prev => ({
        ...prev,
        importProgress: {
          processed: state.parsedData!.length,
          total: state.parsedData!.length,
          isImporting: false,
          completed: true,
          errors: allErrors
        }
      }));

      toast({
        title: "Import completed",
        description: `Created: ${totalCreated}, Merged: ${totalMerged}, Failed: ${totalFailed}`,
      });

    } catch (error) {
      console.error('Import error:', error);
      setState(prev => ({
        ...prev,
        importProgress: {
          ...prev.importProgress,
          isImporting: false
        }
      }));
      
      toast({
        title: "Import failed",
        description: "The import process encountered an error. Please try again.",
        variant: "destructive"
      });
    }
  }, [state.parsedData, state.dryRunResult, state.mappings, state.importId, state.selectedTeamId, organizationId, toast]);

  const getStepIcon = (stepNumber: number) => {
    if (stepNumber < state.step) return <CheckCircle className="w-5 h-5 text-primary" />;
    if (stepNumber === state.step) return <div className="w-5 h-5 rounded-full bg-primary" />;
    return <div className="w-5 h-5 rounded-full bg-muted" />;
  };

  const renderStepContent = () => {
    switch (state.step) {
      case 1:
        return (
          <CSVUploadStep
            onFileUpload={handleFileUpload}
            file={state.file}
            rowCount={state.rowCount}
            delimiter={state.delimiter}
          />
        );
      case 2:
        return (
          <CSVMappingStep
            headers={state.headers}
            mappings={state.mappings}
            onMappingsChange={(mappings) => setState(prev => ({ ...prev, mappings }))}
            teams={teams}
            selectedTeamId={state.selectedTeamId}
            onTeamChange={(teamId) => setState(prev => ({ ...prev, selectedTeamId: teamId }))}
            onNext={performDryRun}
            onBack={() => setState(prev => ({ ...prev, step: 1 }))}
          />
        );
      case 3:
        return (
          <CSVPreviewStep
            dryRunResult={state.dryRunResult}
            onImport={performImport}
            onBack={() => setState(prev => ({ ...prev, step: 2 }))}
            importProgress={state.importProgress}
            parsedData={state.parsedData}
            onDownloadErrors={() => {
              if (state.dryRunResult?.errors.length && state.parsedData) {
                downloadErrorsCSV(state.dryRunResult.errors, state.parsedData);
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  if (state.importProgress.completed) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <CSVSuccessStep
            importProgress={state.importProgress}
            organizationName={organizationName}
            importId={state.importId}
            selectedTeamId={state.selectedTeamId}
            onClose={handleClose}
            onDownloadErrors={() => {
              if (state.importProgress.errors.length && state.parsedData) {
                downloadErrorsCSV(state.importProgress.errors, state.parsedData);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import CSV
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getStepIcon(1)}
              <span className={`text-sm ${state.step >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Upload
              </span>
            </div>
            <div className="w-8 h-px bg-border" />
            <div className="flex items-center gap-2">
              {getStepIcon(2)}
              <span className={`text-sm ${state.step >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Map
              </span>
            </div>
            <div className="w-8 h-px bg-border" />
            <div className="flex items-center gap-2">
              {getStepIcon(3)}
              <span className={`text-sm ${state.step >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Preview & Import
              </span>
            </div>
          </div>
        </div>

        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
};

export default ImportCsvWizard;

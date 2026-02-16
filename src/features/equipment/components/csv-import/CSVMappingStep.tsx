import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, AlertTriangle } from 'lucide-react';

import type { ColumnMapping } from '@/types/csvImport';
import { autoMapHeaders, toSnakeCase } from '@/utils/csvImportUtils';

interface CSVMappingStepProps {
  headers: string[];
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  teams: Array<{ id: string; name: string }>;
  selectedTeamId: string | null;
  onTeamChange: (teamId: string | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export const CSVMappingStep: React.FC<CSVMappingStepProps> = ({
  headers,
  mappings,
  onMappingsChange,
  teams,
  selectedTeamId,
  onTeamChange,
  onNext,
  onBack
}) => {
  const [autoMapped, setAutoMapped] = useState(false);

  useEffect(() => {
    if (headers.length > 0 && !autoMapped) {
      const initialMappings = autoMapHeaders(headers);
      onMappingsChange(initialMappings);
      setAutoMapped(true);
    }
  }, [headers, autoMapped, onMappingsChange]);

  const updateMapping = (index: number, updates: Partial<ColumnMapping>) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    
    // If changing to custom, generate snake_case key
    if (updates.mappedTo === 'custom' && !updates.customKey) {
      newMappings[index].customKey = toSnakeCase(newMappings[index].header);
    }
    
    onMappingsChange(newMappings);
  };

  const hasRequiredMappings = () => {
    const standardFields = mappings.filter(m => 
      ['manufacturer', 'model', 'serial'].includes(m.mappedTo)
    );
    return standardFields.length > 0;
  };

  const getDuplicateWarnings = () => {
    const duplicates = mappings.filter(m => m.isDuplicate);
    const groupedDuplicates = new Map<string, ColumnMapping[]>();
    
    duplicates.forEach(mapping => {
      const key = mapping.mappedTo === 'custom' ? mapping.customKey : mapping.mappedTo;
      if (!groupedDuplicates.has(key || '')) {
        groupedDuplicates.set(key || '', []);
      }
      groupedDuplicates.get(key || '')!.push(mapping);
    });
    
    return Array.from(groupedDuplicates.entries()).filter(([, mappings]) => mappings.length > 1);
  };

  const duplicateWarnings = getDuplicateWarnings();

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          Map your CSV columns to equipment fields. Standard fields (manufacturer, model, serial) 
          will be used for matching existing equipment. All other columns will be stored as custom attributes.
        </AlertDescription>
      </Alert>

      {/* Team Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Assign new equipment to team (optional)
            </label>
            <Select
              value={selectedTeamId || 'none'}
              onValueChange={(value) => onTeamChange(value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team assignment</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only newly created equipment will be assigned to this team. 
              Existing equipment team assignments will not be changed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Column Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Column Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mappings.map((mapping, index) => (
              <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{mapping.header}</span>
                    {mapping.isDuplicate && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              duplicate
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Multiple columns normalize to the same key.<br />
                            Leftmost non-empty value per row will be used.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={mapping.mappedTo}
                    onValueChange={(value) => updateMapping(index, { 
                      mappedTo: value as ColumnMapping['mappedTo'],
                      customKey: value === 'custom' ? toSnakeCase(mapping.header) : undefined
                    })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      <SelectItem value="model">Model</SelectItem>
                      <SelectItem value="serial">Serial Number</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                      <SelectItem value="last_maintenance">Last Maintenance</SelectItem>
                      <SelectItem value="custom">Custom Attribute</SelectItem>
                      <SelectItem value="skip">Skip Column</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {mapping.mappedTo === 'custom' && (
                    <div className="text-sm text-muted-foreground">
                      → {mapping.customKey}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Warnings */}
      {duplicateWarnings.length > 0 && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Duplicate column mappings detected:</p>
              {duplicateWarnings.map(([key, mappings]) => (
                <div key={key} className="text-sm">
                  • <strong>{key}</strong>: {mappings.map(m => m.header).join(', ')}
                  <br />
                  <span className="text-muted-foreground ml-2">
                    Leftmost non-empty value will be used per row.
                  </span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={onNext}
          disabled={!hasRequiredMappings()}
        >
          Preview Import
        </Button>
      </div>
    </div>
  );
};
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Download,
  RotateCcw,
  Eye,
  Clipboard
} from 'lucide-react';
import { PMChecklistItem } from '@/services/preventativeMaintenanceService';

interface PMChecklistMobileProps {
  pm: {
    id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    checklist_data?: PMChecklistItem[];
    notes?: string;
    completed_at?: string;
  };
  onViewDetails?: () => void;
  onDownloadPDF?: () => void;
  onRevertCompletion?: () => void;
  readOnly?: boolean;
}

export const PMChecklistMobile: React.FC<PMChecklistMobileProps> = ({
  pm,
  onViewDetails,
  onDownloadPDF,
  onRevertCompletion,
  readOnly = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  // Parse checklist data
  const checklist = useMemo(() => {
    if (!pm.checklist_data) return [];
    try {
      return typeof pm.checklist_data === 'string' 
        ? JSON.parse(pm.checklist_data) 
        : pm.checklist_data;
    } catch {
      return [];
    }
  }, [pm.checklist_data]);

  // Calculate progress by section
  const sectionProgress = useMemo(() => {
    const sections: Record<string, { total: number; completed: number; items: PMChecklistItem[] }> = {};
    
    checklist.forEach((item: PMChecklistItem) => {
      if (!sections[item.section]) {
        sections[item.section] = { total: 0, completed: 0, items: [] };
      }
      sections[item.section].total++;
      sections[item.section].items.push(item);
      if (item.condition !== null && item.condition !== undefined) {
        sections[item.section].completed++;
      }
    });

    return sections;
  }, [checklist]);

  const totalItems = checklist.length;
  const completedItems = checklist.filter(item => 
    item.condition !== null && item.condition !== undefined
  ).length;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getConditionIcon = (condition: number | null | undefined) => {
    if (condition === null || condition === undefined) return null;
    switch (condition) {
      case 1: // OK
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 2: // Adjusted
        return <Clock className="h-3 w-3 text-yellow-600" />;
      case 3: // Recommend Repairs
        return <AlertTriangle className="h-3 w-3 text-orange-600" />;
      case 4: // Requires Immediate Repairs
        return <AlertTriangle className="h-3 w-3 text-red-600" />;
      case 5: // Unsafe Condition
        return <AlertTriangle className="h-3 w-3 text-red-600" />;
      default:
        return null;
    }
  };

  const getConditionText = (condition: number | null | undefined) => {
    if (condition === null || condition === undefined) return 'not rated';
    switch (condition) {
      case 1: return 'OK';
      case 2: return 'Adjusted';
      case 3: return 'Recommend Repairs';
      case 4: return 'Requires Immediate Repairs';
      case 5: return 'Unsafe Condition';
      default: return 'not rated';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clipboard className="h-5 w-5" />
            PM Checklist
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(pm.status)} text-xs`}>
              {getStatusIcon(pm.status)}
              <span className="ml-1 capitalize">{pm.status.replace('_', ' ')}</span>
            </Badge>
            {onDownloadPDF && (
              <Button variant="outline" size="sm" onClick={onDownloadPDF} className="h-6 px-2">
                <Download className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Progress Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedItems}/{totalItems} items ({completionPercentage}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Section Summary - Collapsed by Default */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="p-0 h-auto justify-start text-left w-full">
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">Category Progress</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {Object.entries(sectionProgress).map(([section, progress]) => {
              const sectionPercentage = progress.total > 0 
                ? Math.round((progress.completed / progress.total) * 100) 
                : 0;
              
              return (
                <div key={section} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{section}</span>
                    <Badge variant="outline" className="text-xs">
                      {progress.completed}/{progress.total}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${sectionPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {sectionPercentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Quick Issues Summary */}
        {completedItems > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Issues Found</h4>
            <div className="space-y-1">
              {checklist
                .filter(item => item.condition && item.condition > 1)
                .slice(0, 3)
                .map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm p-2 bg-yellow-50 rounded">
                    {getConditionIcon(item.condition)}
                    <span className="flex-1 truncate">{item.description}</span>
                    <Badge variant="outline" className="text-xs">
                      {getConditionText(item.condition)}
                    </Badge>
                  </div>
                ))}
              {checklist.filter(item => item.condition && item.condition > 1).length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{checklist.filter(item => item.condition && item.condition > 1).length - 3} more issues
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notes - Expandable */}
        {pm.notes && (
          <div>
            <Collapsible open={isNotesExpanded} onOpenChange={setIsNotesExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="p-0 h-auto justify-start text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">General Notes</span>
                    {isNotesExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                  {pm.notes}
                </p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Completion Info */}
        {pm.status === 'completed' && pm.completed_at && (
          <div className="text-sm text-muted-foreground bg-green-50 p-2 rounded">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Completed on {new Date(pm.completed_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={onViewDetails} className="flex-1">
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
          )}
          
          {pm.status === 'completed' && onRevertCompletion && !readOnly && (
            <Button variant="outline" size="sm" onClick={onRevertCompletion} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-1" />
              Revert
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

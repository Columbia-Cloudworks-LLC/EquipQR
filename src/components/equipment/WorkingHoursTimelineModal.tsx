import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Settings, User, FileEdit, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEquipmentWorkingHoursHistory, useEquipmentCurrentWorkingHours, useUpdateEquipmentWorkingHours } from './hooks/useEquipmentWorkingHours';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import type { Column } from '@/components/ui/data-table';
import type { WorkingHoursHistoryEntry } from '@/services/equipmentWorkingHoursService';
import { logger } from '@/utils/logger';
import { useIsMobile } from '@/hooks/use-mobile';

interface WorkingHoursTimelineModalProps {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentName: string;
}

export const WorkingHoursTimelineModal: React.FC<WorkingHoursTimelineModalProps> = ({
  open,
  onClose,
  equipmentId,
  equipmentName,
}) => {
  const [isAddingHours, setIsAddingHours] = useState(false);
  const [newHours, setNewHours] = useState('');
  const [notes, setNotes] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const isMobile = useIsMobile();

  const { data: historyResult, isLoading: isLoadingHistory } = useEquipmentWorkingHoursHistory(
    equipmentId,
    currentPage,
    pageSize
  );
  const { data: currentHours, isLoading: isLoadingCurrent } = useEquipmentCurrentWorkingHours(equipmentId);
  const updateHoursMutation = useUpdateEquipmentWorkingHours();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hours = parseFloat(newHours);
    if (isNaN(hours) || hours < 0) {
      toast.error('Please enter a valid number of hours');
      return;
    }

    try {
      await updateHoursMutation.mutateAsync({
        equipmentId,
        newHours: hours,
        updateSource: 'manual',
        notes: notes.trim() || undefined,
      });

      setNewHours('');
      setNotes('');
      setIsAddingHours(false);
    } catch (error) {
      logger.error('Failed to update working hours', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Normalize PostgreSQL timestamp format (replace space with T for ISO compliance)
      const normalizedDate = dateString.replace(' ', 'T');
      return format(new Date(normalizedDate), 'MMM d, yyyy h:mm a');
    } catch (error) {
      logger.warn('Failed to format working hours date', { dateString, error });
      return 'Invalid date';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'work_order':
        return <FileEdit className="h-3 w-3" />;
      case 'manual':
      default:
        return <Settings className="h-3 w-3" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'work_order':
        return 'Work Order';
      case 'manual':
      default:
        return 'Manual';
    }
  };

  const columns: Column<WorkingHoursHistoryEntry>[] = [
    {
      key: 'created_at',
      title: 'Date',
      width: '180px',
      render: (_value, item) => (
        <div className="text-sm">
          {item ? formatDate(item.created_at) : '-'}
        </div>
      ),
    },
    {
      key: 'update_source',
      title: 'Source',
      width: '120px',
      render: (_value, item) => (
        <div className="flex items-center gap-2">
          {item ? getSourceIcon(item.update_source) : null}
          <span className="text-sm">{item ? getSourceLabel(item.update_source) : '-'}</span>
        </div>
      ),
    },
    {
      key: 'updated_by_name',
      title: 'Updated By',
      width: '140px',
      render: (_value, item) => (
        <div className="flex items-center gap-2">
          <User className="h-3 w-3" />
          <span className="text-sm">{item?.updated_by_name || 'Unknown'}</span>
        </div>
      ),
    },
    {
      key: 'hours_change',
      title: 'Hours Change',
      width: '140px',
      render: (_value, item) => (
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3 w-3" />
          <span className="text-sm font-medium">
            {item ? `${item.old_hours !== null ? item.old_hours : '0'} → ${item.new_hours}` : '-'}
          </span>
          {item && (
            <span className="text-xs text-muted-foreground">
              ({item.hours_added > 0 ? '+' : ''}{item.hours_added})
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'notes',
      title: 'Notes',
      render: (_value, item) => (
        <div className="text-sm text-muted-foreground max-w-xs truncate">
          {item?.notes || '—'}
        </div>
      ),
    },
  ];

  const pagination = historyResult ? {
    page: currentPage,
    limit: pageSize,
    total: historyResult.total,
    onPageChange: setCurrentPage,
  } : undefined;

  // Mobile card component for history entries
  const MobileHistoryCard = ({ entry }: { entry: WorkingHoursHistoryEntry }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {getSourceIcon(entry.update_source)}
              <span className="text-sm font-medium">{getSourceLabel(entry.update_source)}</span>
            </div>
            <span className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              <span className="text-sm font-medium">
                {entry.old_hours !== null ? entry.old_hours : '0'} → {entry.new_hours} hours
              </span>
              <span className="text-xs text-muted-foreground">
                ({entry.hours_added > 0 ? '+' : ''}{entry.hours_added})
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm">{entry.updated_by_name || 'Unknown'}</span>
            </div>
            
            {entry.notes && (
              <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                {entry.notes}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Mobile pagination component
  const MobilePagination = () => {
    if (!pagination) return null;
    
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const hasNext = pagination.page < totalPages;
    const hasPrev = pagination.page > 1;
    
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="text-sm text-muted-foreground">
          Page {pagination.page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={!hasNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[90vh] p-3' : 'max-w-4xl max-h-[80vh]'} flex flex-col`}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className={isMobile ? 'text-lg' : ''}>Working Hours Timeline</DialogTitle>
          <DialogDescription className={isMobile ? 'text-sm' : ''}>
            Track and manage working hours for {equipmentName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-shrink-0 space-y-4">
          {/* Current Hours Summary */}
          <div className={`${isMobile ? 'flex-col space-y-3' : 'flex items-center justify-between'} p-4 bg-muted/50 rounded-lg`}>
            <div>
              <p className="text-sm text-muted-foreground">Current Working Hours</p>
              <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold`}>
                {isLoadingCurrent ? '...' : `${currentHours || 0} hours`}
              </p>
            </div>
            <Button
              onClick={() => setIsAddingHours(true)}
              size="sm"
              className={`gap-2 ${isMobile ? 'w-full' : ''}`}
            >
              <Plus className="h-4 w-4" />
              Update Hours
            </Button>
          </div>

          {/* Add Hours Form */}
          {isAddingHours && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
              <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
                <div>
                  <Label htmlFor="new-hours">New Total Hours</Label>
                  <Input
                    id="new-hours"
                    type="number"
                    step="0.1"
                    min="0"
                    value={newHours}
                    onChange={(e) => setNewHours(e.target.value)}
                    placeholder="Enter total hours"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this update"
                    rows={isMobile ? 2 : 1}
                  />
                </div>
              </div>
              <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={updateHoursMutation.isPending}
                  className={isMobile ? 'w-full' : ''}
                >
                  {updateHoursMutation.isPending ? 'Updating...' : 'Update Hours'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsAddingHours(false);
                    setNewHours('');
                    setNotes('');
                  }}
                  className={isMobile ? 'w-full' : ''}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* History Display */}
        <div className="flex-1 min-h-0">
          {isMobile ? (
            // Mobile card-based layout
            <div className="space-y-3 h-full flex flex-col">
              <h3 className="text-sm font-medium text-muted-foreground px-1">History</h3>
              <div className="flex-1 overflow-y-auto">
                {isLoadingHistory ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-3/4"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                            <div className="h-3 bg-muted rounded w-2/3"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : historyResult?.data.length ? (
                  historyResult.data.map((entry) => (
                    <MobileHistoryCard key={entry.id} entry={entry} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No working hours history found.
                  </div>
                )}
              </div>
              <MobilePagination />
            </div>
          ) : (
            // Desktop table layout
            <DataTable
              data={historyResult?.data || []}
              columns={columns}
              isLoading={isLoadingHistory}
              pagination={pagination}
              emptyMessage="No working hours history found."
              className="h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
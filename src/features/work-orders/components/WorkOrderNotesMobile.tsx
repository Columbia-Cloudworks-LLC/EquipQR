import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  MessageSquare
} from 'lucide-react';
import InlineNoteComposer from '@/components/common/InlineNoteComposer';
import { logger } from '@/utils/logger';

interface WorkOrderNotesMobileProps {
  workOrderId: string;
  canAddNotes: boolean;
  showPrivateNotes: boolean;
  onAddNote?: (note: { content: string; hours: number; isPrivate: boolean; images?: File[] }) => void;
  /** If true, auto-expand and show the note form on mount (used for quick action navigation) */
  autoOpenForm?: boolean;
}

export const WorkOrderNotesMobile: React.FC<WorkOrderNotesMobileProps> = ({
  workOrderId,
  canAddNotes,
  showPrivateNotes,
  onAddNote,
  autoOpenForm = false
}) => {
  const [isExpanded, setIsExpanded] = useState(autoOpenForm);
  const [noteContent, setNoteContent] = useState('');
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNoteSubmit = async (data: {
    content: string;
    images: File[];
    hoursWorked?: number;
    machineHours?: number;
    isPrivate?: boolean;
  }) => {
    if (!data.content.trim() && data.images.length === 0 && !data.hoursWorked) return;
    
    setIsSubmitting(true);
    try {
      if (onAddNote) {
        await onAddNote({
          content: data.content,
          hours: data.hoursWorked || 0,
          isPrivate: data.isPrivate || false,
          images: data.images
        });
      }
      setNoteContent('');
      setAttachedImages([]);
    } catch (error) {
      logger.error('Error adding work order note', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImagesAdd = (files: File[]) => {
    setAttachedImages(prev => [...prev, ...files]);
  };

  const handleImageRemove = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card data-workorder-id={workOrderId}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notes & Updates
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add Note Form - Collapsible */}
        {canAddNotes && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Note</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-4">
              <InlineNoteComposer
                value={noteContent}
                onChange={setNoteContent}
                onSubmit={handleNoteSubmit}
                attachedImages={attachedImages}
                onImagesAdd={handleImagesAdd}
                onImageRemove={handleImageRemove}
                showPrivateToggle={showPrivateNotes}
                showHoursWorked={true}
                showMachineHours={true}
                disabled={isSubmitting}
                isSubmitting={isSubmitting}
                placeholder="Enter your note..."
              />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Notes List - Placeholder */}
        <div className="space-y-3">
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs">Start by adding your first note or update</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};




import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, MessageSquare, Images, Clock, User, EyeOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  createWorkOrderNoteWithImages,
  getWorkOrderNotesWithImages,
} from '@/features/work-orders/services/workOrderNotesService';
import InlineNoteComposer from '@/components/common/InlineNoteComposer';
import { logger } from '@/utils/logger';

interface WorkOrderNotesSectionProps {
  workOrderId: string;
  canAddNotes: boolean;
  showPrivateNotes: boolean;
  /** If true, auto-open the note form on mount (used for quick action navigation) */
  autoOpenForm?: boolean;
}

const WorkOrderNotesSection: React.FC<WorkOrderNotesSectionProps> = ({
  workOrderId,
  canAddNotes,
  showPrivateNotes,
  autoOpenForm = false
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(autoOpenForm);
  const [noteContent, setNoteContent] = useState('');
  const [attachedImages, setAttachedImages] = useState<File[]>([]);

  // Fetch notes with images
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['work-order-notes-with-images', workOrderId],
    queryFn: () => getWorkOrderNotesWithImages(workOrderId),
    enabled: !!workOrderId
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: ({ content, hoursWorked, isPrivate, images, machineHours }: {
      content: string;
      hoursWorked: number;
      isPrivate: boolean;
      images: File[];
      machineHours?: number;
    }) => {
      // TODO: Handle machineHours when backend supports it
      if (machineHours !== undefined && machineHours > 0) {
        logger.debug('Machine hours provided', { machineHours, note: 'not yet supported in backend' });
      }
      return createWorkOrderNoteWithImages(workOrderId, content, hoursWorked, isPrivate, images);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-notes-with-images', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['work-order-images', workOrderId] });
      setShowForm(false);
      setNoteContent('');
      setAttachedImages([]);
      toast.success('Note created successfully');
    },
    onError: (error) => {
      logger.error('Failed to create note', error);
      toast.error('Failed to create note');
    }
  });

  const handleNoteSubmit = async (data: {
    content: string;
    images: File[];
    hoursWorked?: number;
    machineHours?: number;
    isPrivate?: boolean;
  }) => {
    if (import.meta.env.DEV) {
      logger.debug('handleNoteSubmit called', { 
        contentLength: data.content.length,
        imageCount: data.images.length,
        hoursWorked: data.hoursWorked,
        machineHours: data.machineHours,
        isPrivate: data.isPrivate
      });
    }
    
    // Generate content if none provided but images are uploaded
    let finalContent = data.content.trim();
    if (!finalContent && data.images.length > 0) {
      const userName = user?.email?.split('@')[0] || 'User';
      if (data.images.length === 1) {
        finalContent = `${userName} uploaded: ${data.images[0].name}`;
      } else {
        const fileNames = data.images.map(f => f.name).join(', ');
        finalContent = `${userName} uploaded ${data.images.length} images: ${fileNames}`;
      }
      if (import.meta.env.DEV) {
        logger.debug('Auto-generated note content', { finalContent });
      }
    }
    
    if (!finalContent && data.images.length === 0) {
      if (import.meta.env.DEV) {
        logger.debug('No content or images provided for note creation');
      }
      toast.error('Please enter note content or attach images');
      return;
    }
    
    try {
      await createNoteMutation.mutateAsync({
        content: finalContent,
        hoursWorked: data.hoursWorked || 0,
        isPrivate: data.isPrivate || false,
        images: data.images,
        machineHours: data.machineHours
      });
      
      if (import.meta.env.DEV) {
        logger.info('createNoteMutation completed successfully');
      }
    } catch (error) {
      logger.error('Error in handleNoteSubmit', error);
      throw error;
    }
  };

  const handleImagesAdd = (files: File[]) => {
    setAttachedImages(prev => [...prev, ...files]);
  };

  const handleImageRemove = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatHours = (hours: number) => {
    return hours > 0 ? `${hours}h` : '';
  };

  // Filter notes based on privacy settings
  const visibleNotes = notes.filter(note => {
    if (!note.is_private) return true;
    if (!showPrivateNotes) return false;
    return note.author_id === user?.id;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Note Form - Always show if no notes exist or explicitly requested */}
      {canAddNotes && (visibleNotes.length === 0 || showForm) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{visibleNotes.length === 0 ? 'Add Your First Note' : 'Add Note'}</span>
              {visibleNotes.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setNoteContent('');
                    setAttachedImages([]);
                  }}
                >
                  Cancel
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
              disabled={createNoteMutation.isPending}
              isSubmitting={createNoteMutation.isPending}
              placeholder="Enter your note..."
            />
          </CardContent>
        </Card>
      )}

      {/* Add Note Button - Only show if notes exist and form is not shown */}
      {canAddNotes && visibleNotes.length > 0 && !showForm && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      )}

      {/* Empty State - Show when no notes, no form, and user cannot add notes */}
      {visibleNotes.length === 0 && !showForm && !canAddNotes && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No notes have been added yet.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes List - Only show when there are notes */}
      {visibleNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Notes & Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visibleNotes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Note Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{note.author_name}</span>
                          <span>•</span>
                          <span>{formatDate(note.created_at)}</span>
                          {formatHours(note.hours_worked) && (
                            <>
                              <span>•</span>
                              <Clock className="h-4 w-4" />
                              <span>{formatHours(note.hours_worked)}</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {note.is_private && (
                            <Badge variant="outline" className="text-xs">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                          {note.images && note.images.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Images className="h-3 w-3 mr-1" />
                              {note.images.length} image{note.images.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Note Content */}
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{note.content}</p>
                      </div>

                      {/* Note Images */}
                      {note.images && note.images.length > 0 && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {note.images.map((image) => (
                              <div key={image.id} className="aspect-square bg-muted rounded overflow-hidden">
                                <img
                                  src={image.file_url}
                                  alt={image.file_name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkOrderNotesSection;

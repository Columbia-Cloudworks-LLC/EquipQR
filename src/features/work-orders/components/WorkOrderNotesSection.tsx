
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare } from 'lucide-react';
import NoteTimelineEntry from '@/components/common/NoteTimelineEntry';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { workOrders as workOrderQueryKeys, workOrderMetrics } from '@/lib/queryKeys';
import {
  createWorkOrderNoteWithImages,
  getWorkOrderNotesWithImages,
  type WorkOrderNote,
} from '@/features/work-orders/services/workOrderNotesService';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { NotesTabAddNoteSection } from '@/components/common/NotesTabAddNoteSection';
import { useOfflineMergedNotes } from '@/features/offline-queue/hooks/useOfflineMergedNotes';
import NotesLoadingSkeleton from '@/components/common/NotesLoadingSkeleton';
import { resolveNoteContentFromSubmit } from '@/components/common/noteContentHelpers';
import type { NoteSubmitPayload } from '@/components/common/noteSubmitTypes';
import {
  createNoteCreateMutationCallbacks,
  runOfflineAwareNoteCreate,
  showQueuedNoteCreateToasts,
} from '@/components/common/noteCreateHelpers';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useAttachedNoteImages } from '@/hooks/useAttachedNoteImages';
import { logger } from '@/utils/logger';

interface WorkOrderNotesSectionProps {
  workOrderId: string;
  canAddNotes: boolean;
  showPrivateNotes: boolean;
  /** Hide inline add-note button when global sticky actions are present */
  hideInlineAddButton?: boolean;
  /** If true, auto-open the note form on mount (used for quick action navigation) */
  autoOpenForm?: boolean;
  /** External trigger to open the note form (incremented to re-trigger) */
  openFormTrigger?: number;
  /** Opens note form and triggers add-photo control (incremented to re-trigger) */
  openCaptureTrigger?: number;
}

const WorkOrderNotesSection: React.FC<WorkOrderNotesSectionProps> = ({
  workOrderId,
  canAddNotes,
  showPrivateNotes,
  hideInlineAddButton = false,
  autoOpenForm = false,
  openFormTrigger,
  openCaptureTrigger,
}) => {
  const offlinePhotoMessage = 'Photos need a connection. Text notes can still be saved offline.';
  const { formatDate } = useFormatTimestamp();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const offlineCtx = useOfflineQueueOptional();
  const [showForm, setShowForm] = useState(autoOpenForm);
  const [attachRequestId, setAttachRequestId] = useState(0);

  useEffect(() => {
    if (openFormTrigger && openFormTrigger > 0) {
      setShowForm(true);
    }
  }, [openFormTrigger]);

  useEffect(() => {
    if (openCaptureTrigger && openCaptureTrigger > 0) {
      setShowForm(true);
      setAttachRequestId(openCaptureTrigger);
    }
  }, [openCaptureTrigger]);
  const [noteContent, setNoteContent] = useState('');
  const { attachedImages, handleImagesAdd, handleImageRemove, clearAttachedImages } =
    useAttachedNoteImages({
      onAddWhileOffline: () => toast.error(offlinePhotoMessage),
    });

  // Fetch notes with images
  const { data: serverNotes = [], isLoading } = useQuery({
    queryKey: workOrderQueryKeys.notesWithImages(workOrderId),
    queryFn: () => getWorkOrderNotesWithImages(workOrderId, currentOrganization!.id),
    enabled: !!workOrderId && !!currentOrganization?.id
  });

  // Merge server notes with any pending offline note items
  const notes = useOfflineMergedNotes(serverNotes, 'work_order', workOrderId);

  // Create note mutation — supports offline (text only; images when online)
  const createNoteMutation = useMutation({
    mutationFn: (input) =>
      runOfflineAwareNoteCreate({
        input,
        organizationId: currentOrganization?.id,
        userId: user?.id,
        offlineCreate: async ({ content, hoursWorked, isPrivate, images, machineHours }) => {
          const service = new OfflineAwareWorkOrderService(currentOrganization!.id, user!.id);
          const result = await service.createWorkOrderNote(
            workOrderId,
            content,
            hoursWorked,
            isPrivate,
            machineHours,
          );
          if (result.queuedOffline) {
            return { queuedOffline: true as const, hadImages: images.length > 0 };
          }
          return { queuedOffline: false as const, data: result.data };
        },
        onlineCreate: ({ content, hoursWorked, isPrivate, images, machineHours }) =>
          createWorkOrderNoteWithImages(
            workOrderId,
            content,
            hoursWorked,
            isPrivate,
            images,
            currentOrganization?.id,
            machineHours,
          ),
      }),
    ...createNoteCreateMutationCallbacks({
      onQueuedOffline: (hadImages) => {
        showQueuedNoteCreateToasts(hadImages, { photoWarningMessage: offlinePhotoMessage });
        offlineCtx?.refresh();
      },
      onOnlineSuccess: () => {
        queryClient.invalidateQueries({ queryKey: workOrderQueryKeys.notesWithImages(workOrderId) });
        queryClient.invalidateQueries({ queryKey: workOrderQueryKeys.images(workOrderId) });
        queryClient.invalidateQueries({ queryKey: workOrderMetrics.imageCount(workOrderId) });
        toast.success('Note created successfully');
      },
      resetForm: () => {
        setShowForm(false);
        setNoteContent('');
        clearAttachedImages();
      },
    }),
  });

  const handleNoteSubmit = async (data: NoteSubmitPayload) => {
    if (import.meta.env.DEV) {
      logger.debug('handleNoteSubmit called', { 
        contentLength: data.content.length,
        imageCount: data.images.length,
        machineHours: data.machineHours,
        isPrivate: data.isPrivate
      });
    }
    
    let submitData = data;
    if (!navigator.onLine && data.images.length > 0) {
      toast.error(offlinePhotoMessage);
      clearAttachedImages();
      if (!data.content.trim()) {
        return;
      }
      submitData = { ...data, images: [] };
    }

    const userName = user?.email?.split('@')[0] || 'User';
    const finalContent = resolveNoteContentFromSubmit(submitData, userName, 'filenames');
    if (import.meta.env.DEV && finalContent && !submitData.content.trim() && submitData.images.length > 0) {
      logger.debug('Auto-generated note content', { finalContent });
    }
    
    if (!finalContent && submitData.images.length === 0) {
      if (import.meta.env.DEV) {
        logger.debug('No content or images provided for note creation');
      }
      toast.error('Please enter note content or attach images');
      return;
    }
    
    try {
      await createNoteMutation.mutateAsync({
        content: finalContent,
        hoursWorked: 0,
        isPrivate: submitData.isPrivate || false,
        images: submitData.images,
        machineHours: submitData.machineHours
      });
      
      if (import.meta.env.DEV) {
        logger.info('createNoteMutation completed successfully');
      }
    } catch (error) {
      logger.error('Error in handleNoteSubmit', error);
      throw error;
    }
  };

  // Filter notes based on privacy settings
  const visibleNotes = notes.filter(note => {
    if (!note.is_private) return true;
    if (!showPrivateNotes) return false;
    return note.author_id === user?.id;
  });

  // Derive user display name for clipboard paste fallback
  const userDisplayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  if (isLoading) {
    return <NotesLoadingSkeleton cardClassName="shadow-elevation-2" />;
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Add Note Form - Always show if no notes exist or explicitly requested */}
      <NotesTabAddNoteSection
        noteCount={visibleNotes.length}
        showForm={showForm}
        canAddNotes={canAddNotes}
        onShowForm={() => setShowForm(true)}
        onCancelForm={() => {
          setShowForm(false);
          setNoteContent('');
          clearAttachedImages();
        }}
        noteContent={noteContent}
        onNoteContentChange={setNoteContent}
        onSubmit={handleNoteSubmit}
        attachedImages={attachedImages}
        onImagesAdd={handleImagesAdd}
        onImageRemove={handleImageRemove}
        showPrivateToggle={showPrivateNotes}
        disabled={createNoteMutation.isPending}
        isSubmitting={createNoteMutation.isPending}
        userDisplayName={userDisplayName}
        cardClassName="shadow-elevation-2"
        requestAttachTrigger={attachRequestId}
        hideInlineAddButton={hideInlineAddButton}
      />

      {/* Empty State - Show when no notes, no form, and user cannot add notes */}
      {visibleNotes.length === 0 && !showForm && !canAddNotes && (
        <Card className="shadow-elevation-2">
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
        <Card className="shadow-elevation-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Notes & Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visibleNotes.map((note) => {
                const typedNote = note as WorkOrderNote & { _isPendingSync?: boolean };
                return (
                  <NoteTimelineEntry
                    key={note.id}
                    note={typedNote}
                    formatDate={formatDate}
                    metaClassName="text-[13px] text-muted-foreground"
                    contentClassName="prose prose-sm max-w-none dark:prose-invert"
                    contentTextClassName="whitespace-pre-wrap text-[15px] text-foreground/90 leading-relaxed"
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkOrderNotesSection;

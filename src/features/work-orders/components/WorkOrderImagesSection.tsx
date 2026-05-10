
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getWorkOrderImages,
  deleteWorkOrderImage,
  type WorkOrderCarouselImage,
} from '@/features/work-orders/services/workOrderNotesService';
import { useWorkOrderImageCount } from '@/features/work-orders/hooks/useWorkOrderImageCount';
import { workOrders as workOrderQueryKeys, workOrderMetrics } from '@/lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Images, ChevronDown, Trash2, User, Clock } from 'lucide-react';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkOrderImagesSectionProps {
  workOrderId: string;
  organizationId: string;
  canUpload: boolean;
  showPrivateNotes: boolean;
  /** First creation photo — shown first with a Primary badge */
  primaryImageId?: string | null;
}

const noteExcerpt = (text: string, maxLen = 120) => {
  const t = text.trim();
  if (!t) return '';
  return t.length <= maxLen ? t : `${t.slice(0, maxLen)}…`;
};

const WorkOrderImagesSection: React.FC<WorkOrderImagesSectionProps> = ({
  workOrderId,
  organizationId,
  canUpload,
  showPrivateNotes,
  primaryImageId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { formatDateTime } = useFormatTimestamp();
  const [isOpen, setIsOpen] = useState(false);

  const { data: countData, isLoading: countLoading } = useWorkOrderImageCount(workOrderId);

  const {
    data: images = [],
    isLoading: imagesLoading,
    isError: imagesError,
    isFetching: imagesFetching,
    refetch: refetchImages,
  } = useQuery({
    queryKey: workOrderQueryKeys.images(workOrderId),
    queryFn: () => getWorkOrderImages(workOrderId, organizationId),
    enabled: !!workOrderId && !!organizationId && isOpen,
  });

  const deleteImageMutation = useMutation({
    mutationFn: deleteWorkOrderImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workOrderQueryKeys.images(workOrderId) });
      queryClient.invalidateQueries({ queryKey: workOrderQueryKeys.notesWithImages(workOrderId) });
      queryClient.invalidateQueries({ queryKey: workOrderMetrics.imageCount(workOrderId) });
    },
  });

  const visibleImages = useMemo(() => {
    const filtered = images.filter((image) => {
      if (!image.is_private_note) return true;
      return Boolean(showPrivateNotes && image.uploaded_by === user?.id);
    });
    if (!primaryImageId) return filtered;
    const primary = filtered.find((img) => img.id === primaryImageId);
    const rest = filtered.filter((img) => img.id !== primaryImageId);
    return primary ? [primary, ...rest] : filtered;
  }, [images, showPrivateNotes, user?.id, primaryImageId]);

  const canDeleteImage = (image: { uploaded_by: string }) => image.uploaded_by === user?.id;

  const handleDelete = async (image: WorkOrderCarouselImage) => {
    try {
      await deleteImageMutation.mutateAsync(image.id);
      toast.success('Image deleted successfully');
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error('Failed to delete image');
    }
  };

  const totalCount = countData?.count ?? 0;

  if (!countLoading && totalCount === 0) {
    return null;
  }

  const countBadgeContent = countLoading ? (
    <span className="inline-block h-5 w-8 animate-pulse rounded bg-muted" aria-hidden />
  ) : (
    <Badge variant="secondary">{totalCount}</Badge>
  );

  return (
    <Card className="shadow-elevation-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-h-[44px] w-full touch-manipulation items-start justify-between gap-3 text-left"
              aria-expanded={isOpen}
              aria-controls={`work-order-images-content-${workOrderId}`}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  <Images className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  <span>Work Order Images</span>
                  {countBadgeContent}
                </CardTitle>
                {!countLoading && totalCount > 0 ? (
                  <p className="text-sm text-muted-foreground">Tap to review work order photos</p>
                ) : null}
              </div>
              <ChevronDown
                className={cn(
                  'mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180',
                )}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent id={`work-order-images-content-${workOrderId}`}>
          <CardContent className="pt-0">
            {!isOpen ? null : imagesLoading ? (
              <div
                className="flex aspect-video w-full animate-pulse rounded-lg bg-muted"
                role="status"
                aria-label="Loading images"
              />
            ) : imagesError ? (
              <div className="space-y-3 py-6 text-center text-sm text-muted-foreground" role="alert">
                <p>We could not load work order images. Check your connection and try again.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refetchImages()}
                  disabled={imagesFetching}
                >
                  {imagesFetching ? 'Retrying...' : 'Retry'}
                </Button>
              </div>
            ) : visibleImages.length === 0 ? (
              <div className="space-y-2 py-6 text-center text-sm text-muted-foreground">
                <p>
                  No images are visible for your account. Some photos may be attached to private notes you
                  cannot view.
                </p>
                {canUpload ? (
                  <p className="text-xs">Add a note with images when you have permission to upload.</p>
                ) : null}
              </div>
            ) : (
              <div className="relative px-10 pb-2">
                <Carousel opts={{ loop: false }} className="w-full">
                  <CarouselContent>
                    {visibleImages.map((image) => (
                      <CarouselItem key={image.id}>
                        <div className="space-y-3 rounded-lg border bg-card p-3">
                          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                            {primaryImageId === image.id ? (
                              <Badge
                                className="absolute left-2 top-2 z-[1] shadow-sm"
                                variant="secondary"
                              >
                                Primary
                              </Badge>
                            ) : null}
                            <img
                              src={image.file_url}
                              alt={image.file_name || 'Work order image'}
                              className="h-full w-full object-contain"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3.5 w-3.5" aria-hidden />
                                <span className="text-foreground">{image.note_author_name}</span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" aria-hidden />
                                <time dateTime={image.note_created_at}>
                                  {formatDateTime(image.note_created_at)}
                                </time>
                              </span>
                            </div>
                            {noteExcerpt(image.note_content) ? (
                              <p className="line-clamp-2 text-[15px] leading-relaxed text-foreground/90">
                                {noteExcerpt(image.note_content)}
                              </p>
                            ) : null}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="truncate text-xs text-muted-foreground" title={image.file_name}>
                                {image.file_name}
                              </p>
                              {canDeleteImage(image) ? (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="shrink-0"
                                  disabled={deleteImageMutation.isPending}
                                  onClick={() => handleDelete(image)}
                                  aria-label={`Delete image ${image.file_name}`}
                                >
                                  <Trash2 className="mr-1 h-4 w-4" aria-hidden />
                                  Delete
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious
                    type="button"
                    className="left-1 top-1/2 z-10 -translate-y-1/2 border bg-background/90 shadow-sm"
                    aria-label="Previous image"
                  />
                  <CarouselNext
                    type="button"
                    className="right-1 top-1/2 z-10 -translate-y-1/2 border bg-background/90 shadow-sm"
                    aria-label="Next image"
                  />
                </Carousel>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default WorkOrderImagesSection;

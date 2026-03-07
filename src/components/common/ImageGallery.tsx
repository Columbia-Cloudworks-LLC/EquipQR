import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Download, Eye, Calendar, User, Star, StarOff } from 'lucide-react';
import { toast } from 'sonner';

interface ImageData {
  id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  description?: string;
  created_at: string;
  uploaded_by_name?: string;
  uploaded_by: string;
  note_content?: string;
  note_author_name?: string;
}

interface ImageGalleryProps {
  images: ImageData[];
  onDelete?: (imageId: string) => Promise<void>;
  onSetDisplayImage?: (imageUrl: string) => Promise<void>;
  canDelete?: (image: ImageData) => boolean;
  canSetDisplayImage?: boolean;
  currentDisplayImage?: string;
  title?: string;
  emptyMessage?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onDelete,
  onSetDisplayImage,
  canDelete,
  canSetDisplayImage = false,
  currentDisplayImage,
  title = 'Images',
  emptyMessage = 'No images uploaded yet.'
}) => {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSettingDisplay, setIsSettingDisplay] = useState<string | null>(null);

  const handleDelete = async (image: ImageData) => {
    if (!onDelete) return;
    
    setIsDeleting(image.id);
    try {
      await onDelete(image.id);
      toast.success('Image deleted successfully');
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error('Failed to delete image');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSetDisplayImage = async (image: ImageData) => {
    if (!onSetDisplayImage) return;
    
    setIsSettingDisplay(image.id);
    try {
      await onSetDisplayImage(image.file_url);
      toast.success('Display image updated');
    } catch (error) {
      console.error('Failed to set display image:', error);
      toast.error('Failed to set display image');
    } finally {
      setIsSettingDisplay(null);
    }
  };

  const handleRemoveDisplayImage = async () => {
    if (!onSetDisplayImage) return;
    
    try {
      await onSetDisplayImage('');
      toast.success('Display image removed');
    } catch (error) {
      console.error('Failed to remove display image:', error);
      toast.error('Failed to remove display image');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / 1024 / 1024;
    return mb > 1 ? `${mb.toFixed(1)}MB` : `${(bytes / 1024).toFixed(0)}KB`;
  };

  const downloadImage = (image: ImageData) => {
    const link = document.createElement('a');
    link.href = image.file_url;
    link.download = image.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (images.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            {title}
            <Badge variant="secondary">{images.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                  <img
                    src={image.file_url}
                    alt={image.file_name}
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setSelectedImage(image)}
                  />
                  
                  {/* Display Image Indicator */}
                  {currentDisplayImage === image.file_url && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-yellow-500 text-yellow-900 text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Display
                      </Badge>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-y-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={() => setSelectedImage(image)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {canSetDisplayImage && currentDisplayImage !== image.file_url && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSetDisplayImage(image)}
                        disabled={isSettingDisplay === image.id}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {canSetDisplayImage && currentDisplayImage === image.file_url && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={handleRemoveDisplayImage}
                        disabled={isSettingDisplay === image.id}
                      >
                        <StarOff className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {onDelete && canDelete?.(image) && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDelete(image)}
                        disabled={isDeleting === image.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium truncate">{image.file_name}</p>
                  {image.file_size && (
                    <p className="text-xs text-muted-foreground">{formatFileSize(image.file_size)}</p>
                  )}
                  {image.note_content && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{image.note_content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Image Detail Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedImage?.file_name}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedImage && downloadImage(selectedImage)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex min-h-[12rem] max-h-[72dvh] items-center justify-center overflow-auto rounded-lg bg-muted/30 p-2">
                <img
                  src={selectedImage.file_url}
                  alt={selectedImage.file_name}
                  className="mx-auto block max-h-[68dvh] w-auto max-w-full object-contain"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Uploaded: {new Date(selectedImage.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  {selectedImage.uploaded_by_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>By: {selectedImage.uploaded_by_name}</span>
                    </div>
                  )}
                  
                  {selectedImage.file_size && (
                    <div>
                      <span className="font-medium">Size: </span>
                      <span>{formatFileSize(selectedImage.file_size)}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {selectedImage.description && (
                    <div>
                      <span className="font-medium">Description: </span>
                      <p className="text-muted-foreground">{selectedImage.description}</p>
                    </div>
                  )}
                  
                  {selectedImage.note_content && (
                    <div>
                      <span className="font-medium">Note: </span>
                      <p className="text-muted-foreground">{selectedImage.note_content}</p>
                      {selectedImage.note_author_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          by {selectedImage.note_author_name}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageGallery;

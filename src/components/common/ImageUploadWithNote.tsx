import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { finishDragDrop, handleDragActiveState } from '@/components/common/drag-active-handlers';
import { useLocalFilePreviewUrls } from '@/hooks/useLocalFilePreviewUrls';

const sanitizeForDisplay = (text: string): string =>
  text.replace(/[^\w\s.\-()[\]]/g, '_') || 'unnamed';

interface ImageUploadWithNoteProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFiles?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
}

const ImageUploadWithNote: React.FC<ImageUploadWithNoteProps> = ({
  onUpload,
  maxFiles = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  disabled = false
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { getPreviewUrl, revokePreviewUrl, clearPreviewUrls } = useLocalFilePreviewUrls();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (!acceptedTypes.includes(file.type)) {
        toast.error(`${sanitizeForDisplay(file.name)} is not a supported image format`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${sanitizeForDisplay(file.name)} is too large. Maximum size is 10MB`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => {
      const combined = [...prev, ...validFiles];
      
      if (combined.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return prev;
      }
      
      return combined;
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const removed = prev[index];
      if (removed) revokePreviewUrl(removed);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    handleDragActiveState(e, setDragActive);
  };

  const handleDrop = (e: React.DragEvent) => {
    finishDragDrop(e, setDragActive);

    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    if (!onUpload) {
      toast.error('Upload handler not configured');
      return;
    }

    setIsUploading(true);
    
    try {
      await onUpload(selectedFiles);
      clearPreviewUrls();
      setSelectedFiles([]);
      toast.success('Images uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(`Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardContent standalone className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Drop images here or click button below</p>
            <p className="text-xs text-muted-foreground">
              Supports JPEG, PNG, GIF, WebP up to 10MB each
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => document.getElementById('file-input')?.click()}
              className="mt-2"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
          </div>
          <Input
            id="file-input"
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
          />
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Selected Images ({selectedFiles.length})</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selectedFiles.map((file, index) => {
                const safePreviewUrl = getPreviewUrl(file);
                const displayName = sanitizeForDisplay(file.name);
                return (
                <div key={`${displayName}-${index}`} className="relative group">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    {safePreviewUrl ? (
                      <img
                        src={safePreviewUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        onError={() => console.error('Image preview failed')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                    aria-label={`Remove selected image ${displayName}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{displayName}</p>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <Button
            onClick={handleUpload}
            disabled={disabled || isUploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Image${selectedFiles.length !== 1 ? 's' : ''}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ImageUploadWithNote;

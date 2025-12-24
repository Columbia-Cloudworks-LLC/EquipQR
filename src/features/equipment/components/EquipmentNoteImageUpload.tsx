
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X } from 'lucide-react';
import { useUploadEquipmentNoteImage } from '@/features/equipment/hooks/useEquipmentNotesWithImages';

interface EquipmentNoteImageUploadProps {
  open: boolean;
  onClose: () => void;
  noteId: string;
}

const EquipmentNoteImageUpload: React.FC<EquipmentNoteImageUploadProps> = ({
  open,
  onClose,
  noteId
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadMutation = useUploadEquipmentNoteImage();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadMutation.mutateAsync({
        noteId,
        file: selectedFile,
        description: description.trim() || undefined
      });
      
      handleClose();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setDescription('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onClose();
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Selection */}
          <div>
            <Label htmlFor="image-upload">Select Image</Label>
            <div className="mt-1">
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploadMutation.isPending}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum file size: 10MB. Supported formats: JPG, PNG, GIF, WebP
            </p>
          </div>

          {/* File Preview */}
          {selectedFile && previewUrl && (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover rounded-md border"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removeFile}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="mt-2 text-sm text-muted-foreground">
                <p>File: {selectedFile.name}</p>
                <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a description for this image..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={uploadMutation.isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentNoteImageUpload;

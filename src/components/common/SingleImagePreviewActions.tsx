import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';

type SingleImagePreviewActionsProps = {
  disabled: boolean;
  isProcessing: boolean;
  isUploading: boolean;
  onUpload: () => void;
  onCancel: () => void;
  iconSize?: 'sm' | 'md';
};

export function SingleImagePreviewActions({
  disabled,
  isProcessing,
  isUploading,
  onUpload,
  onCancel,
  iconSize = 'sm',
}: SingleImagePreviewActionsProps) {
  const iconClass = iconSize === 'md' ? 'h-4 w-4 mr-2' : 'h-3.5 w-3.5 mr-1.5';

  return (
    <>
      <Button type="button" size="sm" disabled={disabled || isProcessing} onClick={onUpload}>
        {isUploading ? (
          <Loader2 className={`${iconClass} animate-spin`} />
        ) : (
          <Upload className={iconClass} />
        )}
        {isUploading ? 'Uploading...' : 'Upload'}
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={isProcessing} onClick={onCancel}>
        Cancel
      </Button>
    </>
  );
}

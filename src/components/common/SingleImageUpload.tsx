import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Image as ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { SingleImagePreviewActions } from '@/components/common/SingleImagePreviewActions';
import {
  sessionImageSrc,
  type ImageUploadSession,
} from '@/components/common/singleImageUploadSession';
import { useSingleImageUpload } from '@/components/common/useSingleImageUpload';

interface SingleImageUploadProps {
  /** Current image URL (if any) */
  currentImageUrl?: string | null;
  /** Called when a file is selected and ready to upload */
  onUpload: (file: File) => Promise<void>;
  /** Called when the user clicks delete on the current image */
  onDelete?: () => Promise<void>;
  /** Maximum file size in MB (default: 5) */
  maxSizeMB?: number;
  /** Accepted MIME types */
  acceptedTypes?: string[];
  /** Disable all interactions */
  disabled?: boolean;
  /** Label text shown above the upload area */
  label?: string;
  /** Help text shown below the upload area */
  helpText?: string;
  /** CSS class for the image preview container */
  previewClassName?: string;
  /** Layout variant: 'default' for full-width drop zone, 'compact' for square thumbnail, 'avatar' for inline circular avatar */
  variant?: 'default' | 'compact' | 'avatar';
  /** Fallback initials for avatar variant (e.g. "AA") */
  avatarFallback?: string;
}

type UploadLayoutProps = {
  session: ImageUploadSession;
  inputId: string;
  disabled: boolean;
  isUploading: boolean;
  isDeleting: boolean;
  isProcessing: boolean;
  dragActive: boolean;
  formatLabel: string;
  maxSizeMB: number;
  label?: string;
  previewClassName: string;
  avatarFallback?: string;
  onDrag: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onPickFile: () => void;
  onUpload: () => void;
  onCancelPreview: () => void;
  onDelete?: () => void;
  onImageError: () => void;
};

function ImageDropZone({
  inputId,
  disabled,
  isProcessing,
  dragActive,
  onDrag,
  onDrop,
  formatLabel,
  maxSizeMB,
  compact,
}: Pick<
  UploadLayoutProps,
  | 'inputId'
  | 'disabled'
  | 'isProcessing'
  | 'dragActive'
  | 'onDrag'
  | 'onDrop'
  | 'formatLabel'
  | 'maxSizeMB'
> & { compact: boolean }) {
  const busy = disabled || isProcessing;
  const activeClass = dragActive
    ? 'border-primary bg-primary/5'
    : 'border-muted-foreground/25 hover:border-muted-foreground/50';

  if (compact) {
    return (
      <label
        htmlFor={inputId}
        className={`flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          busy ? 'opacity-50' : 'cursor-pointer'
        } ${activeClass}`}
        aria-disabled={busy || undefined}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
      >
        <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Upload</span>
      </label>
    );
  }

  return (
    <label
      htmlFor={inputId}
      className={`block rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        busy ? 'opacity-50' : 'cursor-pointer'
      } ${activeClass}`}
      aria-disabled={busy || undefined}
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
    >
      <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <div className="space-y-2">
        <p className="text-sm font-medium">Drop an image here, or click to browse</p>
        <p className="text-xs text-muted-foreground">
          {formatLabel} up to {maxSizeMB} MB
        </p>
        <span className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary">
          <Upload className="h-4 w-4" />
          Choose File
        </span>
      </div>
    </label>
  );
}

function AvatarFace({
  session,
  label,
  avatarFallback,
  onImageError,
}: Pick<UploadLayoutProps, 'session' | 'label' | 'avatarFallback' | 'onImageError'>) {
  const preview = session.kind === 'pending' ? session.src : null;
  const current = session.kind === 'current' ? session.src : null;

  return (
    <Avatar className="h-16 w-16 shrink-0">
      {preview ? (
        <AvatarImage src={preview} alt="Preview" />
      ) : current ? (
        <AvatarImage
          src={current}
          alt={label || 'Avatar'}
          onLoadingStatusChange={(status) => {
            if (status === 'error') onImageError();
          }}
        />
      ) : null}
      <AvatarFallback className="text-lg">{avatarFallback || '?'}</AvatarFallback>
    </Avatar>
  );
}

function AvatarIdleActions({
  hasCurrentImage,
  disabled,
  isProcessing,
  isDeleting,
  onPickFile,
  onDelete,
}: {
  hasCurrentImage: boolean;
  disabled: boolean;
  isProcessing: boolean;
  isDeleting: boolean;
  onPickFile: () => void;
  onDelete?: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isProcessing}
        onClick={onPickFile}
      >
        <Upload className="mr-1.5 h-3.5 w-3.5" />
        {hasCurrentImage ? 'Replace' : 'Upload photo'}
      </Button>
      {hasCurrentImage && onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isProcessing}
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          {isDeleting ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="mr-1.5 h-3.5 w-3.5" />
          )}
          Remove
        </Button>
      )}
    </>
  );
}

function AvatarUploadLayout({
  session,
  disabled,
  isUploading,
  isDeleting,
  isProcessing,
  formatLabel,
  maxSizeMB,
  label,
  avatarFallback,
  onPickFile,
  onUpload,
  onCancelPreview,
  onDelete,
  onImageError,
}: UploadLayoutProps) {
  return (
    <div className="flex items-center gap-4">
      <AvatarFace
        session={session}
        label={label}
        avatarFallback={avatarFallback}
        onImageError={onImageError}
      />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {session.kind === 'pending' ? (
            <SingleImagePreviewActions
              disabled={disabled}
              isProcessing={isProcessing}
              isUploading={isUploading}
              onUpload={onUpload}
              onCancel={onCancelPreview}
            />
          ) : (
            <AvatarIdleActions
              hasCurrentImage={session.kind === 'current'}
              disabled={disabled}
              isProcessing={isProcessing}
              isDeleting={isDeleting}
              onPickFile={onPickFile}
              onDelete={onDelete}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatLabel} up to {maxSizeMB} MB
        </p>
      </div>
    </div>
  );
}

function CompactUploadLayout(props: UploadLayoutProps) {
  const {
    session,
    disabled,
    isUploading,
    isDeleting,
    isProcessing,
    label,
    onPickFile,
    onUpload,
    onCancelPreview,
    onDelete,
    onImageError,
  } = props;
  const thumbnailSrc = sessionImageSrc(session);

  return (
    <>
      {thumbnailSrc && (
        <div className="space-y-1.5">
          <div className="group relative h-24 w-24 overflow-hidden rounded-lg border bg-muted/50">
            <img
              src={thumbnailSrc}
              alt={session.kind === 'pending' ? 'Preview' : label || 'Current image'}
              className="h-full w-full object-contain"
              onError={session.kind === 'current' ? onImageError : undefined}
            />
            {session.kind === 'current' && (
              <button
                type="button"
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                disabled={disabled || isProcessing}
                onClick={onPickFile}
              >
                <span className="text-xs font-medium text-white">Replace</span>
              </button>
            )}
          </div>
          {session.kind === 'pending' ? (
            <div className="flex items-center gap-2">
              <SingleImagePreviewActions
                disabled={disabled}
                isProcessing={isProcessing}
                isUploading={isUploading}
                onUpload={onUpload}
                onCancel={onCancelPreview}
              />
            </div>
          ) : onDelete ? (
            <button
              type="button"
              className="text-xs text-destructive hover:underline disabled:opacity-50"
              disabled={disabled || isProcessing}
              onClick={onDelete}
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </button>
          ) : null}
        </div>
      )}
      {session.kind === 'empty' && <ImageDropZone {...props} compact />}
    </>
  );
}

function DefaultUploadLayout(props: UploadLayoutProps) {
  const {
    session,
    disabled,
    isUploading,
    isProcessing,
    isDeleting,
    label,
    previewClassName,
    onPickFile,
    onUpload,
    onCancelPreview,
    onDelete,
    onImageError,
  } = props;

  return (
    <>
      {session.kind === 'current' && (
        <div className="space-y-2">
          <div className="border rounded-lg p-4 bg-muted/50 flex items-center justify-center min-h-[80px]">
            <img
              src={session.src}
              alt={label || 'Current image'}
              className={previewClassName}
              onError={onImageError}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isProcessing}
              onClick={onPickFile}
            >
              <Upload className="mr-2 h-4 w-4" />
              Replace
            </Button>
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isProcessing}
                onClick={onDelete}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Remove
              </Button>
            )}
          </div>
        </div>
      )}

      {session.kind === 'pending' && session.src && (
        <div className="space-y-2">
          <div className="border rounded-lg p-4 bg-muted/50 flex items-center justify-center min-h-[80px]">
            <img src={session.src} alt="Preview" className={previewClassName} />
          </div>
          <p className="truncate text-xs text-muted-foreground">{session.file.name}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={disabled || isProcessing}
              onClick={onUpload}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={onCancelPreview}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {session.kind === 'empty' && <ImageDropZone {...props} compact={false} />}
    </>
  );
}

const SingleImageUpload: React.FC<SingleImageUploadProps> = ({
  currentImageUrl,
  onUpload,
  onDelete,
  maxSizeMB = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  disabled = false,
  label,
  helpText,
  previewClassName = 'max-w-full max-h-32 object-contain',
  variant = 'default',
  avatarFallback,
}) => {
  const upload = useSingleImageUpload({
    currentImageUrl,
    onUpload,
    onDelete,
    maxSizeMB,
    acceptedTypes,
    disabled,
  });

  const layoutProps: UploadLayoutProps = {
    session: upload.session,
    inputId: upload.inputId,
    disabled,
    isUploading: upload.isUploading,
    isDeleting: upload.isDeleting,
    isProcessing: upload.isProcessing,
    dragActive: upload.dragActive,
    formatLabel: upload.formatLabel,
    maxSizeMB,
    label,
    previewClassName,
    avatarFallback,
    onDrag: upload.handleDrag,
    onDrop: upload.handleDrop,
    onPickFile: upload.handlePickFile,
    onUpload: upload.handleUpload,
    onCancelPreview: upload.handleCancelPreview,
    onDelete: upload.handleDelete,
    onImageError: upload.handleImageError,
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={upload.inputId} className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          {label}
        </Label>
      )}

      {variant === 'avatar' ? (
        <AvatarUploadLayout {...layoutProps} />
      ) : variant === 'compact' ? (
        <CompactUploadLayout {...layoutProps} />
      ) : (
        <DefaultUploadLayout {...layoutProps} />
      )}

      <input
        ref={upload.fileInputRef}
        id={upload.inputId}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={upload.handleInputChange}
        disabled={disabled || upload.isProcessing}
        className="sr-only"
      />

      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
};

export default SingleImageUpload;

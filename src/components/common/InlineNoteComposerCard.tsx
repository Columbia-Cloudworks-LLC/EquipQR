import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import InlineNoteComposer from '@/components/common/InlineNoteComposer';
import { OfflineFormBanner } from '@/features/offline-queue/components/OfflineFormBanner';
import type { NoteSubmitPayload } from '@/components/common/noteSubmitTypes';

export interface InlineNoteComposerCardProps {
  title: string;
  showCancel: boolean;
  onCancel: () => void;
  cardClassName?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (data: NoteSubmitPayload) => void | Promise<void>;
  attachedImages: File[];
  onImagesAdd: (files: File[]) => void;
  onImageRemove: (index: number) => void;
  showPrivateToggle: boolean;
  showHoursWorked?: boolean;
  showMachineHours?: boolean;
  disabled?: boolean;
  isSubmitting?: boolean;
  placeholder?: string;
  userDisplayName?: string;
  requestAttachTrigger?: number;
}

export const InlineNoteComposerCard: React.FC<InlineNoteComposerCardProps> = ({
  title,
  showCancel,
  onCancel,
  cardClassName,
  value,
  onChange,
  onSubmit,
  attachedImages,
  onImagesAdd,
  onImageRemove,
  showPrivateToggle,
  showHoursWorked = true,
  showMachineHours = true,
  disabled,
  isSubmitting,
  placeholder,
  userDisplayName,
  requestAttachTrigger,
}) => (
  <Card className={cardClassName}>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span>{title}</span>
        {showCancel && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </CardTitle>
      <OfflineFormBanner />
    </CardHeader>
    <CardContent>
      <InlineNoteComposer
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        attachedImages={attachedImages}
        onImagesAdd={onImagesAdd}
        onImageRemove={onImageRemove}
        showPrivateToggle={showPrivateToggle}
        showHoursWorked={showHoursWorked}
        showMachineHours={showMachineHours}
        disabled={disabled}
        isSubmitting={isSubmitting}
        placeholder={placeholder}
        userDisplayName={userDisplayName}
        requestAttachTrigger={requestAttachTrigger}
      />
    </CardContent>
  </Card>
);

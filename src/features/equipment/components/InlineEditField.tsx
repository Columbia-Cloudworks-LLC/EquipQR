
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Edit2 } from 'lucide-react';
import { logger } from '@/utils/logger';

interface InlineEditFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  canEdit: boolean;
  type?: 'text' | 'textarea' | 'date' | 'select';
  selectOptions?: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  displayNode?: React.ReactNode;
}

const InlineEditField: React.FC<InlineEditFieldProps> = ({
  value,
  onSave,
  canEdit,
  type = 'text',
  selectOptions,
  placeholder,
  className = '',
  displayNode
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  // Update editValue when value prop changes
  React.useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('InlineEditField saving', { type, oldValue: value, newValue: editValue });
      }
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('Error saving field', error);
      }
      setEditValue(value); // Reset to original value on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Format display value based on type
  const getDisplayValue = () => {
    if (!value) return 'Not set';
    
    if (type === 'select' && selectOptions) {
      // For select fields, find the label that matches the value
      const option = selectOptions.find(opt => opt.value === value);
      return option ? option.label : value;
    }
    
    if (type === 'date' && value) {
      try {
        // Try to format the date for display
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
      } catch (error) {
        logger.error('Error formatting date for display', error);
      }
    }
    
    return value;
  };

  const resolvedDisplayNode = displayNode ?? getDisplayValue();

  if (!canEdit) {
    return <span className={className}>{resolvedDisplayNode}</span>;
  }

  if (!isEditing) {
    return (
      <div className={`group flex items-center gap-2 ${className}`}>
        <span>{resolvedDisplayNode}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsEditing(true)}
          aria-label="Edit"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {type === 'textarea' ? (
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[60px]"
          autoFocus
        />
      ) : type === 'select' && selectOptions ? (
        <Select value={editValue} onValueChange={setEditValue}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus
        />
      )}
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleSave}
          disabled={isSaving}
          aria-label="Save"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleCancel}
          disabled={isSaving}
          aria-label="Cancel"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default InlineEditField;


import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Edit2, Check, X } from 'lucide-react';
import CustomAttributesSection from './CustomAttributesSection';
import type { CustomAttribute } from '@/hooks/useCustomAttributes';

interface InlineEditCustomAttributesProps {
  value: Record<string, string>;
  onSave: (newValue: Record<string, string>) => Promise<void>;
  canEdit: boolean;
}

const InlineEditCustomAttributes: React.FC<InlineEditCustomAttributesProps> = ({
  value,
  onSave,
  canEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editAttributes, setEditAttributes] = useState<CustomAttribute[]>([]);

  const handleStartEdit = () => {
    // Convert object format to array format for editing
    const attributeArray = Object.entries(value).map(([key, val]) => ({
      id: crypto.randomUUID(),
      key,
      value: String(val)
    }));
    
    setEditAttributes(attributeArray.length > 0 ? attributeArray : []);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert array format back to object format
      const attributeObject = Object.fromEntries(
        editAttributes
          .filter(attr => attr.key.trim() !== '' && attr.value.trim() !== '')
          .map(attr => [attr.key, attr.value])
      );
      
      await onSave(attributeObject);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving custom attributes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (!canEdit && Object.keys(value).length === 0) {
    return <p className="text-muted-foreground">No custom attributes</p>;
  }

  if (!canEdit) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(value).map(([key, val]) => (
          <div key={key} className="p-3 border rounded-lg">
            <div className="text-sm font-medium text-muted-foreground">{key}</div>
            <div className="text-lg">{val}</div>
          </div>
        ))}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="group">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium">Custom Attributes</h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleStartEdit}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
        {Object.keys(value).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(value).map(([key, val]) => (
              <div key={key} className="p-3 border rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">{key}</div>
                <div className="text-lg">{val}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No custom attributes</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium">Edit Custom Attributes</h4>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
      <CustomAttributesSection
        initialAttributes={editAttributes}
        onChange={setEditAttributes}
      />
    </div>
  );
};

export default InlineEditCustomAttributes;

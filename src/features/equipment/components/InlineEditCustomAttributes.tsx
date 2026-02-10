
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Edit2, Check, X } from 'lucide-react';
import CustomAttributesSection from './CustomAttributesSection';
import type { CustomAttribute } from '@/hooks/useCustomAttributes';

interface InlineEditCustomAttributesProps {
  attributes?: Record<string, string>;
  value?: Record<string, string>;
  onSave: (newValue: Record<string, string>) => Promise<void>;
  canEdit: boolean;
}

/**
 * Regular expression to detect dangerous URL protocols that could be used for XSS attacks
 */
const DANGEROUS_PROTOCOLS_REGEX = /^(javascript|data|vbscript):/i;

/**
 * Checks if a string is a valid URL
 */
const isUrl = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  
  // Trim whitespace
  const trimmed = str.trim();
  
  // Reject dangerous protocols - not valid URLs for our purposes
  if (DANGEROUS_PROTOCOLS_REGEX.test(trimmed)) {
    return false;
  }
  
  // Check for common URL patterns
  const urlPattern = /^(https?:\/\/|www\.)[\w-]+(\.[\w-]+)+([\w\-.,@?^=%&:/~+#]*[\w-@?^=%&/~+#])?$/i;
  
  // Also check for URLs without protocol (will add https://)
  const urlWithoutProtocol = /^[\w-]+(\.[\w-]+)+([\w\-.,@?^=%&:/~+#]*[\w-@?^=%&/~+#])?$/i;
  
  return urlPattern.test(trimmed) || (urlWithoutProtocol.test(trimmed) && trimmed.includes('.'));
};

/**
 * Normalizes a URL string to include protocol if missing
 */
const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  
  // Reject dangerous protocols (defense in depth)
  if (DANGEROUS_PROTOCOLS_REGEX.test(trimmed)) {
    return trimmed; // Return as plain text, not a URL
  }
  
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }
  // If it looks like a domain, add https://
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

/**
 * Renders a value as a link if it's a URL, otherwise as plain text
 */
const renderAttributeValue = (value: string): React.ReactNode => {
  if (isUrl(value)) {
    const url = normalizeUrl(value);
    
    // Final safety check: ensure the normalized URL doesn't contain dangerous protocols
    // This should never happen due to isUrl() check, but defense in depth
    if (DANGEROUS_PROTOCOLS_REGEX.test(url)) {
      return <div className="text-lg break-all">{value}</div>;
    }
    
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg break-all text-primary hover:underline"
        aria-label={`${value} (opens in new tab)`}
      >
        {value}
      </a>
    );
  }
  return <div className="text-lg break-all">{value}</div>;
};

const InlineEditCustomAttributes: React.FC<InlineEditCustomAttributesProps> = ({
  attributes,
  value,
  onSave,
  canEdit
}) => {
  const attributesData = attributes ?? value ?? {};
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editAttributes, setEditAttributes] = useState<CustomAttribute[]>([]);

  const handleStartEdit = () => {
    // Convert object format to array format for editing
    const attributeArray = Object.entries(attributesData).map(([key, val]) => ({
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

  if (!canEdit && Object.keys(attributesData).length === 0) {
    return <p className="text-muted-foreground">No custom attributes</p>;
  }

  if (!canEdit) {
    return (
      <div className="flex flex-wrap gap-4">
        {Object.entries(attributesData).map(([key, val]) => (
          <div key={key} className="p-3 border rounded-lg min-w-[200px] flex-1 basis-[200px] max-w-full break-words">
            <div className="text-sm font-medium text-muted-foreground mb-1">{key}</div>
            {renderAttributeValue(val)}
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
            aria-label="Edit custom attributes"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
        {Object.keys(attributesData).length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {Object.entries(attributesData).map(([key, val]) => (
              <div key={key} className="p-3 border rounded-lg min-w-[200px] flex-1 basis-[200px] max-w-full break-words">
                <div className="text-sm font-medium text-muted-foreground mb-1">{key}</div>
                {renderAttributeValue(val)}
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

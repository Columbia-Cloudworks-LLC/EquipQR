
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit2, Check, X } from 'lucide-react';
import CustomAttributesSection from './CustomAttributesSection';
import type { CustomAttribute } from '@/hooks/useCustomAttributes';
import { humanizeAttributeValue } from '@/features/work-orders/utils/workOrderHelpers';

interface InlineEditCustomAttributesProps {
  attributes?: Record<string, string>;
  value?: Record<string, string>;
  onSave: (newValue: Record<string, string>) => Promise<void>;
  canEdit: boolean;
}

/**
 * Converts snake_case, camelCase, or kebab-case keys into human-readable Title Case.
 * "engine_power" -> "Engine Power", "bucketCapacity" -> "Bucket Capacity"
 */
function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase boundaries
    .replace(/[_-]+/g, ' ')                 // snake_case / kebab-case
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Regular expression to detect dangerous URL protocols that could be used for XSS attacks
 */
const DANGEROUS_PROTOCOLS_REGEX = /^(javascript|data|vbscript):/i;

/**
 * Checks if a string is a valid URL.
 * Only matches explicit protocol URLs (http/https) or www. prefixed strings.
 * Does NOT match bare strings like "1.2_cubic_yards" or "160_hp".
 */
const isUrl = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  
  const trimmed = str.trim();
  
  if (DANGEROUS_PROTOCOLS_REGEX.test(trimmed)) {
    return false;
  }
  
  // Require explicit protocol or www. prefix to avoid false positives
  // on values like "1.2_cubic_yards", "160_hp", "3.5_ton", etc.
  const urlPattern = /^(https?:\/\/|www\.)[\w-]+(\.[\w-]+)+([\w\-.,@?^=%&:/~+#]*[\w-@?^=%&/~+#])?$/i;
  
  return urlPattern.test(trimmed);
};

/**
 * Normalizes a URL string to include protocol if missing (only www. prefix case)
 */
const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  
  if (DANGEROUS_PROTOCOLS_REGEX.test(trimmed)) {
    return trimmed;
  }
  
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('www.')) {
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
  return <div className="text-lg break-all">{humanizeAttributeValue(value)}</div>;
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
      <TooltipProvider>
        <div className="flex flex-wrap gap-4">
          {Object.entries(attributesData).map(([key, val]) => (
            <div key={key} className="p-3 border rounded-lg min-w-[200px] flex-1 basis-[200px] max-w-full break-words">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm font-medium text-muted-foreground mb-1 cursor-default">{humanizeKey(key)}</div>
                </TooltipTrigger>
                {humanizeKey(key) !== key && (
                  <TooltipContent side="top"><p>{key}</p></TooltipContent>
                )}
              </Tooltip>
              {renderAttributeValue(String(val))}
            </div>
          ))}
        </div>
      </TooltipProvider>
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
          <TooltipProvider>
            <div className="flex flex-wrap gap-4">
              {Object.entries(attributesData).map(([key, val]) => (
                <div key={key} className="p-3 border rounded-lg min-w-[200px] flex-1 basis-[200px] max-w-full break-words">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm font-medium text-muted-foreground mb-1 cursor-default">{humanizeKey(key)}</div>
                    </TooltipTrigger>
                    {humanizeKey(key) !== key && (
                      <TooltipContent side="top"><p>{key}</p></TooltipContent>
                    )}
                  </Tooltip>
                  {renderAttributeValue(String(val))}
                </div>
              ))}
            </div>
          </TooltipProvider>
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

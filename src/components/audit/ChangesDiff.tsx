/**
 * ChangesDiff Component
 * 
 * Displays field-level changes from an audit log entry in a
 * user-friendly format with old/new value comparison.
 */

import React from 'react';
import { AuditChanges, FIELD_LABELS } from '@/types/audit';
import { ArrowRight, Plus, Minus } from 'lucide-react';

interface ChangesDiffProps {
  changes: AuditChanges;
  expanded?: boolean;
  maxItems?: number;
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '(empty)';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  // Truncate long strings
  const str = String(value);
  if (str.length > 100) {
    return str.substring(0, 100) + '...';
  }
  
  return str;
}

/**
 * Get the label for a field
 */
function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Single change row component
 */
function ChangeRow({ 
  field, 
  oldValue, 
  newValue 
}: { 
  field: string; 
  oldValue: unknown; 
  newValue: unknown;
}) {
  const isAddition = oldValue === null && newValue !== null;
  const isDeletion = oldValue !== null && newValue === null;
  const isModification = oldValue !== null && newValue !== null;
  
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        {isAddition && (
          <Plus className="h-3.5 w-3.5 text-green-500 shrink-0" />
        )}
        {isDeletion && (
          <Minus className="h-3.5 w-3.5 text-red-500 shrink-0" />
        )}
        {isModification && (
          <ArrowRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        )}
        <span className="font-medium text-sm text-foreground">
          {getFieldLabel(field)}
        </span>
      </div>
      
      <div className="flex items-start gap-2 ml-5.5 text-sm">
        {isModification && (
          <>
            <span className="text-muted-foreground line-through">
              {formatValue(oldValue)}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-foreground">
              {formatValue(newValue)}
            </span>
          </>
        )}
        {isAddition && (
          <span className="text-green-600 dark:text-green-400">
            {formatValue(newValue)}
          </span>
        )}
        {isDeletion && (
          <span className="text-red-600 dark:text-red-400 line-through">
            {formatValue(oldValue)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * ChangesDiff displays all field changes from an audit entry
 */
export function ChangesDiff({ changes, expanded = true, maxItems = 5 }: ChangesDiffProps) {
  const entries = Object.entries(changes);
  
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No changes recorded
      </p>
    );
  }
  
  const displayEntries = expanded ? entries : entries.slice(0, maxItems);
  const hiddenCount = entries.length - displayEntries.length;
  
  return (
    <div className="space-y-0">
      {displayEntries.map(([field, change]) => (
        <ChangeRow
          key={field}
          field={field}
          oldValue={change.old}
          newValue={change.new}
        />
      ))}
      
      {hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground pt-2">
          +{hiddenCount} more change{hiddenCount > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

/**
 * Compact inline summary of changes
 */
export function ChangesSummary({ changes }: { changes: AuditChanges }) {
  const entries = Object.entries(changes);
  
  if (entries.length === 0) {
    return <span className="text-muted-foreground">No changes</span>;
  }
  
  if (entries.length === 1) {
    const [field] = entries[0];
    return <span>{getFieldLabel(field)} changed</span>;
  }
  
  // Show first field and count
  const [firstField] = entries[0];
  return (
    <span>
      {getFieldLabel(firstField)} and {entries.length - 1} other field{entries.length > 2 ? 's' : ''}
    </span>
  );
}

export default ChangesDiff;

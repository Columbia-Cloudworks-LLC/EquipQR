/**
 * Work Order Assignment Selector Component
 * 
 * This component provides a dropdown selector for assigning work orders to users.
 */

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Shield, Info, UserCheck } from 'lucide-react';
import type { AssignmentOption } from '@/hooks/useOptimizedWorkOrderAssignment';

// Support both old and new type names for backward compatibility
export type EnhancedAssignmentOption = AssignmentOption & {
  type?: 'admin' | 'user';
  canSelfAssign?: boolean;
};

interface EnhancedWorkOrderAssignmentSelectorProps {
  options: EnhancedAssignmentOption[];
  value?: string;
  onChange: (value: string, type: 'admin' | 'user') => void;
  placeholder?: string;
  disabled?: boolean;
}

const EnhancedWorkOrderAssignmentSelector: React.FC<EnhancedWorkOrderAssignmentSelectorProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select assignee",
  disabled = false
}) => {
  const handleChange = (selectedValue: string) => {
    const option = options.find(opt => opt.id === selectedValue);
    if (option) {
      onChange(selectedValue, option.type);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string, canSelfAssign?: boolean) => {
    switch (type) {
      case 'admin':
        return canSelfAssign ? 'You (Admin)' : 'Admin';
      default:
        return '';
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'admin':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Group options by type for better organization
  const adminOptions = options.filter(opt => opt.type === 'admin');

  return (
    <div className="space-y-3">
      <Select value={value} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              No assignees available
            </div>
          ) : (
            <>
              {/* Admin Options */}
              {adminOptions.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Organization Admins
                  </div>
                  {adminOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex items-center gap-2 w-full">
                        {getIcon(option.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span>{option.name}</span>
                            {option.canSelfAssign && <UserCheck className="h-3 w-3 text-blue-500" />}
                          </div>
                          {option.email && (
                            <div className="text-xs text-muted-foreground">{option.email}</div>
                          )}
                        </div>
                        <Badge variant={getTypeBadgeVariant(option.type)} className="text-xs">
                          {getTypeLabel(option.type, option.canSelfAssign)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </>
          )}
        </SelectContent>
      </Select>
      
      {/* Assignment Strategy Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Work orders can be assigned to organization admins who have the necessary permissions to manage equipment and work orders.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default EnhancedWorkOrderAssignmentSelector;

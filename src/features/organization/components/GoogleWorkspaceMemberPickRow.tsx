import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';

interface GoogleWorkspaceMemberPickRowProps {
  email: string;
  isSelected: boolean;
  isAdmin: boolean;
  onToggleSelected: (email: string, checked: boolean) => void;
  onToggleAdmin: (email: string, checked: boolean) => void;
  adminAriaLabel: string;
  /** Cells shown between the select checkbox and the admin checkbox (name, email, …). */
  children: React.ReactNode;
}

/**
 * Directory-user row for picking Google Workspace members to add: a select checkbox,
 * the caller's identity cells, then an admin checkbox that is only enabled once selected.
 */
export function GoogleWorkspaceMemberPickRow({
  email,
  isSelected,
  isAdmin,
  onToggleSelected,
  onToggleAdmin,
  adminAriaLabel,
  children,
}: GoogleWorkspaceMemberPickRowProps) {
  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelected(email, Boolean(checked))}
          aria-label={`Select ${email}`}
        />
      </TableCell>
      {children}
      <TableCell>
        <Checkbox
          checked={isAdmin}
          disabled={!isSelected}
          onCheckedChange={(checked) => onToggleAdmin(email, Boolean(checked))}
          aria-label={adminAriaLabel}
        />
      </TableCell>
    </TableRow>
  );
}

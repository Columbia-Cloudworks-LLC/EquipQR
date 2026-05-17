import React from 'react';
import { Mail, Phone } from 'lucide-react';
import { useExternalContacts } from '@/features/teams/hooks/useCustomerAccount';

interface CustomerContactActionsProps {
  customerId: string | null | undefined;
  compact?: boolean;
  emptyLabel?: string;
}

/**
 * Renders accessible tap-to-call / tap-to-email actions for QBO-sourced contacts
 * linked to a customer account. Returns null when no customerId is provided.
 * Shows a muted empty state only when `emptyLabel` is explicitly supplied.
 */
const CustomerContactActions: React.FC<CustomerContactActionsProps> = ({
  customerId,
  compact = false,
  emptyLabel,
}) => {
  const { data: allContacts = [], isLoading } = useExternalContacts(
    customerId ?? undefined
  );

  if (!customerId) return null;
  if (isLoading) return null;

  const qboContacts = allContacts.filter((c) => c.source === 'quickbooks');

  if (qboContacts.length === 0) {
    if (emptyLabel) {
      return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
    }
    return null;
  }

  const contactsWithAction = qboContacts.filter((c) => c.email || c.phone);
  if (contactsWithAction.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {contactsWithAction.map((c) => (
          <React.Fragment key={c.id}>
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                aria-label={`Email ${c.name} (${c.role ?? 'contact'})`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors min-h-[44px] px-2"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="sr-only">{c.email}</span>
              </a>
            )}
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
                aria-label={`Call ${c.name} (${c.role ?? 'contact'})`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors min-h-[44px] px-2"
              >
                <Phone className="h-3.5 w-3.5" />
                <span className="sr-only">{c.phone}</span>
              </a>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contactsWithAction.map((c) => (
        <div key={c.id} className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">{c.role ?? c.name}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                aria-label={`Email ${c.email}`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-3 w-3" />
                {c.email}
              </a>
            )}
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
                aria-label={`Call ${c.phone}`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="h-3 w-3" />
                {c.phone}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CustomerContactActions;

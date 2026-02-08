import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  TicketCheck,
  ChevronDown,
  Loader2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { useMyTickets, type Ticket } from '../hooks/useMyTickets';
import { useTicketRealtime } from '../hooks/useTicketRealtime';
import TicketDetail from './TicketDetail';

/**
 * Status badge configuration for ticket statuses.
 */
function getStatusBadge(status: string) {
  switch (status) {
    case 'open':
      return { label: 'Open', className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' };
    case 'in_progress':
      return { label: 'In Progress', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' };
    case 'closed':
      return { label: 'Closed', className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' };
    default:
      return { label: status, className: '' };
  }
}

/**
 * A single ticket row in the list, expandable to show details.
 */
const TicketRow: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
  const statusBadge = getStatusBadge(ticket.status);
  const timeAgo = formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true });
  const commentCount = ticket.ticket_comments?.length || 0;
  const teamCommentCount = ticket.ticket_comments?.filter(c => c.is_from_team).length || 0;

  return (
    <Collapsible>
      <CollapsibleTrigger className="w-full text-left group">
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">{ticket.title}</p>
              <Badge variant="outline" className={statusBadge.className}>
                {statusBadge.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
              {commentCount > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {teamCommentCount > 0
                    ? `${teamCommentCount} team response${teamCommentCount !== 1 ? 's' : ''}`
                    : `${commentCount} comment${commentCount !== 1 ? 's' : ''}`
                  }
                </span>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 transition-transform group-data-[state=open]:rotate-180" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3">
          <TicketDetail ticket={ticket} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/**
 * My Tickets section for the Support page.
 * Shows the user's submitted bug reports with status, comments,
 * and realtime updates via Supabase broadcast.
 */
const MyTickets: React.FC = () => {
  const { data: ticketsList, isLoading, error } = useMyTickets();

  // Subscribe to realtime ticket updates
  useTicketRealtime();

  // Don't render anything if loading or no tickets
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading your tickets...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="ml-2 text-sm text-muted-foreground">Failed to load tickets</span>
        </CardContent>
      </Card>
    );
  }

  // Don't render the section if user has no tickets
  if (!ticketsList || ticketsList.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TicketCheck className="h-5 w-5" />
          My Reported Issues
        </CardTitle>
        <CardDescription>
          Track the status of issues you've reported. Updates from our team appear in real time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {ticketsList.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MyTickets;

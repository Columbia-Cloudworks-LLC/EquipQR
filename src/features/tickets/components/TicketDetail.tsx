import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, User, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { Ticket, TicketComment } from '../hooks/useMyTickets';

interface TicketDetailProps {
  ticket: Ticket;
}

/**
 * Expandable detail view for a single ticket.
 * Shows the original description, session diagnostics summary,
 * and a timeline of comments from the team.
 */
const TicketDetail: React.FC<TicketDetailProps> = ({ ticket }) => {
  const metadata = ticket.metadata as Record<string, unknown> | null;

  return (
    <div className="space-y-4 pt-3">
      {/* Original description */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Description</p>
        <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3">
          {ticket.description}
        </p>
      </div>

      {/* Session diagnostics summary (if available) */}
      {metadata && (metadata.appVersion || metadata.currentUrl) && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Session Info</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
            {metadata.appVersion && (
              <>
                <span className="font-medium">Version</span>
                <span>{String(metadata.appVersion)}</span>
              </>
            )}
            {metadata.currentUrl && (
              <>
                <span className="font-medium">Route</span>
                <span className="truncate">{String(metadata.currentUrl)}</span>
              </>
            )}
            {metadata.organizationPlan && (
              <>
                <span className="font-medium">Plan</span>
                <span>{String(metadata.organizationPlan)}</span>
              </>
            )}
            {metadata.userRole && (
              <>
                <span className="font-medium">Role</span>
                <span>{String(metadata.userRole)}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Comments timeline */}
      {ticket.ticket_comments.length > 0 && (
        <div>
          <Separator className="my-2" />
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Responses ({ticket.ticket_comments.length})
          </p>
          <div className="space-y-3">
            {ticket.ticket_comments.map((comment: TicketComment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        </div>
      )}

      {ticket.ticket_comments.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No responses yet. Our team has been notified and will follow up.
        </p>
      )}
    </div>
  );
};

/**
 * A single comment in the ticket timeline.
 */
const CommentItem: React.FC<{ comment: TicketComment }> = ({ comment }) => {
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });

  return (
    <div className="flex gap-2">
      <div className="flex-shrink-0 mt-0.5">
        {comment.is_from_team ? (
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-3 w-3 text-primary" />
          </div>
        ) : (
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
            <User className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">
            {comment.author}
          </span>
          {comment.is_from_team && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              Team
            </span>
          )}
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <p className="text-sm mt-0.5 whitespace-pre-wrap">{comment.body}</p>
      </div>
    </div>
  );
};

export default TicketDetail;

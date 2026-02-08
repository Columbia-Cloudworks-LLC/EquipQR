/**
 * GITHUB-ISSUE-WEBHOOK Edge Function
 *
 * Receives GitHub webhook events for issue status changes and comments.
 * Syncs issue status and comments back to the tickets/ticket_comments tables
 * so users can see real-time updates on their bug reports.
 *
 * Security:
 * - verify_jwt = false (webhooks don't carry JWTs)
 * - HMAC-SHA256 signature verification via X-Hub-Signature-256 header
 * - Only processes issues with the "user-reported" label
 *
 * Events handled:
 * - issues: closed, reopened (status sync)
 * - issue_comment: created (comment sync)
 */

import {
  createAdminSupabaseClient,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

// =============================================================================
// Constants
// =============================================================================

const USER_REPORTED_LABEL = "user-reported";

// =============================================================================
// Helpers
// =============================================================================

function logStep(step: string, details?: Record<string, unknown>) {
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[GITHUB-ISSUE-WEBHOOK] ${step}${detailsStr}`);
}

/**
 * Verify GitHub webhook signature using HMAC-SHA256.
 * GitHub sends the signature in the X-Hub-Signature-256 header as "sha256=<hex>".
 */
async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const signature = signatureHeader.slice("sha256=".length);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) return false;
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Sanitize a comment body for storage.
 * Strips @mentions (privacy) and truncates to a reasonable length.
 */
function sanitizeCommentBody(body: string): string {
  return body
    // Neutralize @mentions
    .replace(/@/g, "@\u200B")
    // Strip HTML tags
    .replace(/<[^>]*>/g, "")
    // Truncate to 5000 chars
    .slice(0, 5000);
}

/**
 * Check if an issue has the user-reported label.
 */
function hasUserReportedLabel(
  labels: Array<{ name?: string } | string>
): boolean {
  return labels.some((label) => {
    const name = typeof label === "string" ? label : label.name;
    return name === USER_REPORTED_LABEL;
  });
}

// =============================================================================
// Event Handlers
// =============================================================================

/**
 * Handle issue status changes (closed, reopened).
 */
async function handleIssueEvent(
  action: string,
  issueNumber: number,
  adminClient: ReturnType<typeof createAdminSupabaseClient>
): Promise<{ handled: boolean; message: string }> {
  if (action !== "closed" && action !== "reopened") {
    return { handled: false, message: `Ignoring issue action: ${action}` };
  }

  const newStatus = action === "closed" ? "closed" : "open";
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
  };

  if (action === "closed") {
    updatePayload.closed_at = now;
  } else if (action === "reopened") {
    updatePayload.closed_at = null;
  }

  const { data, error } = await adminClient
    .from("tickets")
    .update(updatePayload)
    .eq("github_issue_number", issueNumber)
    .select("id")
    .maybeSingle();

  if (error) {
    logStep("ERROR: Failed to update ticket status", {
      issueNumber,
      error: error.message,
    });
    return { handled: false, message: "Failed to update ticket status" };
  }

  if (!data) {
    logStep("No matching ticket found for issue", { issueNumber });
    return { handled: false, message: "No matching ticket found" };
  }

  logStep("Ticket status updated", {
    ticketId: data.id,
    issueNumber,
    newStatus,
  });
  return { handled: true, message: `Ticket status updated to ${newStatus}` };
}

/**
 * Handle new issue comments.
 */
async function handleIssueCommentEvent(
  action: string,
  issueNumber: number,
  comment: {
    id: number;
    body: string;
    user: { login: string };
    created_at: string;
  },
  issueAssignees: Array<{ login: string }>,
  adminClient: ReturnType<typeof createAdminSupabaseClient>
): Promise<{ handled: boolean; message: string }> {
  if (action !== "created") {
    return { handled: false, message: `Ignoring comment action: ${action}` };
  }

  // Look up the ticket
  const { data: ticket, error: ticketError } = await adminClient
    .from("tickets")
    .select("id")
    .eq("github_issue_number", issueNumber)
    .maybeSingle();

  if (ticketError || !ticket) {
    logStep("No matching ticket for comment", { issueNumber });
    return { handled: false, message: "No matching ticket found" };
  }

  // Determine if the commenter is a team member (assignee or known team user)
  const assigneeLogins = issueAssignees.map((a) => a.login.toLowerCase());
  const isFromTeam = assigneeLogins.includes(comment.user.login.toLowerCase())
    || comment.user.login.toLowerCase() === "viralarchitect";

  const sanitizedBody = sanitizeCommentBody(comment.body);

  // Insert comment (idempotent via github_comment_id UNIQUE constraint)
  const { error: insertError } = await adminClient
    .from("ticket_comments")
    .upsert(
      {
        ticket_id: ticket.id,
        github_comment_id: comment.id,
        author: comment.user.login,
        body: sanitizedBody,
        is_from_team: isFromTeam,
        created_at: comment.created_at,
      },
      { onConflict: "github_comment_id" }
    );

  if (insertError) {
    logStep("ERROR: Failed to insert comment", {
      issueNumber,
      commentId: comment.id,
      error: insertError.message,
    });
    return { handled: false, message: "Failed to insert comment" };
  }

  // Update ticket's updated_at
  await adminClient
    .from("tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticket.id);

  logStep("Comment synced", {
    ticketId: ticket.id,
    commentId: comment.id,
    author: comment.user.login,
    isFromTeam,
  });
  return { handled: true, message: "Comment synced successfully" };
}

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    // 1. Only accept POST
    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    // 2. Read the raw body for signature verification
    const rawBody = await req.text();

    // 3. Verify webhook signature
    const webhookSecret = Deno.env.get("GITHUB_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("ERROR: GITHUB_WEBHOOK_SECRET not configured");
      return createErrorResponse("An unexpected error occurred", 500);
    }

    const signatureHeader = req.headers.get("X-Hub-Signature-256");
    const isValid = await verifyWebhookSignature(
      rawBody,
      signatureHeader,
      webhookSecret
    );

    if (!isValid) {
      logStep("Invalid webhook signature");
      return createErrorResponse("Forbidden", 403);
    }

    // 4. Parse the event
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return createErrorResponse("Invalid JSON body", 400);
    }

    const eventType = req.headers.get("X-GitHub-Event");
    const action = payload.action as string | undefined;

    logStep("Webhook received", { eventType, action });

    // 5. Extract issue info
    const issue = payload.issue as Record<string, unknown> | undefined;
    if (!issue) {
      logStep("No issue in payload, ignoring");
      return createJsonResponse({ handled: false, message: "No issue in payload" });
    }

    const issueNumber = issue.number as number;
    const issueLabels = (issue.labels as Array<{ name?: string }>) || [];

    // 6. Only process user-reported issues
    if (!hasUserReportedLabel(issueLabels)) {
      logStep("Issue does not have user-reported label, ignoring", { issueNumber });
      return createJsonResponse({ handled: false, message: "Not a user-reported issue" });
    }

    // 7. Create admin client for DB operations
    const adminClient = createAdminSupabaseClient();

    // 8. Route to appropriate handler
    let result: { handled: boolean; message: string };

    if (eventType === "issues" && action) {
      result = await handleIssueEvent(action, issueNumber, adminClient);
    } else if (eventType === "issue_comment" && action) {
      const comment = payload.comment as {
        id: number;
        body: string;
        user: { login: string };
        created_at: string;
      };

      if (!comment) {
        return createJsonResponse({ handled: false, message: "No comment in payload" });
      }

      const assignees = (issue.assignees as Array<{ login: string }>) || [];
      result = await handleIssueCommentEvent(
        action,
        issueNumber,
        comment,
        assignees,
        adminClient
      );
    } else {
      result = { handled: false, message: `Unhandled event: ${eventType}` };
    }

    logStep("Webhook processed", result);
    return createJsonResponse(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[GITHUB-ISSUE-WEBHOOK] Unhandled error:", errorMessage);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});

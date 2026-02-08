/**
 * CREATE-TICKET Edge Function
 *
 * Creates an in-app bug report ticket. The function:
 * 1. Authenticates the user via JWT
 * 2. Validates and sanitizes the request payload (title, description, metadata)
 * 3. Enforces per-user rate limiting (max 3 tickets per hour)
 * 4. Creates a GitHub Issue in Columbia-Cloudworks-LLC/EquipQR
 * 5. Inserts a record into the tickets table with the GitHub issue number
 *
 * Security:
 * - User content is sanitized to prevent markdown injection and @mention abuse
 * - Metadata fields are whitelisted and length-capped (client values are untrusted)
 * - Rate limiting prevents GitHub issue flooding and DB spam
 * - GitHub issue number is NOT returned to the client to avoid leaking repo info
 *
 * Privacy: The GitHub issue body contains only the user's UUID -- no PII/email.
 */

import {
  createUserSupabaseClient,
  createAdminSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

// =============================================================================
// Constants
// =============================================================================

const GITHUB_REPO_OWNER = "Columbia-Cloudworks-LLC";
const GITHUB_REPO_NAME = "EquipQR";
const GITHUB_ASSIGNEE = "viralarchitect";
const GITHUB_LABEL = "user-reported";

const MIN_TITLE_LENGTH = 5;
const MAX_TITLE_LENGTH = 200;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 5000;

/** Maximum metadata string field length */
const MAX_METADATA_FIELD_LENGTH = 500;

/** Rate limit: max tickets per user within the rate window */
const RATE_LIMIT_MAX_TICKETS = 3;
/** Rate limit window in minutes */
const RATE_LIMIT_WINDOW_MINUTES = 60;

// =============================================================================
// Helpers
// =============================================================================

function logStep(step: string, details?: Record<string, unknown>) {
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-TICKET] ${step}${detailsStr}`);
}

/**
 * Sanitize a string for safe embedding in GitHub-flavored markdown.
 *
 * - Neutralizes @mentions by inserting a zero-width space after @
 * - Escapes pipe characters (breaks markdown tables)
 * - Strips HTML tags to prevent rendering in GitHub markdown
 * - Escapes markdown link syntax to prevent phishing links
 */
function sanitizeForMarkdown(input: string): string {
  return input
    // Neutralize @mentions: insert zero-width space after @
    .replace(/@/g, "@\u200B")
    // Strip HTML tags (GitHub renders some HTML in markdown)
    .replace(/<[^>]*>/g, "")
    // Escape pipe characters that break markdown table layout
    .replace(/\|/g, "\\|")
    // Escape markdown link syntax [text](url) to prevent phishing links
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "\\[$1\\]\\($2\\)");
}

/**
 * Validate and sanitize metadata from the client.
 * Only whitelisted fields are kept; all values are type-checked and length-capped.
 * Client-supplied metadata is untrusted -- it cannot be verified server-side.
 */
function sanitizeMetadata(raw: Record<string, unknown>): {
  userAgent: string;
  currentUrl: string;
  timestamp: string;
} {
  return {
    userAgent:
      typeof raw.userAgent === "string"
        ? raw.userAgent.slice(0, MAX_METADATA_FIELD_LENGTH)
        : "Unknown",
    currentUrl:
      typeof raw.currentUrl === "string"
        ? raw.currentUrl.slice(0, MAX_METADATA_FIELD_LENGTH)
        : "Unknown",
    timestamp:
      typeof raw.timestamp === "string"
        ? raw.timestamp.slice(0, 50)
        : new Date().toISOString(),
  };
}

/**
 * Build the GitHub issue body with debug context and no PII.
 * All user-supplied content is sanitized before interpolation.
 */
function buildGitHubIssueBody(
  userId: string,
  description: string,
  metadata: { userAgent: string; currentUrl: string; timestamp: string }
): string {
  // Sanitize all user-supplied content for safe markdown rendering
  const safeDescription = sanitizeForMarkdown(description);
  const safeUserAgent = sanitizeForMarkdown(metadata.userAgent);
  const safeRoute = sanitizeForMarkdown(metadata.currentUrl);
  // Timestamp is already length-capped; sanitize for table safety
  const safeTimestamp = sanitizeForMarkdown(metadata.timestamp);

  // Wrap description in a fenced code block to neutralize any remaining
  // markdown formatting the user may have included
  return `## User-Reported Issue

**Reported by:** User UUID \`${userId}\`

### Description

\`\`\`
${safeDescription}
\`\`\`

### Debug Context

| Field | Value |
|-------|-------|
| **Browser/OS** | ${safeUserAgent} |
| **Route** | ${safeRoute} |
| **Timestamp** | ${safeTimestamp} |

---
*This issue was automatically created via the EquipQR in-app bug reporting system.*`;
}

/**
 * Check per-user rate limit by counting recent tickets.
 * Returns true if the user is within the rate limit, false if exceeded.
 */
async function checkRateLimit(
  adminClient: ReturnType<typeof createAdminSupabaseClient>,
  userId: string
): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { count, error } = await adminClient
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", windowStart);

  if (error) {
    // If we can't check, fail open but log the error
    logStep("WARNING: Rate limit check failed, allowing request", {
      error: error.message,
    });
    return true;
  }

  return (count ?? 0) < RATE_LIMIT_MAX_TICKETS;
}

/**
 * Create a GitHub issue via the REST API.
 */
async function createGitHubIssue(
  title: string,
  body: string,
  githubPat: string
): Promise<{ number: number; html_url: string }> {
  const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/issues`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubPat}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "EquipQR-BugReporter",
    },
    body: JSON.stringify({
      title,
      body,
      assignees: [GITHUB_ASSIGNEE],
      labels: [GITHUB_LABEL],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logStep("GitHub API error", {
      status: response.status,
      body: errorText,
    });
    throw new Error("GitHub API request failed");
  }

  const data = await response.json();
  return { number: data.number, html_url: data.html_url };
}

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    // 1. Authenticate user
    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }
    const { user } = auth;
    logStep("User authenticated", { userId: user.id });

    // 2. Validate request method
    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    // 3. Parse and validate request body
    let body: {
      title?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    };
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400);
    }

    const { title, description, metadata: rawMetadata = {} } = body;

    if (!title || !description) {
      return createErrorResponse("title and description are required", 400);
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (
      trimmedTitle.length < MIN_TITLE_LENGTH ||
      trimmedTitle.length > MAX_TITLE_LENGTH
    ) {
      return createErrorResponse(
        `Title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters`,
        400
      );
    }

    if (
      trimmedDescription.length < MIN_DESCRIPTION_LENGTH ||
      trimmedDescription.length > MAX_DESCRIPTION_LENGTH
    ) {
      return createErrorResponse(
        `Description must be between ${MIN_DESCRIPTION_LENGTH} and ${MAX_DESCRIPTION_LENGTH} characters`,
        400
      );
    }

    // 4. Sanitize metadata (whitelist fields, cap lengths, discard unknowns)
    const sanitizedMetadata = sanitizeMetadata(rawMetadata);

    // 5. Rate limit check (before calling GitHub API)
    const adminClient = createAdminSupabaseClient();

    const withinRateLimit = await checkRateLimit(adminClient, user.id);
    if (!withinRateLimit) {
      logStep("Rate limit exceeded", { userId: user.id });
      return createErrorResponse(
        `Rate limit exceeded. You can submit up to ${RATE_LIMIT_MAX_TICKETS} reports per hour`,
        429
      );
    }

    // 6. Create GitHub Issue
    const githubPat = Deno.env.get("GITHUB_PAT");
    if (!githubPat) {
      logStep("ERROR: GITHUB_PAT environment variable not set");
      return createErrorResponse("An unexpected error occurred", 500);
    }

    logStep("Creating GitHub issue", { title: trimmedTitle });

    // Sanitize title for GitHub (strip @mentions, no markdown needed for title)
    const sanitizedTitle = sanitizeForMarkdown(trimmedTitle);

    let githubIssue: { number: number; html_url: string };
    try {
      const issueBody = buildGitHubIssueBody(
        user.id,
        trimmedDescription,
        sanitizedMetadata
      );
      githubIssue = await createGitHubIssue(
        sanitizedTitle,
        issueBody,
        githubPat
      );
      logStep("GitHub issue created", {
        issueNumber: githubIssue.number,
        url: githubIssue.html_url,
      });
    } catch (error) {
      logStep("ERROR: Failed to create GitHub issue", {
        message: error instanceof Error ? error.message : String(error),
      });
      return createErrorResponse("Failed to create GitHub issue", 500);
    }

    // 7. Insert ticket record using admin client (to set github_issue_number atomically)
    const { data: ticket, error: insertError } = await adminClient
      .from("tickets")
      .insert({
        user_id: user.id,
        title: trimmedTitle,
        description: trimmedDescription,
        status: "open",
        github_issue_number: githubIssue.number,
        metadata: {
          ...sanitizedMetadata,
          github_issue_url: githubIssue.html_url,
        },
      })
      .select("id")
      .single();

    if (insertError || !ticket) {
      logStep("ERROR: Failed to insert ticket", {
        error: insertError?.message,
      });
      return createErrorResponse("Failed to create ticket record", 500);
    }

    logStep("Ticket created successfully", {
      ticketId: ticket.id,
      githubIssueNumber: githubIssue.number,
    });

    // 8. Return success (intentionally omits githubIssueNumber to avoid
    //    leaking repo info if the repository is public)
    return createJsonResponse({
      success: true,
      ticketId: ticket.id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-TICKET] Unhandled error:", errorMessage);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});

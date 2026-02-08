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
/** Maximum length for array items in metadata */
const MAX_METADATA_ARRAY_ITEM_LENGTH = 200;
/** Maximum number of items in metadata arrays */
const MAX_METADATA_ARRAY_SIZE = 10;

/** Rate limit: max tickets per user within the rate window */
const RATE_LIMIT_MAX_TICKETS = 3;
/** Rate limit window in minutes */
const RATE_LIMIT_WINDOW_MINUTES = 60;

// =============================================================================
// Types
// =============================================================================

interface SanitizedMetadata {
  // Core
  appVersion: string;
  userAgent: string;
  currentUrl: string;
  timestamp: string;
  // Environment
  screenSize: string;
  devicePixelRatio: number;
  isOnline: boolean;
  timezone: string;
  sessionDuration: number;
  // Organization context (IDs only)
  organizationId: string | null;
  organizationPlan: string | null;
  userRole: string | null;
  // Feature flags
  featureFlags: Record<string, boolean>;
  // Errors & diagnostics
  recentErrors: string[];
  failedQueries: string[];
  performanceMetrics: {
    pageLoadTime: number | null;
    memoryUsage: number | null;
  };
}

// =============================================================================
// Helpers
// =============================================================================

/** Fields that may contain user-provided PII and must never appear in logs. */
const REDACTED_LOG_FIELDS = new Set([
  "title",
  "description",
  "body",
  "name",
  "email",
]);

function logStep(step: string, details?: Record<string, unknown>) {
  if (details) {
    const safeDetails: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
      safeDetails[key] = REDACTED_LOG_FIELDS.has(key.toLowerCase())
        ? "[REDACTED]"
        : value;
    }
    console.log(`[CREATE-TICKET] ${step} | ${JSON.stringify(safeDetails)}`);
  } else {
    console.log(`[CREATE-TICKET] ${step}`);
  }
}

/**
 * Strip HTML tags recursively to prevent injection via nested tags.
 * Example: `<scr<script>ipt>` -> after one pass becomes `<script>` -> stripped on next pass.
 */
function stripHtmlTags(input: string): string {
  const tagPattern = /<[^>]*>/g;
  let result = input;
  let previous: string;
  do {
    previous = result;
    result = result.replace(tagPattern, "");
  } while (result !== previous);
  return result;
}

/**
 * Sanitize a string for safe embedding in GitHub-flavored markdown.
 */
function sanitizeForMarkdown(input: string): string {
  return stripHtmlTags(
    input
      .replace(/@/g, "@\u200B")
      // Escape backslashes first so later escaping uses only literal backslashes.
      .replace(/\\/g, "\\\\")
      .replace(/\|/g, "\\|")
      .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "\\[$1\\]\\($2\\)")
      // Escape backtick sequences to prevent breaking out of fenced code blocks.
      // Insert a zero-width space after the first backtick of any run of 3+.
      .replace(/`{3,}/g, (match) => "`\u200B" + match.slice(1))
  );
}

/**
 * Redact potential PII from user-provided text before posting to GitHub.
 * Strips email addresses and phone-like patterns.
 */
function redactPII(input: string): string {
  return input
    // Redact email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email redacted]")
    // Redact phone numbers (various formats)
    .replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[phone redacted]");
}

/**
 * Strip query string from a URL path to prevent PII leakage
 * (query params may contain tokens, emails, etc.)
 */
function stripQueryString(url: string): string {
  const qIndex = url.indexOf("?");
  return qIndex >= 0 ? url.slice(0, qIndex) : url;
}

/** Safely extract a string from raw metadata */
function safeString(
  raw: Record<string, unknown>,
  key: string,
  maxLen: number,
  fallback: string
): string {
  const val = raw[key];
  return typeof val === "string" ? val.slice(0, maxLen) : fallback;
}

/** Safely extract a number from raw metadata */
function safeNumber(
  raw: Record<string, unknown>,
  key: string,
  fallback: number
): number {
  const val = raw[key];
  return typeof val === "number" && isFinite(val) ? val : fallback;
}

/** Safely extract a boolean from raw metadata */
function safeBool(
  raw: Record<string, unknown>,
  key: string,
  fallback: boolean
): boolean {
  const val = raw[key];
  return typeof val === "boolean" ? val : fallback;
}

/** Safely extract a nullable string */
function safeNullableString(
  raw: Record<string, unknown>,
  key: string,
  maxLen: number
): string | null {
  const val = raw[key];
  return typeof val === "string" ? val.slice(0, maxLen) : null;
}

/** Safely extract a string array */
function safeStringArray(
  raw: Record<string, unknown>,
  key: string,
  maxItems: number,
  maxItemLen: number
): string[] {
  const val = raw[key];
  if (!Array.isArray(val)) return [];
  return val
    .filter((item): item is string => typeof item === "string")
    .slice(0, maxItems)
    .map((s) => s.slice(0, maxItemLen));
}

/**
 * Validate and sanitize metadata from the client.
 * Only whitelisted fields are kept; all values are type-checked and length-capped.
 */
function sanitizeMetadata(raw: Record<string, unknown>): SanitizedMetadata {
  // Feature flags -- whitelist only known boolean flags
  const rawFlags = (typeof raw.featureFlags === "object" && raw.featureFlags !== null)
    ? raw.featureFlags as Record<string, unknown>
    : {};
  const featureFlags: Record<string, boolean> = {};
  for (const key of ["billingEnabled", "quickbooksEnabled"]) {
    if (typeof rawFlags[key] === "boolean") {
      featureFlags[key] = rawFlags[key] as boolean;
    }
  }

  // Performance metrics
  const rawPerf = (typeof raw.performanceMetrics === "object" && raw.performanceMetrics !== null)
    ? raw.performanceMetrics as Record<string, unknown>
    : {};

  return {
    appVersion: safeString(raw, "appVersion", 50, "Unknown"),
    userAgent: safeString(raw, "userAgent", MAX_METADATA_FIELD_LENGTH, "Unknown"),
    currentUrl: safeString(raw, "currentUrl", MAX_METADATA_FIELD_LENGTH, "Unknown"),
    timestamp: safeString(raw, "timestamp", 50, new Date().toISOString()),
    screenSize: safeString(raw, "screenSize", 20, "Unknown"),
    devicePixelRatio: safeNumber(raw, "devicePixelRatio", 1),
    isOnline: safeBool(raw, "isOnline", true),
    timezone: safeString(raw, "timezone", 100, "Unknown"),
    sessionDuration: safeNumber(raw, "sessionDuration", 0),
    organizationId: safeNullableString(raw, "organizationId", 50),
    organizationPlan: safeNullableString(raw, "organizationPlan", 20),
    userRole: safeNullableString(raw, "userRole", 20),
    featureFlags,
    recentErrors: safeStringArray(raw, "recentErrors", MAX_METADATA_ARRAY_SIZE, MAX_METADATA_ARRAY_ITEM_LENGTH),
    failedQueries: safeStringArray(raw, "failedQueries", MAX_METADATA_ARRAY_SIZE, MAX_METADATA_ARRAY_ITEM_LENGTH),
    performanceMetrics: {
      pageLoadTime: typeof rawPerf.pageLoadTime === "number" && isFinite(rawPerf.pageLoadTime)
        ? rawPerf.pageLoadTime : null,
      memoryUsage: typeof rawPerf.memoryUsage === "number" && isFinite(rawPerf.memoryUsage)
        ? rawPerf.memoryUsage : null,
    },
  };
}

/**
 * Build the GitHub issue body with debug context and no PII.
 * Includes a collapsible diagnostics section for developer context.
 */
function buildGitHubIssueBody(
  userId: string,
  description: string,
  metadata: SanitizedMetadata
): string {
  const safeDescription = sanitizeForMarkdown(redactPII(description));

  // Strip query strings from URL to prevent PII leakage (tokens, emails in params)
  const safeRoute = stripQueryString(metadata.currentUrl);

  // Build diagnostics table rows
  const diagRows = [
    `| **App Version** | ${sanitizeForMarkdown(metadata.appVersion)} |`,
    `| **Browser/OS** | ${sanitizeForMarkdown(metadata.userAgent)} |`,
    `| **Route** | ${sanitizeForMarkdown(safeRoute)} |`,
    `| **Screen** | ${sanitizeForMarkdown(metadata.screenSize)} @${metadata.devicePixelRatio}x |`,
    `| **Online** | ${metadata.isOnline} |`,
    `| **Timezone** | ${sanitizeForMarkdown(metadata.timezone)} |`,
    `| **Session Duration** | ${metadata.sessionDuration}s |`,
  ];

  if (metadata.organizationPlan) {
    diagRows.push(`| **Org Plan** | ${sanitizeForMarkdown(metadata.organizationPlan)} |`);
  }
  if (metadata.userRole) {
    diagRows.push(`| **User Role** | ${sanitizeForMarkdown(metadata.userRole)} |`);
  }
  if (metadata.performanceMetrics.pageLoadTime !== null) {
    diagRows.push(`| **Page Load** | ${metadata.performanceMetrics.pageLoadTime}ms |`);
  }
  if (metadata.performanceMetrics.memoryUsage !== null) {
    diagRows.push(`| **Memory** | ${metadata.performanceMetrics.memoryUsage}MB |`);
  }

  // Build errors section
  let errorsSection = "";
  if (metadata.recentErrors.length > 0) {
    const safeErrors = metadata.recentErrors.map(e => sanitizeForMarkdown(e)).join("\n");
    errorsSection = `\n**Recent Errors (${metadata.recentErrors.length}):**\n\n\`\`\`\n${safeErrors}\n\`\`\`\n`;
  }

  // Build failed queries section
  let queriesSection = "";
  if (metadata.failedQueries.length > 0) {
    const safeQueries = metadata.failedQueries
      .map(q => `- \`${sanitizeForMarkdown(q)}\``)
      .join("\n");
    queriesSection = `\n**Failed Queries:**\n\n${safeQueries}\n`;
  }

  return `## User-Reported Issue

**Reported by:** User UUID \`${userId}\`

### Description

\`\`\`
${safeDescription}
\`\`\`

<details>
<summary>Session Diagnostics</summary>

| Field | Value |
|-------|-------|
${diagRows.join("\n")}
${errorsSection}${queriesSection}
</details>

---
*This issue was automatically created via the EquipQR in-app bug reporting system.*`;
}

/**
 * Check per-user rate limit by counting recent tickets.
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
    logStep("GitHub API error", {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error("GitHub API request failed");
  }

  const data = await response.json();
  return { number: data.number, html_url: data.html_url };
}

/**
 * Close a GitHub issue as compensation when the DB insert fails.
 * This is a best-effort operation -- if it fails we log and move on
 * because we cannot leave the user hanging for a secondary cleanup.
 */
async function closeGitHubIssue(
  issueNumber: number,
  githubPat: string
): Promise<void> {
  const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/issues/${issueNumber}`;
  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "EquipQR-BugReporter",
      },
      body: JSON.stringify({
        state: "closed",
        state_reason: "not_planned",
        labels: [GITHUB_LABEL, "orphan-cleanup"],
      }),
    });

    if (!response.ok) {
      logStep("WARNING: Failed to close orphan GitHub issue", {
        issueNumber,
        status: response.status,
        statusText: response.statusText,
      });
    } else {
      logStep("Orphan GitHub issue closed successfully", { issueNumber });
    }
  } catch (error) {
    logStep("WARNING: Exception closing orphan GitHub issue", {
      issueNumber,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Maximum number of DB insert retries before compensating */
const DB_INSERT_MAX_RETRIES = 2;
/** Delay between DB insert retries in milliseconds */
const DB_INSERT_RETRY_DELAY_MS = 500;

/** Simple delay helper */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (req) => {
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

    logStep("Creating GitHub issue");

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

    // 7. Insert ticket record using admin client (with retry + compensation)
    //    If the DB insert fails after retries, close the GitHub issue to
    //    prevent orphan issues in the repository.
    let ticket: { id: string } | null = null;
    let lastInsertError: string | undefined;

    for (let attempt = 1; attempt <= DB_INSERT_MAX_RETRIES + 1; attempt++) {
      const { data, error: insertError } = await adminClient
        .from("tickets")
        .insert({
          user_id: user.id,
          title: trimmedTitle,
          description: trimmedDescription,
          status: "open",
          github_issue_number: githubIssue.number,
          github_issue_url: githubIssue.html_url,
          metadata: sanitizedMetadata,
        })
        .select("id")
        .single();

      if (!insertError && data) {
        ticket = data;
        break;
      }

      lastInsertError = insertError?.message;
      logStep(`DB insert attempt ${attempt} failed`, {
        error: lastInsertError,
        willRetry: attempt <= DB_INSERT_MAX_RETRIES,
      });

      if (attempt <= DB_INSERT_MAX_RETRIES) {
        await delay(DB_INSERT_RETRY_DELAY_MS * attempt);
      }
    }

    if (!ticket) {
      logStep("ERROR: All DB insert attempts failed, compensating by closing GitHub issue", {
        issueNumber: githubIssue.number,
        lastError: lastInsertError,
      });
      await closeGitHubIssue(githubIssue.number, githubPat);
      return createErrorResponse("Failed to create ticket record", 500);
    }

    logStep("Ticket created successfully", {
      ticketId: ticket.id,
      githubIssueNumber: githubIssue.number,
    });

    // 8. Return success
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

/**
 * Workspace Domain Claim Email Edge Function
 *
 * Sends notification emails to super admins and requesting org admins
 * when a workspace domain claim is submitted.
 *
 * Features:
 * - 24-hour cooldown between email sends to prevent spam
 * - Notifies both super admins and requesting org's admins
 * - Supports resend for existing pending claims
 */

import { Resend } from "npm:resend@2.0.0";
import {
  createUserSupabaseClient,
  createAdminSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const COOLDOWN_HOURS = 24;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[WORKSPACE-DOMAIN-CLAIM-EMAIL] ${step}${detailsStr}`);
};

interface ClaimEmailRequest {
  domain: string;
  organizationId?: string;
}

interface ClaimDetails {
  claim_id: string;
  domain: string;
  requested_by_user_id: string;
  requester_email: string;
  requester_name: string | null;
  organization_id: string | null;
  organization_name: string | null;
  admin_notified_at: string | null;
  requested_at: string;
}

interface NotificationRecipient {
  user_id: string;
  email: string;
  name: string | null;
  is_super_admin: boolean;
}

// HTML escape function to prevent XSS in email templates
// NOTE: For this single email template, manual HTML escaping is sufficient and secure.
// If we need multiple complex email templates in the future, consider using a template
// library like mjml or a dedicated email template engine for better maintainability.
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function started");

    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    // Create user-scoped client for auth validation
    const userSupabase = createUserSupabaseClient(req);

    // Validate user authentication
    const auth = await requireUser(req, userSupabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    const { user } = auth;
    logStep("User authenticated", { userId: user.id });

    const { domain, organizationId }: ClaimEmailRequest = await req.json();

    if (!domain) {
      return createErrorResponse("Domain is required", 400);
    }

    logStep("Request received", { domain, organizationId });

    // Use admin client for database operations (bypasses RLS)
    const adminSupabase = createAdminSupabaseClient();

    // Get pending claim details
    const { data: claimData, error: claimError } = await adminSupabase.rpc(
      "get_pending_workspace_claim_for_notification",
      { p_domain: domain }
    );

    if (claimError) {
      logStep("Error fetching claim", { error: claimError.message });
      return createErrorResponse("Failed to fetch claim details", 500);
    }

    if (!claimData || claimData.length === 0) {
      logStep("No pending claim found for domain", { domain });
      return createErrorResponse("No pending claim found for this domain", 404);
    }

    const claim = claimData[0] as ClaimDetails;
    logStep("Claim found", { claimId: claim.claim_id, domain: claim.domain });

    // Verify the requester is the one making this request
    // (or they're a super admin - checked below)
    if (claim.requested_by_user_id !== user.id) {
      logStep("User is not the claim requester", {
        requesterId: claim.requested_by_user_id,
        userId: user.id,
      });
      return createErrorResponse("Only the claim requester can send notification emails", 403);
    }

    // Check cooldown
    if (claim.admin_notified_at) {
      const lastNotified = new Date(claim.admin_notified_at);
      const hoursSinceNotification =
        (Date.now() - lastNotified.getTime()) / (1000 * 60 * 60);

      if (hoursSinceNotification < COOLDOWN_HOURS) {
        const hoursRemaining = Math.ceil(COOLDOWN_HOURS - hoursSinceNotification);
        logStep("Cooldown active", { hoursRemaining });
        return createErrorResponse(
          `Please wait ${hoursRemaining} hour(s) before sending another notification`,
          429
        );
      }
    }

    // Get super admin org ID from environment
    const superAdminOrgId = Deno.env.get("SUPER_ADMIN_ORG_ID");
    if (!superAdminOrgId) {
      logStep("Warning: SUPER_ADMIN_ORG_ID not configured");
    }

    // Use provided organizationId or fall back to claim's organization_id
    const effectiveOrgId = organizationId || claim.organization_id;

    // Get notification recipients
    const { data: recipients, error: recipientsError } = await adminSupabase.rpc(
      "get_workspace_claim_notification_recipients",
      {
        p_organization_id: effectiveOrgId,
        p_super_admin_org_id: superAdminOrgId,
      }
    );

    if (recipientsError) {
      logStep("Error fetching recipients", { error: recipientsError.message });
      return createErrorResponse("Failed to fetch notification recipients", 500);
    }

    if (!recipients || recipients.length === 0) {
      logStep("No recipients found");
      return createErrorResponse("No admin recipients found to notify", 404);
    }

    const recipientList = recipients as NotificationRecipient[];
    const recipientEmails = [...new Set(recipientList.map((r) => r.email))];

    logStep("Recipients found", {
      count: recipientEmails.length,
      superAdminCount: recipientList.filter((r) => r.is_super_admin).length,
    });

    // Build email content
    const safeRequesterName = escapeHtml(claim.requester_name || "Unknown User");
    const safeRequesterEmail = escapeHtml(claim.requester_email);
    const safeDomain = escapeHtml(claim.domain);
    const safeOrgName = claim.organization_name
      ? escapeHtml(claim.organization_name)
      : null;

    const baseUrl =
      Deno.env.get("PRODUCTION_URL") ||
      `${Deno.env
        .get("SUPABASE_URL")
        ?.replace(".supabase.co", "")}.lovableproject.com`;
    const equipQRLogoUrl = `${baseUrl}/icons/EquipQR-Icon-Purple-Medium.png`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- EquipQR Logo Section -->
        <div style="text-align: center; margin-bottom: 16px; padding: 12px 0;">
          <img src="${equipQRLogoUrl}" alt="EquipQR™ Logo" style="width: 100px; height: auto; display: block; margin: 0 auto;" />
        </div>
        
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1a1a1a; font-size: 28px; font-weight: bold; margin: 0;">EquipQR™</h1>
          <p style="color: #666; font-size: 16px; margin: 8px 0 0 0;">Workspace Domain Approval Request</p>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="color: #92400e; font-size: 20px; margin: 0 0 16px 0;">Action Required: Domain Claim Review</h2>
          <p style="color: #78350f; font-size: 16px; margin: 0;">
            A user has requested to claim a Google Workspace domain for EquipQR.
          </p>
        </div>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h3 style="color: #374151; font-size: 18px; margin: 0 0 16px 0;">Request Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 140px;">Domain:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">${safeDomain}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Requested By:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${safeRequesterName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${safeRequesterEmail}</td>
            </tr>
            ${
              safeOrgName
                ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Organization:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${safeOrgName}</td>
            </tr>
            `
                : ""
            }
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Requested At:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${new Date(claim.requested_at).toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="background: #f1f5f9; border-radius: 6px; padding: 16px; margin: 24px 0;">
          <h3 style="color: #374151; font-size: 16px; margin: 0 0 8px 0;">What does approval mean?</h3>
          <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
            <li>The user will be able to create an EquipQR organization for this domain</li>
            <li>They can connect Google Workspace to sync directory users</li>
            <li>Team members from the domain can be added to the organization</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
            To review this request, contact a super administrator or use the admin panel.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
        
        <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated notification from EquipQR™. You received this because you are an administrator.
          </p>
        </div>
      </div>
    `;

    // Send the email
    logStep("Sending email", {
      to: recipientEmails,
      from: "admin@equipqr.app",
    });

    const emailResponse = await resend.emails.send({
      from: "EquipQR™ Admin <admin@equipqr.app>",
      to: recipientEmails,
      subject: `[Action Required] Workspace Domain Claim: ${safeDomain}`,
      html: emailHtml,
    });

    if (emailResponse.error) {
      logStep("Resend error", { error: emailResponse.error });
      return createErrorResponse("Failed to send notification email", 500);
    }

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    // Update notification timestamp
    const { error: updateError } = await adminSupabase.rpc(
      "update_workspace_claim_notification",
      {
        p_claim_id: claim.claim_id,
        p_notified_by_user_id: user.id,
      }
    );

    if (updateError) {
      logStep("Warning: Failed to update notification timestamp", {
        error: updateError.message,
      });
      // Don't fail the request - email was sent successfully
    }

    return createJsonResponse({
      success: true,
      emailId: emailResponse.data?.id,
      recipientCount: recipientEmails.length,
    });
  } catch (error: unknown) {
    logStep("ERROR", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createErrorResponse("Failed to send notification email", 500);
  }
});

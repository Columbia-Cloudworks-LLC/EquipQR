/**
 * Send Invitation Email Edge Function
 * 
 * Sends an invitation email to a user being invited to an organization.
 * Requires authenticated user (verify_jwt=true in config.toml).
 * Verifies the caller has permission to invite users to the organization.
 */

import { Resend } from "npm:resend@2.0.0";
import {
  createUserSupabaseClient,
  requireUser,
  verifyOrgAdmin,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-INVITATION] ${step}${detailsStr}`);
};

interface InvitationEmailRequest {
  invitationId: string;
  email: string;
  role: string;
  organizationName: string;
  inviterName: string;
  message?: string;
}

// HTML escape function to prevent XSS in email templates
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

    // Create user-scoped client (RLS enforced)
    const supabase = createUserSupabaseClient(req);

    // Validate user authentication
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    const { user } = auth;
    logStep("User authenticated", { userId: user.id });

    const {
      invitationId,
      email,
      role,
      organizationName,
      inviterName,
      message,
    }: InvitationEmailRequest = await req.json();

    logStep("Request received", { invitationId, email, role, organizationName });

    // First, get the invitation to determine the organization
    // RLS will ensure user can only see invitations for orgs they have access to
    const { data: invitation, error: invitationError } = await supabase
      .from("organization_invitations")
      .select(
        `
        id,
        invitation_token,
        organization_id,
        organizations!inner(name, logo)
      `
      )
      .eq("id", invitationId)
      .single();

    if (invitationError || !invitation) {
      logStep("Invitation not found or access denied", {
        error: invitationError?.message,
      });
      return createErrorResponse("Invitation not found", 404);
    }

    // Defense-in-depth: Verify user has admin/owner role, not just read access.
    // 
    // WHY THIS IS NECESSARY (do not remove as "redundant"):
    // RLS on organization_invitations may allow read access to members who can see
    // their own invitations or pending invitations to their org. However, only
    // admins/owners should be able to SEND invitation emails. This check ensures
    // the caller actually has admin privileges, not just read access via RLS.
    // Without this check, a non-admin member could potentially trigger invitation
    // emails for invitations they can read but shouldn't be able to act on.
    const isAdmin = await verifyOrgAdmin(
      supabase,
      user.id,
      invitation.organization_id
    );
    if (!isAdmin) {
      logStep("User is not admin of organization", {
        userId: user.id,
        orgId: invitation.organization_id,
      });
      return createErrorResponse(
        "Only organization admins can send invitation emails",
        403
      );
    }

    logStep("Invitation token retrieved", {
      token: invitation.invitation_token,
    });

    // Sanitize user inputs to prevent XSS
    const safeOrganizationName = escapeHtml(organizationName);
    const safeInviterName = escapeHtml(inviterName);
    const safeRole = escapeHtml(role);
    const safeMessage = message ? escapeHtml(message) : undefined;

    // Extract organization logo from the joined data with runtime type validation.
    // The database join returns organizations as an object, but we validate the
    // shape at runtime to guard against schema changes that could cause failures.
    const rawOrg = invitation.organizations;
    const isValidOrgShape = (
      obj: unknown
    ): obj is { name: string; logo?: string | null } => {
      return (
        typeof obj === "object" &&
        obj !== null &&
        "name" in obj &&
        typeof (obj as { name: unknown }).name === "string" &&
        (!("logo" in obj) ||
          typeof (obj as { logo: unknown }).logo === "string" ||
          (obj as { logo: unknown }).logo === null)
      );
    };
    
    if (!isValidOrgShape(rawOrg)) {
      logStep("WARNING: Unexpected organizations shape in invitation", {
        invitationId,
        orgType: typeof rawOrg,
      });
    }
    
    const organizationLogo = isValidOrgShape(rawOrg) ? rawOrg.logo : undefined;

    // Construct the invitation URL using production URL if available
    const baseUrl =
      Deno.env.get("PRODUCTION_URL") ||
      `${Deno.env
        .get("SUPABASE_URL")
        ?.replace(".supabase.co", "")}.lovableproject.com`;
    const invitationUrl = `${baseUrl}/invitation/${invitation.invitation_token}`;

    // Construct absolute URLs for logos
    // Use purple medium logo (preferred branding that works on any background)
    const equipQRLogoUrl = `${baseUrl}/icons/EquipQR-Icon-Purple-Medium.png`;

    // Create email HTML content
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- EquipQR Logo Section -->
        <div style="text-align: center; margin-bottom: 16px; padding: 12px 0;">
          <img src="${equipQRLogoUrl}" alt="EquipQR™ Logo" style="width: 100px; height: auto; display: block; margin: 0 auto;" />
        </div>
        
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1a1a1a; font-size: 28px; font-weight: bold; margin: 0;">EquipQR™</h1>
          <p style="color: #666; font-size: 16px; margin: 8px 0 0 0;">Fleet Equipment Management</p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          ${
            organizationLogo
              ? `
          <!-- Organization Logo -->
          <div style="text-align: center; margin-bottom: 16px;">
            <img src="${organizationLogo}" alt="${organizationName} Logo" style="height: 56px; width: auto; display: block; margin: 0 auto;" />
          </div>
          `
              : ""
          }
          <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">You're invited to join ${safeOrganizationName}</h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 16px 0;">
            ${safeInviterName} has invited you to join their organization as a <strong>${safeRole}</strong> on EquipQR™.
          </p>
          ${
            safeMessage
              ? `
            <div style="background: white; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; border-radius: 4px;">
              <p style="color: #374151; font-style: italic; margin: 0;">"${safeMessage}"</p>
            </div>
          `
              : ""
          }
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${invitationUrl}" 
             style="background: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Accept Invitation
          </a>
        </div>

        <div style="background: #f1f5f9; border-radius: 6px; padding: 16px; margin: 24px 0;">
          <h3 style="color: #374151; font-size: 16px; margin: 0 0 8px 0;">What you'll get access to:</h3>
          <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
            <li>Equipment tracking and management</li>
            <li>Work order creation and tracking</li>
            <li>Team collaboration tools</li>
            <li>QR code scanning for equipment</li>
          </ul>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
        
        <div style="text-align: center;">
          <p style="color: #9ca3af; font-size: 14px; margin: 0 0 8px 0;">
            If you can't click the button above, copy and paste this link into your browser:
          </p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all; margin: 0;">
            ${invitationUrl}
          </p>
        </div>

        <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;

    // Send the email
    logStep("Sending email", { to: email, from: "invite@equipqr.app" });

    const emailResponse = await resend.emails.send({
      from: "EquipQR™ <invite@equipqr.app>",
      to: [email],
      subject: `You're invited to join ${safeOrganizationName} on EquipQR™`,
      html: emailHtml,
    });

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    return createJsonResponse({
      success: true,
      emailId: emailResponse.data?.id,
    });
  } catch (error: unknown) {
    // Log the full error server-side for debugging
    logStep("ERROR", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return generic message to client - never expose error.message directly
    return createErrorResponse("Failed to send invitation email", 500);
  }
});

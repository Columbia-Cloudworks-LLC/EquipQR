import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
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

serve(async (req) => {
  try {
    logStep("Function started");

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { 
      invitationId, 
      email, 
      role, 
      organizationName, 
      inviterName,
      message 
    }: InvitationEmailRequest = await req.json();

    logStep("Request received", { invitationId, email, role, organizationName });

    // Sanitize user inputs to prevent XSS
    const safeOrganizationName = escapeHtml(organizationName);
    const safeInviterName = escapeHtml(inviterName);
    const safeRole = escapeHtml(role);
    const safeMessage = message ? escapeHtml(message) : undefined;

    // Get the invitation token and organization logo from the database
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('organization_invitations')
      .select(`
        invitation_token,
        organizations!inner(name, logo)
      `)
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      throw new Error('Invitation not found');
    }

    logStep("Invitation token retrieved", { token: invitation.invitation_token });

    // Get organization logo from the invitation data
    const organizationLogo = invitation.organizations?.logo;

    // Construct the invitation URL using production URL if available
    const baseUrl = Deno.env.get("PRODUCTION_URL") || `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}.lovableproject.com`;
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
          ${organizationLogo ? `
          <!-- Organization Logo -->
          <div style="text-align: center; margin-bottom: 16px;">
            <img src="${organizationLogo}" alt="${organizationName} Logo" style="height: 56px; width: auto; display: block; margin: 0 auto;" />
          </div>
          ` : ''}
          <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">You're invited to join ${safeOrganizationName}</h2>
          <p style="color: #666; font-size: 16px; margin: 0 0 16px 0;">
            ${safeInviterName} has invited you to join their organization as a <strong>${safeRole}</strong> on EquipQR™.
          </p>
          ${safeMessage ? `
            <div style="background: white; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; border-radius: 4px;">
              <p style="color: #374151; font-style: italic; margin: 0;">"${safeMessage}"</p>
            </div>
          ` : ''}
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

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: unknown) {
    logStep("ERROR", { 
      message: error instanceof Error ? error.message : 'Unknown error', 
      stack: error instanceof Error ? error.stack : undefined 
    });
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to send invitation email" 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
});
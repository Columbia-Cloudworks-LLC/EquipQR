/**
 * Send Push & Email Notification Edge Function
 *
 * Delivers queued notification jobs from the `notifications` pgmq queue:
 *   1. `channel = 'web_push'` (or omitted for legacy/global notifications):
 *      Sends Web Push notifications to a user's registered devices.
 *   2. `channel = 'email'` (#1438):
 *      Sends a pre-redacted safe-view work order status email via Resend.
 *   3. `channel = 'digest'` (#1438):
 *      Sends a consolidated daily digest email (+ optional Web Push summary)
 *      for queued `notification_digest_pending` safe views.
 *
 * Authentication:
 * - Requires SUPABASE_SERVICE_ROLE_KEY Bearer token (verify_jwt = false).
 *
 * Optional Supabase Secrets:
 * - VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (Web Push)
 * - RESEND_API_KEY (Email notifications via Resend)
 */

import {
  createAdminSupabaseClient,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { optionalSecret } from "../_shared/require-secret.ts";
import { sendResendEmail } from "../_shared/resend-send-email.ts";
import {
  buildWorkOrderDigestEmail,
  buildWorkOrderNotificationEmail,
  isValidWorkOrderSafeView,
  type WorkOrderNotificationSafeView,
} from "../_shared/work-order-notification-email.ts";

// Web Push library for Deno
import webpush from "npm:web-push@3.6.7";

const FUNCTION_NAME = "send-push-notification";
const NOTIFICATION_FROM_ADDRESS = "EquipQR™ <notifications@equipqr.app>";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  // eslint-disable-next-line no-console -- Edge Function operational logs.
  console.log(`[SEND-PUSH] ${step}${detailsStr}`);
};

interface PushNotificationRequest {
  channel?: "web_push" | "email" | "digest";
  user_id: string;
  organization_id?: string;
  organization_name?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  safe_view?: unknown;
  safe_views?: unknown[];
  send_email?: boolean;
  send_web_push?: boolean;
  url?: string;
}

interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function initializeVapid(): boolean {
  const publicKey = optionalSecret("VAPID_PUBLIC_KEY");
  const privateKey = optionalSecret("VAPID_PRIVATE_KEY");
  const subject = optionalSecret("VAPID_SUBJECT") ?? "mailto:support@equipqr.app";

  if (!publicKey || !privateKey) {
    // eslint-disable-next-line no-console -- Structured warning consumed by operations.
    console.log(
      JSON.stringify({
        level: "warn",
        code: "VAPID_DISABLED",
        function: FUNCTION_NAME,
        message: "VAPID keys not configured - push notifications disabled",
      }),
    );
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  } catch (error) {
    logStep("Failed to set VAPID details", { error: String(error) });
    return false;
  }
}

async function sendToSubscription(
  subscription: PushSubscription,
  payload: string,
): Promise<{ success: boolean; subscriptionId: string; error?: string }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      payload,
    );
    return { success: true, subscriptionId: subscription.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? error.statusCode
        : undefined;
    if (statusCode === 410 || statusCode === 404) {
      return {
        success: false,
        subscriptionId: subscription.id,
        error: "subscription_expired",
      };
    }

    return {
      success: false,
      subscriptionId: subscription.id,
      error: errorMessage,
    };
  }
}

function validateServiceRoleAuth(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return false;
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") {
    return false;
  }

  const token = parts[1];
  const expectedServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  return expectedServiceRoleKey !== undefined && token === expectedServiceRoleKey;
}

async function resolveRecipientEmail(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
): Promise<{ email: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("email, deleted_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { email: null, error: error.message };
  }

  if (!data || data.deleted_at || !data.email) {
    return { email: null, error: null };
  }

  return { email: data.email, error: null };
}

async function deliverWebPushToUser(
  req: Request,
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  params: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    url?: string;
    checkLegacyPreferences: boolean;
    organizationId?: string;
  },
): Promise<Response> {
  if (!initializeVapid()) {
    logStep("VAPID not configured - push notifications disabled");
    return createJsonResponse(
      {
        success: true,
        message: "Push notifications not configured",
        sent: 0,
      },
      200,
      { req },
    );
  }

  if (params.checkLegacyPreferences) {
    const { data: preferences, error: preferencesError } = await supabase
      .from("notification_preferences")
      .select("push_notifications")
      .eq("user_id", params.userId)
      .maybeSingle();

    if (preferencesError) {
      return createErrorResponse("Failed to fetch notification preferences", 503, { req });
    }

    if (preferences && preferences.push_notifications === false) {
      logStep("Push notifications disabled by user preference", { user_id: params.userId });
      return createJsonResponse(
        {
          success: true,
          message: "Push notifications disabled by user",
          sent: 0,
        },
        200,
        { req },
      );
    }
  } else if (params.organizationId) {
    const { data: orgPrefs, error: orgPrefsError } = await supabase
      .from("user_org_notification_preferences")
      .select("preferences")
      .eq("user_id", params.userId)
      .eq("organization_id", params.organizationId)
      .maybeSingle();

    if (orgPrefsError) {
      return createErrorResponse("Failed to fetch org notification preferences", 503, { req });
    }

    const prefsObj =
      orgPrefs && typeof orgPrefs.preferences === "object" && orgPrefs.preferences !== null
        ? (orgPrefs.preferences as { channels?: { web_push?: boolean } })
        : null;

    if (prefsObj?.channels?.web_push === false) {
      logStep("Push notifications disabled by org preference", {
        user_id: params.userId,
        organization_id: params.organizationId,
      });
      return createJsonResponse(
        {
          success: true,
          message: "Push notifications disabled by user",
          sent: 0,
        },
        200,
        { req },
      );
    }
  }

  const { data: subscriptions, error: subError } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", params.userId);

  if (subError) {
    logStep("Error fetching subscriptions", { error: subError.message });
    return createErrorResponse("Failed to fetch push subscriptions", 500, { req });
  }

  if (!subscriptions || subscriptions.length === 0) {
    logStep("No push subscriptions found for user", { user_id: params.userId });
    return createJsonResponse(
      {
        success: true,
        message: "No push subscriptions registered",
        sent: 0,
      },
      200,
      { req },
    );
  }

  const pushPayload = JSON.stringify({
    title: params.title,
    body: params.body,
    data: {
      ...params.data,
      url: params.url ?? params.data?.url ?? "/dashboard/notifications",
    },
  });

  const results = await Promise.all(
    subscriptions.map((sub) => sendToSubscription(sub as PushSubscription, pushPayload)),
  );

  const expiredSubscriptions = results
    .filter((r) => !r.success && r.error === "subscription_expired")
    .map((r) => r.subscriptionId);

  if (expiredSubscriptions.length > 0) {
    logStep("Cleaning up expired subscriptions", { count: expiredSubscriptions.length });
    const { error: cleanupError } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", expiredSubscriptions);
    if (cleanupError) {
      return createErrorResponse("Failed to clean up expired push subscriptions", 503, { req });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  if (failedCount > expiredSubscriptions.length) {
    return createJsonResponse(
      {
        success: false,
        permanent: false,
        sent: successCount,
        failed: failedCount,
        cleaned: expiredSubscriptions.length,
      },
      503,
      { req },
    );
  }

  return createJsonResponse(
    {
      success: true,
      sent: successCount,
      failed: failedCount,
      cleaned: expiredSubscriptions.length,
    },
    200,
    { req },
  );
}

async function handleEmailChannel(
  req: Request,
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  body: PushNotificationRequest,
): Promise<Response> {
  const rawSafeView = body.safe_view ?? body.data?.safe_view;
  if (!body.user_id || !isValidWorkOrderSafeView(rawSafeView)) {
    return createErrorResponse("Missing required fields: user_id and valid safe_view", 400, { req });
  }

  const resendApiKey = optionalSecret("RESEND_API_KEY");
  if (!resendApiKey) {
    logStep("RESEND_API_KEY not configured - email notifications disabled");
    return createJsonResponse(
      {
        success: true,
        message: "Email notifications not configured",
        sent: 0,
      },
      200,
      { req },
    );
  }

  const { email, error: emailLookupError } = await resolveRecipientEmail(supabase, body.user_id);
  if (emailLookupError) {
    return createErrorResponse("Failed to fetch recipient email", 503, { req });
  }

  if (!email) {
    logStep("No active email found for user", { user_id: body.user_id });
    return createJsonResponse(
      {
        success: true,
        message: "No recipient email available",
        sent: 0,
      },
      200,
      { req },
    );
  }

  const { subject, html } = buildWorkOrderNotificationEmail(rawSafeView);
  const sendResult = await sendResendEmail({
    apiKey: resendApiKey,
    from: NOTIFICATION_FROM_ADDRESS,
    to: [email],
    subject,
    html,
  });

  if (sendResult.error) {
    logStep("Resend email delivery failed", {
      user_id: body.user_id,
      errorName: sendResult.error.name,
      errorMessage: sendResult.error.message,
    });
    return createErrorResponse("Failed to send notification email", 503, { req });
  }

  return createJsonResponse(
    {
      success: true,
      sent: 1,
      emailId: sendResult.data?.id,
    },
    200,
    { req },
  );
}

async function handleDigestChannel(
  req: Request,
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  body: PushNotificationRequest,
): Promise<Response> {
  const safeViews: WorkOrderNotificationSafeView[] = Array.isArray(body.safe_views)
    ? body.safe_views.filter(isValidWorkOrderSafeView)
    : [];

  if (!body.user_id || safeViews.length === 0) {
    return createErrorResponse("Missing required fields: user_id and non-empty safe_views", 400, { req });
  }

  const orgName = body.organization_name ?? safeViews[0]?.organization_name ?? "EquipQR";
  const shouldSendEmail = body.send_email !== false;
  const shouldSendPush = body.send_web_push === true;

  let emailSent = 0;
  if (shouldSendEmail) {
    const resendApiKey = optionalSecret("RESEND_API_KEY");
    if (resendApiKey) {
      const { email, error: emailLookupError } = await resolveRecipientEmail(supabase, body.user_id);
      if (emailLookupError) {
        return createErrorResponse("Failed to fetch recipient email for digest", 503, { req });
      }
      if (email) {
        const { subject, html } = buildWorkOrderDigestEmail(orgName, safeViews);
        const sendResult = await sendResendEmail({
          apiKey: resendApiKey,
          from: NOTIFICATION_FROM_ADDRESS,
          to: [email],
          subject,
          html,
        });
        if (sendResult.error) {
          return createErrorResponse("Failed to send digest email", 503, { req });
        }
        emailSent = 1;
      }
    }
  }

  if (shouldSendPush) {
    const count = safeViews.length;
    return await deliverWebPushToUser(req, supabase, {
      userId: body.user_id,
      title: `${orgName}: Daily Work Order Digest`,
      body: `You have ${count} work order update${count === 1 ? "" : "s"} in your daily digest.`,
      data: {
        type: "work_order_digest",
        organization_id: body.organization_id,
        count,
      },
      url: body.url ?? "/dashboard/notifications",
      checkLegacyPreferences: false,
      organizationId: body.organization_id,
    });
  }

  return createJsonResponse(
    {
      success: true,
      sent: emailSent,
    },
    200,
    { req },
  );
}

export async function handlePushNotification(req: Request): Promise<Response> {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function started");

    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405, { req });
    }

    if (!validateServiceRoleAuth(req)) {
      logStep("Authentication failed - invalid or missing service role key");
      return createErrorResponse("Unauthorized", 401, { req });
    }

    const body: PushNotificationRequest = await req.json();
    const supabase = createAdminSupabaseClient();

    if (body.channel === "email") {
      return await handleEmailChannel(req, supabase, body);
    }

    if (body.channel === "digest") {
      return await handleDigestChannel(req, supabase, body);
    }

    const { user_id, title, body: messageBody, data, url } = body;
    if (!user_id || !title || !messageBody) {
      return createErrorResponse("Missing required fields: user_id, title, body", 400, { req });
    }

    const orgIdFromData =
      typeof body.organization_id === "string"
        ? body.organization_id
        : typeof data?.organization_id === "string"
          ? data.organization_id
          : undefined;

    return await deliverWebPushToUser(req, supabase, {
      userId: user_id,
      title,
      body: messageBody,
      data,
      url,
      checkLegacyPreferences: body.channel !== "web_push",
      organizationId: orgIdFromData,
    });
  } catch (error: unknown) {
    logStep("ERROR", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createErrorResponse("Failed to send push notification", 500, { req });
  }
}

if (import.meta.main) {
  Deno.serve(withCorrelationId(async (req, _ctx) => {
    void _ctx;
    return handlePushNotification(req);
  }));
}

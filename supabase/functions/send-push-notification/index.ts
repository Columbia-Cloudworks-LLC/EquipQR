/**
 * Send Push Notification Edge Function
 * 
 * Sends Web Push notifications to a user's registered devices.
 * 
 * This function is called in two ways:
 * 1. From the database via pg_net when a notification is inserted
 * 2. Directly for testing or manual push notifications
 * 
 * Authentication:
 * - When called from pg_net: Uses service role key (verify_jwt = false)
 * - When called directly: Can verify caller has appropriate permissions
 * 
 * Required Supabase Secrets:
 * - VAPID_PUBLIC_KEY: VAPID public key for Web Push
 * - VAPID_PRIVATE_KEY: VAPID private key for Web Push  
 * - VAPID_SUBJECT: Contact email (e.g., mailto:support@equipqr.app)
 */

import {
  createAdminSupabaseClient,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

// Web Push library for Deno
// Note: Using npm specifier for web-push compatibility
import webpush from "npm:web-push@3.6.7";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-PUSH] ${step}${detailsStr}`);
};

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  // Optional: specify notification URL for click action
  url?: string;
}

interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Initialize VAPID keys for Web Push
 */
function initializeVapid(): boolean {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@equipqr.app";

  if (!publicKey || !privateKey) {
    logStep("VAPID keys not configured");
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

/**
 * Send push notification to a single subscription
 */
async function sendToSubscription(
  subscription: PushSubscription,
  payload: string
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
      payload
    );
    return { success: true, subscriptionId: subscription.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for common push errors
    if (errorMessage.includes("410") || errorMessage.includes("404")) {
      // Subscription has expired or is invalid - should be cleaned up
      return { 
        success: false, 
        subscriptionId: subscription.id, 
        error: "subscription_expired" 
      };
    }
    
    return { 
      success: false, 
      subscriptionId: subscription.id, 
      error: errorMessage 
    };
  }
}

/**
 * Validate that the request is authenticated with service role key.
 * This function is called from the database via pg_net, which passes the service role key.
 * 
 * @param req - The incoming request
 * @returns true if authenticated with service role key, false otherwise
 */
function validateServiceRoleAuth(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return false;
  }

  // Extract Bearer token
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") {
    return false;
  }

  const token = parts[1];
  const expectedServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Validate that the token matches the service role key
  // This ensures only trusted database triggers can call this function
  return expectedServiceRoleKey !== undefined && token === expectedServiceRoleKey;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function started");

    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    // Security: Validate that request is authenticated with service role key
    // This function is called from database triggers via pg_net, which passes the service role key
    // This prevents unauthorized external callers from triggering push notifications
    if (!validateServiceRoleAuth(req)) {
      logStep("Authentication failed - invalid or missing service role key");
      return createErrorResponse("Unauthorized", 401);
    }

    // Initialize VAPID
    if (!initializeVapid()) {
      logStep("VAPID not configured - push notifications disabled");
      return createJsonResponse({ 
        success: true, 
        message: "Push notifications not configured",
        sent: 0 
      });
    }

    // Parse request body
    const body: PushNotificationRequest = await req.json();
    const { user_id, title, body: messageBody, data, url } = body;

    if (!user_id || !title || !messageBody) {
      return createErrorResponse("Missing required fields: user_id, title, body", 400);
    }

    logStep("Processing push notification", { user_id, title });

    // Use admin client to look up subscriptions (bypasses RLS)
    const supabase = createAdminSupabaseClient();

    // Check user's notification preferences
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("push_notifications")
      .eq("user_id", user_id)
      .maybeSingle();

    // If user has explicitly disabled push notifications, skip
    if (preferences && preferences.push_notifications === false) {
      logStep("Push notifications disabled by user preference", { user_id });
      return createJsonResponse({ 
        success: true, 
        message: "Push notifications disabled by user",
        sent: 0 
      });
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (subError) {
      logStep("Error fetching subscriptions", { error: subError.message });
      return createErrorResponse("Failed to fetch push subscriptions", 500);
    }

    if (!subscriptions || subscriptions.length === 0) {
      logStep("No push subscriptions found for user", { user_id });
      return createJsonResponse({ 
        success: true, 
        message: "No push subscriptions registered",
        sent: 0 
      });
    }

    logStep("Found subscriptions", { count: subscriptions.length });

    // Prepare push payload
    const pushPayload = JSON.stringify({
      title,
      body: messageBody,
      data: {
        ...data,
        url: url ?? data?.url ?? "/dashboard/notifications",
      },
    });

    // Send to all subscriptions
    const results = await Promise.all(
      subscriptions.map((sub) => sendToSubscription(sub as PushSubscription, pushPayload))
    );

    // Clean up expired subscriptions
    const expiredSubscriptions = results
      .filter((r) => !r.success && r.error === "subscription_expired")
      .map((r) => r.subscriptionId);

    if (expiredSubscriptions.length > 0) {
      logStep("Cleaning up expired subscriptions", { count: expiredSubscriptions.length });
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredSubscriptions);
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    logStep("Push notifications sent", { 
      success: successCount, 
      failed: failedCount,
      cleaned: expiredSubscriptions.length 
    });

    return createJsonResponse({
      success: true,
      sent: successCount,
      failed: failedCount,
      cleaned: expiredSubscriptions.length,
    });
  } catch (error: unknown) {
    logStep("ERROR", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createErrorResponse("Failed to send push notification", 500);
  }
});

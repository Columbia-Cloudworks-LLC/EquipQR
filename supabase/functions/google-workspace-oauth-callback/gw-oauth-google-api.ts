import { isValidEmail, logStep } from "./gw-oauth-validation.ts";

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

export interface GoogleUserInfo {
  email: string;
  email_verified?: boolean;
  hd?: string; // hosted domain
}

export interface GoogleAdminUserInfo {
  primaryEmail: string;
  isAdmin?: boolean;
  isDelegatedAdmin?: boolean;
}

export interface GoogleUserDomainResult {
  userEmail: string;
  userDomain: string;
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<GoogleTokenResponse> {
  const tokenRequestBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenRequestBody.toString(),
  });

  if (!tokenResponse.ok) {
    // Log the actual error from Google to diagnose the issue
    let googleError: { error?: string; error_description?: string } = {};
    try {
      googleError = await tokenResponse.json();
    } catch {
      // Response wasn't JSON
    }
    logStep("Token exchange failed", {
      status: tokenResponse.status,
      error: googleError.error || "unknown",
      error_description: googleError.error_description || "no description",
      redirect_uri_used: redirectUri,
      client_id_prefix: clientId?.substring(0, 20) + "...",
    });
    
    // Provide more specific error message based on Google's response
    let userMessage = "Failed to exchange authorization code. Please try again.";
    if (googleError.error === "redirect_uri_mismatch") {
      userMessage = "OAuth configuration error: redirect URI mismatch. Please contact support.";
    } else if (googleError.error === "invalid_client") {
      userMessage = "OAuth configuration error: invalid client credentials. Please contact support.";
    } else if (googleError.error === "invalid_grant") {
      userMessage = "Authorization code expired or already used. Please try again.";
    }
    
    throw new Error(userMessage);
  }

  const tokenData: GoogleTokenResponse = await tokenResponse.json();
  logStep("Token exchange successful", {
    token_type: tokenData.token_type,
    expires_in: tokenData.expires_in,
    scope: tokenData.scope,
  });

  return tokenData;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const userinfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!userinfoResponse.ok) {
    logStep("Failed to fetch user info", { status: userinfoResponse.status });
    throw new Error("Failed to verify your Google account. Please try again.");
  }

  return await userinfoResponse.json();
}

export function extractUserDomain(userinfo: GoogleUserInfo): GoogleUserDomainResult {
  const userEmail = userinfo.email;
  
  // Validate email format before extracting domain. This validates that the email
  // is well-formed to prevent undefined domain extraction from malformed emails.
  if (!isValidEmail(userEmail)) {
    throw new Error("Invalid email format received from Google. Please try again.");
  }
  
  // Safely extract domain from email with explicit check for split result
  // Note: emailParts is guaranteed to have at least one element after split("@")
  // but we validate length === 2 to ensure proper email format (local@domain)
  const emailParts = userEmail.split("@");
  let emailDomain: string;
  if (emailParts.length === 2) {
    emailDomain = emailParts[1];
  } else {
    emailDomain = "";
  }
  
  // Use hosted domain from Google if available, otherwise fall back to email domain
  let userDomain: string;
  if (userinfo.hd) {
    userDomain = userinfo.hd;
  } else {
    userDomain = emailDomain;
  }
  
  // Defensive check: ensure we have a valid domain after extraction
  if (!userDomain) {
    throw new Error("Could not determine your organization domain. Please try again.");
  }

  logStep("User info retrieved", { domain: userDomain });

  // Block consumer domains
  if (["gmail.com", "googlemail.com"].includes(userDomain.toLowerCase())) {
    throw new Error("Consumer Google accounts (gmail.com) cannot use Google Workspace integration.");
  }

  return { userEmail, userDomain };
}

export async function verifyGoogleWorkspaceAdmin(
  accessToken: string,
  userEmail: string,
): Promise<void> {
  const adminCheckResponse = await fetch(
    `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(userEmail)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!adminCheckResponse.ok) {
    const errorStatus = adminCheckResponse.status;
    logStep("Admin API check failed", { status: errorStatus });
    
    if (errorStatus === 403) {
      throw new Error(
        "Unable to verify admin status. Please ensure you granted the required permissions " +
        "and that you are a Google Workspace administrator."
      );
    }
    throw new Error("Failed to verify Google Workspace admin status. Please try again.");
  }

  const adminUserInfo: GoogleAdminUserInfo = await adminCheckResponse.json();
  const isWorkspaceAdmin = adminUserInfo.isAdmin === true || adminUserInfo.isDelegatedAdmin === true;

  logStep("Admin status checked", { 
    isAdmin: adminUserInfo.isAdmin, 
    isDelegatedAdmin: adminUserInfo.isDelegatedAdmin,
    isWorkspaceAdmin,
  });

  if (!isWorkspaceAdmin) {
    throw new Error(
      "Only Google Workspace administrators can connect their organization to EquipQR. " +
      "Please contact your Workspace admin to set up EquipQR for your organization."
    );
  }
}

export const __gwOauthGoogleApiTestables = {
  extractUserDomain,
  TOKEN_URL,
};

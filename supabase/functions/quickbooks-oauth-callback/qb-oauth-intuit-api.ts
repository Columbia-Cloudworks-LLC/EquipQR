import { QBO_TOKEN_URL, getIntuitTid } from "../_shared/quickbooks-config.ts";
import { logStep } from "./qb-oauth-validation.ts";

export interface IntuitTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  scope?: string;
}

export interface TokenExchangeResult {
  tokenData: IntuitTokenResponse;
  intuitTid: string | null;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenExchangeResult> {
  logStep("Exchanging code for tokens", {
    redirect_uri: redirectUri,
    token_url: QBO_TOKEN_URL,
  });

  const tokenRequestBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  const tokenResponse = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicAuth}`,
      "Accept": "application/json",
    },
    body: tokenRequestBody.toString(),
  });

  const intuitTid = getIntuitTid(tokenResponse);

  if (!tokenResponse.ok) {
    logStep("Token exchange failed", { status: tokenResponse.status, intuit_tid: intuitTid });
    throw new Error("Failed to exchange authorization code. Please try again.");
  }

  const tokenData: IntuitTokenResponse = await tokenResponse.json();
  logStep("Token exchange successful", {
    token_type: tokenData.token_type,
    expires_in: tokenData.expires_in,
    x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in,
    scope: tokenData.scope,
    intuit_tid: intuitTid,
  });

  const now = new Date();
  return {
    tokenData,
    intuitTid,
    accessTokenExpiresAt: new Date(now.getTime() + tokenData.expires_in * 1000),
    refreshTokenExpiresAt: new Date(now.getTime() + tokenData.x_refresh_token_expires_in * 1000),
  };
}

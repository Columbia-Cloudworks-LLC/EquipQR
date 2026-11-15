import { QBO_TOKEN_URL, getIntuitTid } from "./quickbooks-config.ts";

/**
 * POSTs a form-encoded grant to the Intuit OAuth token endpoint using HTTP
 * Basic client authentication. Shared by the authorization_code exchange
 * (oauth callback) and the refresh_token grant (token refresh job).
 */
export async function postIntuitTokenRequest(
  grantParams: Record<string, string>,
  clientId: string,
  clientSecret: string,
): Promise<{ response: Response; intuitTid: ReturnType<typeof getIntuitTid> }> {
  const tokenRequestBody = new URLSearchParams(grantParams);
  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicAuth}`,
      "Accept": "application/json",
    },
    body: tokenRequestBody.toString(),
  });

  return { response, intuitTid: getIntuitTid(response) };
}

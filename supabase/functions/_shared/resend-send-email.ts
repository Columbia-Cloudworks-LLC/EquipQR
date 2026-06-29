/**
 * Native fetch helper for Resend transactional email sends.
 *
 * Avoids npm:resend (and its @react-email/render / react-dom dependency chain)
 * which is fragile in Supabase Deno edge runtime for HTML-only sends.
 */

export type ResendSendEmailInput = {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
};

export type ResendSendEmailResult = {
  data: { id: string } | null;
  error: { name: string; message: string } | null;
};

export const RESEND_EMAILS_API_URL = "https://api.resend.com/emails";

function parseResendError(body: unknown): { name: string; message: string } {
  if (body && typeof body === "object") {
    const record = body as { name?: unknown; message?: unknown };
    const message = typeof record.message === "string"
      ? record.message
      : "Resend API error";
    const name = typeof record.name === "string" ? record.name : "validation_error";
    return { name, message };
  }
  return { name: "unknown_error", message: "Resend API error" };
}

export async function sendResendEmail(
  input: ResendSendEmailInput,
): Promise<ResendSendEmailResult> {
  try {
    const response = await fetch(RESEND_EMAILS_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      return { data: null, error: parseResendError(body) };
    }

    const id = body && typeof body === "object" && "id" in body &&
        typeof (body as { id: unknown }).id === "string"
      ? (body as { id: string }).id
      : null;

    if (!id) {
      return {
        data: null,
        error: {
          name: "invalid_response",
          message: "Resend API returned success without id",
        },
      };
    }

    return { data: { id }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return {
      data: null,
      error: { name: "network_error", message },
    };
  }
}

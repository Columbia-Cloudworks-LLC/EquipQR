function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function computeIntuitSignature(
  payload: string,
  verifierToken: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(verifierToken),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signed)));
}

export async function verifyIntuitSignature(
  payload: string,
  signatureHeader: string | null,
  verifierToken: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const expected = await computeIntuitSignature(payload, verifierToken);
  return constantTimeEqual(signatureHeader, expected);
}

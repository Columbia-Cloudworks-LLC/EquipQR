/**
 * Cryptographic utilities for encrypting sensitive data like OAuth refresh tokens.
 * Uses AES-256-GCM for authenticated encryption.
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Derives a CryptoKey from the secret key string.
 * Uses SHA-256 to hash the secret to ensure consistent key length.
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(secret);
  
  // Hash the secret to get a consistent 256-bit key
  const hash = await crypto.subtle.digest('SHA-256', keyMaterial);
  
  return await crypto.subtle.importKey(
    'raw',
    hash,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing the IV + ciphertext.
 */
export async function encryptToken(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );
  
  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64-encoded ciphertext string that was encrypted with encryptToken.
 * Returns the original plaintext string.
 */
export async function decryptToken(encrypted: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  
  // Decode from base64
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  
  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}

/**
 * Minimum required length for the encryption key.
 * A 32-character key provides sufficient entropy when hashed with SHA-256.
 * For production, use a cryptographically random 32+ character string.
 */
const MIN_KEY_LENGTH = 32;

/**
 * Gets the encryption key from environment, throwing if not set or too weak.
 * 
 * IMPORTANT: In production, TOKEN_ENCRYPTION_KEY must be a cryptographically
 * random string of at least 32 characters. Generate one with:
 *   openssl rand -base64 32
 * 
 * Never use weak keys like "password123" - even though SHA-256 hashing is
 * applied, weak input leads to predictable output.
 */
export function getTokenEncryptionKey(): string {
  const key = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  
  // Validate minimum key length to ensure sufficient entropy
  if (key.length < MIN_KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must be at least ${MIN_KEY_LENGTH} characters. ` +
      'Generate a secure key with: openssl rand -base64 32'
    );
  }
  
  return key;
}

/**
 * Cryptographic utilities for encrypting sensitive data like OAuth refresh tokens.
 * Uses AES-256-GCM for authenticated encryption.
 */

// AES-GCM chosen for AEAD (authenticated encryption with associated data):
// - Provides both confidentiality and integrity in a single operation
// - Widely supported in Web Crypto API across Deno, browsers, and Node.js
// - Good performance characteristics compared to other authenticated modes
// - 96-bit (12-byte) IV is the recommended size for GCM mode
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM

// PBKDF2 configuration for key derivation.
// 100,000 iterations is a conservative baseline; review against current OWASP
// guidance (Password Storage / PBKDF2 recommendations) before changing.
const PBKDF2_ITERATIONS = 100_000;

// Default salt value - used if KDF_SALT environment variable is not set.
// This maintains backwards compatibility with existing encrypted data.
const DEFAULT_KDF_SALT = 'equipqr_aes_gcm_kdf_salt_v1';

/**
 * Gets the KDF salt from environment variable or falls back to default.
 * 
 * For defense-in-depth, each deployment should set a unique KDF_SALT value.
 * This ensures that even if TOKEN_ENCRYPTION_KEY is compromised, an attacker
 * would also need the deployment-specific salt to derive the same key material.
 * 
 * IMPORTANT: Once set for a deployment, KDF_SALT must remain constant.
 * Changing it will make previously encrypted data unreadable.
 * 
 * Generate a unique salt with: openssl rand -base64 32
 */
function getKdfSalt(): Uint8Array {
  const salt = Deno.env.get('KDF_SALT') ?? DEFAULT_KDF_SALT;
  return new TextEncoder().encode(salt);
}

/**
 * Derives a CryptoKey from the secret key string using PBKDF2.
 * 
 * PBKDF2 is a proper key derivation function (KDF) designed to:
 * - Be intentionally slow to resist brute-force attacks
 * - Use a salt to prevent rainbow table attacks
 * - Apply many iterations to increase computational cost
 * 
 * This is superior to using SHA-256 directly, which is a fast hash function
 * designed for integrity checking, not key derivation.
 * 
 * Note: HKDF (HMAC-based KDF) would be more efficient for high-entropy inputs,
 * but PBKDF2 provides defense-in-depth in case some deployments use weak keys
 * despite validation. The 100K iterations provide protection even if the input
 * entropy is lower than expected.
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: getKdfSalt(),
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
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
 * 
 * A 32-character key provides sufficient entropy when processed with PBKDF2.
 * Since PBKDF2 derives a 256-bit (32-byte) key, a 32-character input ensures
 * adequate source entropy before derivation. Using a shorter key would reduce the
 * effective entropy of the derived key material.
 * 
 * For production, use a cryptographically random 32+ character string.
 */
const MIN_KEY_LENGTH = 32;

/**
 * Checks if a string has low entropy (repeated or sequential characters).
 * This is a heuristic check, not a cryptographic entropy measurement.
 */
function hasLowEntropy(key: string): boolean {
  // Check for repeated character patterns (e.g., "aaaaaaa...")
  const uniqueChars = new Set(key).size;
  const uniqueRatio = uniqueChars / key.length;
  
  // If less than 30% of characters are unique, likely a weak key
  if (uniqueRatio < 0.3) {
    return true;
  }
  
  // Check for simple sequential patterns
  const lowerKey = key.toLowerCase();
  const weakPatterns = [
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
    'qwertyuiop',
    'password',
    'secret',
  ];
  
  for (const pattern of weakPatterns) {
    if (lowerKey.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validates that the encryption key is properly configured.
 * Call this at module load time or during health checks to catch
 * configuration issues early rather than at first encryption attempt.
 * 
 * @returns true if the key is valid, throws otherwise
 */
export function validateEncryptionKeyConfiguration(): boolean {
  // This will throw if key is missing or invalid
  getTokenEncryptionKey();
  return true;
}

/**
 * Gets and validates the encryption key from environment.
 * 
 * This function performs configuration validation and will throw an Error if:
 * - TOKEN_ENCRYPTION_KEY is not set
 * - The key is shorter than the minimum required length (32 characters)
 * - The key appears to have low entropy and ENFORCE_STRONG_KEYS is not explicitly disabled
 * 
 * IMPORTANT: In production, TOKEN_ENCRYPTION_KEY must be a cryptographically
 * random string of at least 32 characters. Generate one with:
 *   openssl rand -base64 32
 * 
 * Never use weak keys like "password123" - even though PBKDF2 is applied,
 * weak input leads to predictable output after derivation.
 * 
 * @throws {Error} If TOKEN_ENCRYPTION_KEY is missing, too short, or considered too weak
 * @returns The validated encryption key string
 */
export function getTokenEncryptionKey(): string {
  const key = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!key) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY environment variable is not set. ' +
      'This is a critical security configuration. Generate a key with: openssl rand -base64 32'
    );
  }
  
  // Validate minimum key length to ensure sufficient entropy
  if (key.length < MIN_KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must be at least ${MIN_KEY_LENGTH} characters. ` +
      'Generate a secure key with: openssl rand -base64 32'
    );
  }
  
  // Enforce strong keys by default; allow explicit opt-out via ENFORCE_STRONG_KEYS=false.
  // This is safer than relying on DENO_ENV/NODE_ENV which may not be set in all deployments.
  if (hasLowEntropy(key)) {
    const enforceStrongKeys = Deno.env.get('ENFORCE_STRONG_KEYS');
    // Default to enforcing strong keys unless explicitly disabled
    const shouldEnforceStrongKeys =
      enforceStrongKeys === undefined
        ? true
        : !['false', '0', 'off'].includes(enforceStrongKeys.toLowerCase());

    const warningMessage = 
      '[SECURITY WARNING] TOKEN_ENCRYPTION_KEY appears to have low entropy. ' +
      'Weak keys like repeated characters or common patterns are insecure. ' +
      'Generate a cryptographically random key with: openssl rand -base64 32';

    if (shouldEnforceStrongKeys) {
      throw new Error(
        '[SECURITY ERROR] TOKEN_ENCRYPTION_KEY appears to have low entropy. ' +
        'Weak keys like repeated characters or common patterns are insecure. ' +
        'Generate a cryptographically random key with: openssl rand -base64 32. ' +
        'Set ENFORCE_STRONG_KEYS=false to disable this check in development.'
      );
    } else {
      console.warn(warningMessage);
    }
  }
  
  return key;
}

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
// 100,000 iterations is a conservative baseline and, as of 2023, matches the
// minimum recommended value for PBKDF2-SHA256 in the OWASP Password Storage
// Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
// IMPORTANT: OWASP recommendations may change over time. Review this setting
// periodically against the current PBKDF2 guidance, and for production
// deployments consider using a higher iteration count if performance permits.
const PBKDF2_ITERATIONS = 100_000;

// Default salt value - used if KDF_SALT environment variable is not set.
// This maintains backwards compatibility with existing encrypted data.
const DEFAULT_KDF_SALT = 'equipqr_aes_gcm_kdf_salt_v1';

/**
 * Minimum required byte length for the KDF salt.
 * 
 * A minimum of 32 bytes (256 bits) provides sufficient entropy for the salt.
 * This matches the key length requirement and ensures the salt contributes
 * meaningful entropy to the key derivation process.
 */
const MIN_SALT_LENGTH = 32;

// =============================================================================
// Environment Detection
// =============================================================================

/**
 * Environment variable names checked for production detection, in priority order.
 * DEPLOYMENT_ENV is checked first, then DENO_ENV as a fallback for backwards compatibility.
 */
const DEPLOYMENT_ENV_VARS = ['DEPLOYMENT_ENV', 'DENO_ENV'] as const;

/**
 * Accepted values that indicate a production environment (case-insensitive).
 */
const PRODUCTION_ENV_VALUES = ['production', 'prod'] as const;

/**
 * Checks if the current deployment is running in a production environment.
 * 
 * Priority order for environment variable detection:
 * 1. DEPLOYMENT_ENV (checked first)
 * 2. DENO_ENV (fallback for backwards compatibility)
 * 
 * Accepted production values (case-insensitive):
 * - 'production'
 * - 'prod'
 * 
 * If neither environment variable is set, or the value doesn't match a production
 * indicator, this function returns false (non-production).
 * 
 * @returns true if running in production, false otherwise
 */
function isProductionEnvironment(): boolean {
  // Check environment variables in priority order
  for (const envVar of DEPLOYMENT_ENV_VARS) {
    const value = Deno.env.get(envVar);
    if (value) {
      const normalizedValue = value.toLowerCase();
      if (PRODUCTION_ENV_VALUES.includes(normalizedValue as typeof PRODUCTION_ENV_VALUES[number])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Gets and validates the KDF salt from environment variable.
 * 
 * For defense-in-depth, each deployment should set a unique KDF_SALT value.
 * This ensures that even if TOKEN_ENCRYPTION_KEY is compromised, an attacker
 * would also need the deployment-specific salt to derive the same key material.
 * 
 * IMPORTANT: Once set for a deployment, KDF_SALT must remain constant.
 * Changing it will make previously encrypted data unreadable.
 * 
 * This function performs configuration validation and will throw an Error if:
 * - KDF_SALT is not set in production environments (no default fallback)
 * - The salt is shorter than the minimum required length (32 bytes when encoded)
 * 
 * In non-production environments, if KDF_SALT is not set, a warning is logged
 * and the default salt is used for backwards compatibility.
 * 
 * Generate a unique salt with: openssl rand -base64 32
 * 
 * @throws {Error} If KDF_SALT is missing in production or too short
 * @returns The validated salt as a Uint8Array
 */
function getKdfSalt(): Uint8Array {
  const salt = Deno.env.get('KDF_SALT');
  const isProductionEnv = isProductionEnvironment();
  
  // In production, KDF_SALT must be explicitly set - no default fallback
  if (!salt) {
    if (isProductionEnv) {
      throw new Error(
        'KDF_SALT environment variable is not set in production. ' +
        'This is a critical security configuration. Generate a salt with: openssl rand -base64 32'
      );
    } else {
      // Non-production: warn but allow default for backwards compatibility
      console.warn(
        '[SECURITY WARNING] KDF_SALT environment variable is not set. ' +
        'Using default salt which provides no additional security beyond the encryption key. ' +
        'Generate a unique salt with: openssl rand -base64 32'
      );
      return new TextEncoder().encode(DEFAULT_KDF_SALT);
    }
  }
  
  // Validate salt length (check encoded byte length, not string length)
  const encodedSalt = new TextEncoder().encode(salt);
  if (encodedSalt.length < MIN_SALT_LENGTH) {
    throw new Error(
      `KDF_SALT must be at least ${MIN_SALT_LENGTH} bytes when encoded. ` +
      'Generate a secure salt with: openssl rand -base64 32'
    );
  }
  
  // Validate salt entropy to ensure it's not a weak pattern
  // Using the default salt (which is hardcoded and public) provides no additional
  // security beyond the encryption key itself. This check ensures deployments
  // use cryptographically random salts.
  if (hasLowEntropy(salt)) {
    const warningMessage = 
      '[SECURITY WARNING] KDF_SALT appears to have low entropy. ' +
      'Weak salts like repeated characters or common patterns reduce security. ' +
      'Generate a cryptographically random salt with: openssl rand -base64 32';
    
    if (isProductionEnv) {
      throw new Error(
        '[SECURITY ERROR] KDF_SALT appears to have low entropy. ' +
        'Weak salts like repeated characters or common patterns reduce security. ' +
        'Generate a cryptographically random salt with: openssl rand -base64 32. ' +
        'This check cannot be bypassed in production environments.'
      );
    } else {
      console.warn(warningMessage);
    }
  }
  
  return encodedSalt;
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
 * 
 * This function is async because it relies on the Web Crypto API:
 * - {@link crypto.subtle.importKey} to create key material from the secret
 * - {@link crypto.subtle.deriveKey} to derive the AES-GCM key
 * Both of these operations return Promises and must be awaited.
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
 * This value is measured using JavaScript's `string.length`, which counts
 * UTF-16 code units (not bytes and not Unicode code points). A minimum of
 * 32 UTF-16 code units provides sufficient entropy when processed with PBKDF2.
 * Since PBKDF2 derives a 256-bit (32-byte) key, a 32-code-unit input ensures
 * adequate source entropy before derivation. Using a shorter key would reduce
 * the effective entropy of the derived key material.
 *
 * Note: For non-ASCII input, some visible characters (e.g., emoji or certain
 * symbols) may consume two UTF-16 code units each. This means a visually
 * shorter string can still meet the `MIN_KEY_LENGTH` check. For predictable
 * behavior and maximum entropy, prefer cryptographically random ASCII (or
 * otherwise single-code-unit) secrets of length 32 or greater.
 */
const MIN_KEY_LENGTH = 32;

/**
 * Minimum ratio of unique characters required to consider a key/salt as having
 * sufficient entropy. Keys with less than 30% unique characters are likely weak
 * (e.g., "aaaaaaa..." or repeated patterns).
 */
const MIN_UNIQUE_CHAR_RATIO = 0.3;

/**
 * Checks if a string has low entropy (repeated or sequential characters).
 * This is a heuristic check, not a cryptographic entropy measurement.
 */
function hasLowEntropy(key: string): boolean {
  // Check for repeated character patterns (e.g., "aaaaaaa...")
  const uniqueChars = new Set(key).size;
  const uniqueRatio = uniqueChars / key.length;
  
  // If less than MIN_UNIQUE_CHAR_RATIO of characters are unique, likely a weak key
  if (uniqueRatio < MIN_UNIQUE_CHAR_RATIO) {
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
 * Validates that the KDF salt is properly configured.
 * Call this at module load time or during health checks to catch
 * configuration issues early rather than at first encryption attempt.
 * 
 * @returns true if the salt is valid, throws otherwise
 */
export function validateKdfSaltConfiguration(): boolean {
  // This will throw if salt is missing in production or invalid
  getKdfSalt();
  return true;
}

/**
 * Gets and validates the encryption key from environment.
 * 
 * This function performs configuration validation and will throw an Error if:
 * - TOKEN_ENCRYPTION_KEY is not set
 * - The key is shorter than the minimum required length (32 characters)
 * - The key appears to have low entropy (unless ALLOW_WEAK_KEYS_FOR_TESTING is explicitly enabled in non-production)
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
  
  // Enforce strong keys by default; allow an explicit, clearly test-only opt-out.
  if (hasLowEntropy(key)) {
    const isProductionEnv = isProductionEnvironment();
    // Weak keys are NEVER allowed in production, regardless of configuration.
    const allowWeakKeysEnv = Deno.env.get('ALLOW_WEAK_KEYS_FOR_TESTING') || '';
    const allowWeakKeysForTesting =
      !isProductionEnv &&
      ['true', '1', 'on'].includes(allowWeakKeysEnv.toLowerCase());

    const warningMessage = 
      '[SECURITY WARNING] TOKEN_ENCRYPTION_KEY appears to have low entropy. ' +
      'Weak keys like repeated characters or common patterns are insecure. ' +
      'Generate a cryptographically random key with: openssl rand -base64 32';

    if (!allowWeakKeysForTesting) {
      const bypassNote = isProductionEnv
        ? 'This check cannot be bypassed in production environments.'
        : 'If you absolutely must use a weak key in a non-production environment, ' +
          'set ALLOW_WEAK_KEYS_FOR_TESTING=true and ensure this is NEVER enabled in production.';
      throw new Error(
        '[SECURITY ERROR] TOKEN_ENCRYPTION_KEY appears to have low entropy. ' +
        'Weak keys like repeated characters or common patterns are insecure. ' +
        `Generate a cryptographically random key with: openssl rand -base64 32. ${bypassNote}`
      );
    } else {
      console.warn(warningMessage + ' ALLOW_WEAK_KEYS_FOR_TESTING is enabled; this should only be used in non-production environments.');
    }
  }
  
  return key;
}

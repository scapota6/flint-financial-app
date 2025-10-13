import argon2 from 'argon2';
import crypto from 'crypto';

/**
 * Hardened Argon2id configuration per OWASP recommendations:
 * - Type: Argon2id (hybrid - resistant to GPU & side-channel attacks)
 * - Time cost (iterations): 3
 * - Memory cost: 64 MB (65536 KB)
 * - Parallelism: 2 threads
 * - Salt: auto-generated (unique per password)
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  timeCost: 3,
  memoryCost: 65536, // 64 MB in KB
  parallelism: 2,
};

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password against an Argon2id hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    // Invalid hash format or verification error
    return false;
  }
}

/**
 * Check if a password has been used recently
 * @param password - Password to check
 * @param lastPasswordHashes - Array of recent password hashes (from DB)
 * @returns true if password was used recently
 */
export async function isPasswordReused(
  password: string,
  lastPasswordHashes: string[]
): Promise<boolean> {
  if (!lastPasswordHashes || lastPasswordHashes.length === 0) {
    return false;
  }

  for (const oldHash of lastPasswordHashes) {
    const matches = await verifyPassword(password, oldHash);
    if (matches) {
      return true;
    }
  }

  return false;
}

/**
 * Update the password history
 * Keeps the last N password hashes (default: 5)
 */
export function updatePasswordHistory(
  currentHash: string,
  existingHistory: string[],
  maxHistory: number = 5
): string[] {
  const history = [currentHash, ...(existingHistory || [])];
  return history.slice(0, maxHistory);
}

/**
 * Generate cryptographically secure recovery codes
 * @param count - Number of recovery codes to generate (default: 8)
 * @returns Array of recovery codes (format: XXXX-XXXX-XXXX)
 */
export function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 9 random bytes to ensure we get at least 12 alphanumeric characters
    const bytes = crypto.randomBytes(9);
    let code = bytes.toString('base64')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();
    
    // Ensure we have at least 12 characters, pad if needed
    while (code.length < 12) {
      const extraBytes = crypto.randomBytes(3);
      code += extraBytes.toString('base64').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    }
    
    // Take exactly 12 characters
    code = code.slice(0, 12);
    
    // Format: XXXX-XXXX-XXXX
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
    codes.push(formatted);
  }
  
  return codes;
}

/**
 * Hash recovery codes for secure storage
 * Recovery codes should be hashed before storing in the database
 */
export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  const hashedCodes = await Promise.all(
    codes.map(code => hashPassword(code))
  );
  return hashedCodes;
}

/**
 * Verify a recovery code against hashed codes
 * @param code - Recovery code to verify
 * @param hashedCodes - Array of hashed recovery codes
 * @returns Index of matched code (or -1 if no match)
 */
export async function verifyRecoveryCode(
  code: string,
  hashedCodes: string[]
): Promise<number> {
  if (!hashedCodes || hashedCodes.length === 0) {
    return -1;
  }

  for (let i = 0; i < hashedCodes.length; i++) {
    const matches = await verifyPassword(code, hashedCodes[i]);
    if (matches) {
      return i;
    }
  }

  return -1;
}

/**
 * Remove a used recovery code from the list
 */
export function removeRecoveryCode(hashedCodes: string[], index: number): string[] {
  return hashedCodes.filter((_, i) => i !== index);
}

/**
 * Generate a secure random token (for email verification, password reset, etc.)
 * @param bytes - Number of random bytes (default: 32)
 * @returns Hex-encoded token
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token for secure storage (e.g., password reset tokens)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

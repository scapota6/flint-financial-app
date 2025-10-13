import crypto from 'crypto';

/**
 * TOKEN STORAGE FORMAT DOCUMENTATION
 * ===================================
 * 
 * Password reset/setup tokens follow this security flow:
 * 
 * 1. GENERATION (admin-panel.ts):
 *    - Generate plaintext token: generateSecureToken(32) → "a1b2c3d4..." (64 hex chars)
 *    - Hash with SHA-256: hashToken(token) → "9f86d081..." (64 hex chars)
 *    - Store HASH in database (passwordResetTokens.token column)
 *    - Send plaintext token to user via email
 * 
 * 2. VERIFICATION (auth.ts setup-password endpoint):
 *    - Receive plaintext token from user
 *    - Hash submitted token: hashToken(submittedToken)
 *    - Compare hash with stored hash using timing-safe comparison
 * 
 * 3. TESTING:
 *    To test with token 'testtoken123':
 *    - DO NOT insert 'testtoken123' directly into DB
 *    - Instead, insert hashToken('testtoken123') into DB:
 *      const hash = crypto.createHash('sha256').update('testtoken123').digest('hex');
 *      // hash = "3fdb4f... " (64 hex chars)
 *      INSERT INTO password_reset_tokens (token, ...) VALUES (hash, ...)
 *    - Then submit 'testtoken123' (plaintext) to the endpoint
 */

/**
 * Hash a token using SHA-256 for secure storage
 * Tokens should be hashed before storing in the database to prevent theft if DB is compromised
 * 
 * @param token - The plaintext token to hash
 * @returns The hashed token as a hex string
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a plaintext token against a stored hash using timing-safe comparison
 * This prevents timing attacks that could reveal information about the hash
 * 
 * @param token - The plaintext token to verify
 * @param hash - The stored hash to compare against
 * @returns true if the token matches the hash, false otherwise
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  
  // Use timing-safe comparison to prevent timing attacks
  // Both strings must be the same length for timingSafeEqual
  if (tokenHash.length !== hash.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash, 'hex'),
    Buffer.from(hash, 'hex')
  );
}

/**
 * Generate a cryptographically secure random token
 * 
 * @param bytes - Number of random bytes to generate (default: 32)
 * @returns The token as a hex string
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

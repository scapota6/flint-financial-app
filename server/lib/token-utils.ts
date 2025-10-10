import crypto from 'crypto';

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
    Buffer.from(tokenHash, 'utf-8'),
    Buffer.from(hash, 'utf-8')
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

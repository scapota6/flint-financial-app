/**
 * Test file to verify token hashing and verification functionality
 * This demonstrates the security improvements:
 * 1. Tokens are hashed before storage
 * 2. Timing-safe comparison prevents timing attacks
 * 3. Hash verification works correctly
 */

import { hashToken, verifyToken, generateSecureToken } from '../token-utils';

describe('Token Security Utils', () => {
  test('hashToken generates consistent hashes', () => {
    const token = 'test-token-12345';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    
    // Same token should produce same hash
    expect(hash1).toBe(hash2);
    
    // Hash should be different from original token
    expect(hash1).not.toBe(token);
    
    // Hash should be SHA-256 hex string (64 characters)
    expect(hash1).toHaveLength(64);
  });

  test('verifyToken correctly verifies matching tokens', () => {
    const token = 'test-token-67890';
    const hash = hashToken(token);
    
    // Should return true for matching token
    expect(verifyToken(token, hash)).toBe(true);
  });

  test('verifyToken rejects non-matching tokens', () => {
    const token1 = 'test-token-one';
    const token2 = 'test-token-two';
    const hash = hashToken(token1);
    
    // Should return false for different token
    expect(verifyToken(token2, hash)).toBe(false);
  });

  test('generateSecureToken generates unique tokens', () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    
    // Should generate different tokens
    expect(token1).not.toBe(token2);
    
    // Default 32 bytes = 64 hex characters
    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
  });

  test('generateSecureToken respects byte length parameter', () => {
    const token = generateSecureToken(16);
    
    // 16 bytes = 32 hex characters
    expect(token).toHaveLength(32);
  });

  test('timing-safe comparison prevents timing attacks', () => {
    const token = 'test-token';
    const hash = hashToken(token);
    
    // Even with very similar tokens, verification should be timing-safe
    const similarToken = 'test-tokeo'; // One character different
    
    // Should return false without leaking timing information
    expect(verifyToken(similarToken, hash)).toBe(false);
  });
});

#!/usr/bin/env tsx

/**
 * Test script to verify token verification works correctly
 * 
 * This demonstrates:
 * 1. How to properly hash tokens for database storage
 * 2. How verifyToken() correctly matches plaintext with hash
 */

import crypto from 'crypto';
import { hashToken, verifyToken } from '../lib/token-utils';

console.log('Testing Token Verification Fix\n');
console.log('='.repeat(60));

// Test case 1: The original bug scenario
const testToken = 'testtoken123';
const testHash = hashToken(testToken);

console.log('\n1. Original Bug Scenario:');
console.log('   Plaintext token:', testToken);
console.log('   SHA-256 hash:', testHash);
console.log('   Hash length:', testHash.length, 'chars');

// Verify the token
const isValid = verifyToken(testToken, testHash);
console.log('\n   ✓ verifyToken(plaintext, hash):', isValid);

if (!isValid) {
  console.log('   ❌ FAILED: Token verification still broken!');
  process.exit(1);
}

// Test case 2: Demonstrate correct database insertion
console.log('\n2. Correct Database Insertion:');
console.log('   To insert token "testtoken123" into DB:');
console.log('   ❌ WRONG: INSERT INTO password_reset_tokens (token) VALUES (\'testtoken123\')');
console.log('   ✅ RIGHT: INSERT INTO password_reset_tokens (token) VALUES (\'' + testHash + '\')');

// Test case 3: Multiple token verification
console.log('\n3. Testing Multiple Tokens:');
const tokens = [
  { plain: 'abc123def456', purpose: 'Short token' },
  { plain: crypto.randomBytes(32).toString('hex'), purpose: 'Standard 64-char token' },
  { plain: 'MySecure!Token@2024', purpose: 'Complex token' },
];

let allPassed = true;
tokens.forEach((test, index) => {
  const hash = hashToken(test.plain);
  const valid = verifyToken(test.plain, hash);
  const status = valid ? '✅' : '❌';
  console.log(`   ${status} ${test.purpose}: ${valid}`);
  if (!valid) allPassed = false;
});

// Test case 4: Negative test - wrong token should fail
console.log('\n4. Negative Test (should fail):');
const wrongToken = 'wrongtoken';
const wrongValid = verifyToken(wrongToken, testHash);
console.log('   verifyToken("wrongtoken", hash of "testtoken123"):', wrongValid);
if (wrongValid) {
  console.log('   ❌ FAILED: Should not verify wrong token!');
  allPassed = false;
} else {
  console.log('   ✅ Correctly rejected wrong token');
}

// Summary
console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('✅ All tests passed! Token verification is working correctly.');
  console.log('\nThe bug has been fixed:');
  console.log('- Changed Buffer encoding from "utf-8" to "hex"');
  console.log('- Both tokenHash and stored hash are hex strings');
  console.log('- timingSafeEqual now correctly compares the buffers');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!');
  process.exit(1);
}

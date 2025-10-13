import fs from 'fs';
import path from 'path';

interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

// Load common passwords list (10k most common passwords)
let commonPasswordsSet: Set<string>;

function loadCommonPasswords(): Set<string> {
  if (commonPasswordsSet) {
    return commonPasswordsSet;
  }

  try {
    const filePath = path.join(__dirname, 'common-passwords.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    commonPasswordsSet = new Set(
      content.split('\n')
        .map(p => p.trim().toLowerCase())
        .filter(p => p.length > 0)
    );
    return commonPasswordsSet;
  } catch (error) {
    console.error('Failed to load common passwords list:', error);
    // Return empty set if file doesn't exist
    commonPasswordsSet = new Set();
    return commonPasswordsSet;
  }
}

/**
 * Hardened password validation per security requirements:
 * - Min 12 chars, max 128
 * - Must include ≥3 of 4 classes: lowercase, uppercase, digit, symbol
 * - Block the 10k most-common passwords
 * - Block passwords containing the email/username
 * - Reject leading/trailing spaces; allow spaces inside (passphrases)
 */
export function validatePassword(
  password: string,
  email?: string,
  username?: string
): PasswordValidationResult {
  const errors: string[] = [];

  // Check length (12-128 chars)
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Reject leading/trailing spaces
  if (password !== password.trim()) {
    errors.push('Password cannot have leading or trailing spaces');
  }

  // Check character class diversity (3 of 4 required)
  let characterClassCount = 0;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

  if (hasLowercase) characterClassCount++;
  if (hasUppercase) characterClassCount++;
  if (hasDigit) characterClassCount++;
  if (hasSymbol) characterClassCount++;

  if (characterClassCount < 3) {
    errors.push('Password must include at least 3 of 4 character types: lowercase, uppercase, digit, symbol');
  }

  // Block common passwords (case-insensitive)
  const commonPasswords = loadCommonPasswords();
  if (commonPasswords.has(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a more unique password');
  }

  // Block passwords containing email or username (case-insensitive)
  if (email) {
    const emailUsername = email.split('@')[0].toLowerCase();
    if (password.toLowerCase().includes(emailUsername)) {
      errors.push('Password cannot contain parts of your email address');
    }
  }

  if (username && username.length >= 3) {
    if (password.toLowerCase().includes(username.toLowerCase())) {
      errors.push('Password cannot contain your username');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get password strength score (0-100) for UI feedback
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  // Length scoring
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;

  // Character diversity
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score += 15;

  // Bonus for spaces (passphrase indicator)
  if (/\s/.test(password) && password.trim() === password) score += 5;

  // Determine label and color
  if (score <= 40) {
    return { score, label: 'Weak', color: 'red' };
  } else if (score <= 60) {
    return { score, label: 'Fair', color: 'yellow' };
  } else if (score <= 80) {
    return { score, label: 'Good', color: 'blue' };
  } else {
    return { score: Math.min(score, 100), label: 'Strong', color: 'green' };
  }
}

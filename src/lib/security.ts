// src/lib/security.ts
// Enterprise-grade security utilities for input sanitization and validation

/**
 * HTML entity encoding map for XSS prevention
 */
const HTML_ENTITIES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '&': '&amp;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Sanitize user input to prevent XSS attacks
 * @param input - Raw user input
 * @returns Sanitized string safe for HTML output
 */
export function sanitizeHTML(input: unknown): string {
  if (input === null || input === undefined) return '';
  
  const str = String(input);
  return str.replace(/[<>"'&\/`=]/g, (match) => HTML_ENTITIES[match] || match);
}

/**
 * Sanitize and validate email addresses
 * @param email - Email to validate
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: unknown): string | null {
  if (!email || typeof email !== 'string') return null;
  
  const sanitized = sanitizeHTML(email.toLowerCase().trim());
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(sanitized) ? sanitized : null;
}

/**
 * Validate NEU institutional email
 * @param email - Email to validate
 * @returns True if valid NEU email
 */
export function isValidNEUEmail(email: unknown): boolean {
  const sanitized = sanitizeEmail(email);
  return sanitized !== null && sanitized.endsWith('@neu.edu.ph');
}

/**
 * Sanitize user names and text content
 * @param name - Name to sanitize
 * @returns Sanitized name
 */
export function sanitizeName(name: unknown): string {
  if (!name || typeof name !== 'string') return '';
  
  // Remove HTML tags and entities, keep only alphanumeric, spaces, and common name characters
  return String(name)
    .replace(/[<>"'&\/`=]/g, (match) => HTML_ENTITIES[match] || match)
    .replace(/[^\w\s\-'.]/g, '')
    .trim()
    .slice(0, 100); // Limit length
}

/**
 * Sanitize numeric input
 * @param input - Numeric input
 * @returns Sanitized number or null
 */
export function sanitizeNumber(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  
  const num = Number(input);
  return isNaN(num) ? null : num;
}

/**
 * Sanitize and validate student numbers
 * @param studentNumber - Student number to validate
 * @returns Sanitized student number or null
 */
export function sanitizeStudentNumber(studentNumber: unknown): string | null {
  if (!studentNumber || typeof studentNumber !== 'string') return null;
  
  // Remove non-alphanumeric characters and limit length
  const sanitized = String(studentNumber)
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 20);
  
  return sanitized.length >= 4 ? sanitized : null;
}

/**
 * Sanitize search queries
 * @param query - Search query
 * @returns Sanitized query
 */
export function sanitizeSearchQuery(query: unknown): string {
  if (!query || typeof query !== 'string') return '';
  
  return String(query)
    .replace(/[<>"'&\/`=]/g, (match) => HTML_ENTITIES[match] || match)
    .trim()
    .slice(0, 200); // Limit search query length
}

/**
 * Rate limiting utility for authentication attempts
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) { // 5 attempts per 15 minutes
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Reset if window has passed
    if (now - record.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Check if under limit
    if (record.count < this.maxAttempts) {
      record.count++;
      record.lastAttempt = now;
      return true;
    }

    return false;
  }

  getRemainingTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return 0;

    const elapsed = Date.now() - record.lastAttempt;
    return Math.max(0, this.windowMs - elapsed);
  }
}

// Global rate limiter for authentication
export const authRateLimiter = new RateLimiter();

/**
 * Sanitize log messages to prevent log injection (CWE-117)
 * Removes newlines, carriage returns, and control characters
 */
export function sanitizeLogMessage(message: unknown): string {
  if (!message) return '';
  
  return String(message)
    .replace(/[\r\n\t]/g, ' ')  // Replace newlines and tabs with spaces
    .replace(/[\x00-\x1F\x7F]/g, '')  // Remove control characters
    .slice(0, 500);  // Limit length
}

/**
 * Secure logging utility that sanitizes sensitive data and prevents log injection
 */
export function secureLog(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const sanitizedMessage = sanitizeLogMessage(message);
  
  const sanitizedData = data ? JSON.parse(JSON.stringify(data, (key, value) => {
    // Remove sensitive fields
    if (['password', 'token', 'secret', 'key', 'auth'].some(sensitive => 
      key.toLowerCase().includes(sensitive))) {
      return '[REDACTED]';
    }
    // Sanitize string values
    if (typeof value === 'string') {
      return sanitizeLogMessage(value);
    }
    return value;
  })) : undefined;

  console[level](`[NEU-LIB] ${sanitizedMessage}`, sanitizedData);
}
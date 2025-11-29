/**
 * Security Utilities for FundLink
 * 
 * This module provides security functions to protect against common vulnerabilities:
 * - XSS (Cross-Site Scripting)
 * - SQL Injection
 * - Input validation
 * - Data sanitization
 */

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes dangerous HTML/JavaScript characters
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Escape special characters
    .replace(/[<>'"]/g, (char) => {
      const map: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#x27;',
        '"': '&quot;',
      };
      return map[char] || char;
    });
}

/**
 * Sanitizes and validates email addresses
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null;
  
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Sanitizes URL inputs to prevent malicious links
 */
export function sanitizeURL(url: string): string | null {
  if (!url) return null;
  
  try {
    const sanitized = url.trim();
    const urlObject = new URL(sanitized);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObject.protocol)) {
      return null;
    }
    
    return sanitized;
  } catch (error) {
    return null;
  }
}

/**
 * Sanitizes file names to prevent directory traversal
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'unnamed';
  
  return fileName
    .trim()
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove dangerous characters
    .replace(/[^\w\s.-]/g, '')
    // Limit length
    .substring(0, 255)
    // Remove leading/trailing dots
    .replace(/^\.+|\.+$/g, '')
    || 'unnamed';
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Validates and sanitizes text input
 */
export function validateText(
  text: string,
  options: {
    minLength?: number;
    maxLength?: number;
    required?: boolean;
    allowedPattern?: RegExp;
  } = {}
): { isValid: boolean; sanitized: string; error?: string } {
  const {
    minLength = 0,
    maxLength = 1000,
    required = false,
    allowedPattern,
  } = options;

  // Check if required
  if (required && (!text || text.trim().length === 0)) {
    return { isValid: false, sanitized: '', error: 'This field is required' };
  }

  // Sanitize
  const sanitized = sanitizeInput(text);

  // Check length
  if (sanitized.length < minLength) {
    return {
      isValid: false,
      sanitized,
      error: `Must be at least ${minLength} characters`,
    };
  }

  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      sanitized,
      error: `Must not exceed ${maxLength} characters`,
    };
  }

  // Check pattern
  if (allowedPattern && !allowedPattern.test(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: 'Invalid format',
    };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates numeric input
 */
export function validateNumber(
  value: any,
  options: {
    min?: number;
    max?: number;
    required?: boolean;
    integer?: boolean;
  } = {}
): { isValid: boolean; value: number | null; error?: string } {
  const { min = -Infinity, max = Infinity, required = false, integer = false } = options;

  if (value === null || value === undefined || value === '') {
    if (required) {
      return { isValid: false, value: null, error: 'This field is required' };
    }
    return { isValid: true, value: null };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return { isValid: false, value: null, error: 'Must be a valid number' };
  }

  if (integer && !Number.isInteger(num)) {
    return { isValid: false, value: null, error: 'Must be a whole number' };
  }

  if (num < min) {
    return { isValid: false, value: null, error: `Must be at least ${min}` };
  }

  if (num > max) {
    return { isValid: false, value: null, error: `Must not exceed ${max}` };
  }

  return { isValid: true, value: num };
}

/**
 * Validates file uploads
 */
export function validateFile(
  file: {
    uri: string;
    size?: number | null;
    mimeType?: string;
    fileName?: string;
  },
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  } = {}
): { isValid: boolean; error?: string } {
  const {
    maxSize = 50 * 1024 * 1024, // 50MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'],
  } = options;

  // Check file size
  if (file.size && file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      isValid: false,
      error: `File size must not exceed ${maxSizeMB}MB`,
    };
  }

  // Check MIME type
  if (file.mimeType && !allowedTypes.includes(file.mimeType)) {
    return {
      isValid: false,
      error: 'File type not allowed',
    };
  }

  // Validate URI
  if (!file.uri || file.uri.trim().length === 0) {
    return {
      isValid: false,
      error: 'Invalid file',
    };
  }

  return { isValid: true };
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Simple client-side rate limiter
 * Prevents rapid API calls
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  /**
   * Check if action is allowed
   * @param key - Unique identifier for the action
   * @param maxAttempts - Maximum attempts allowed
   * @param windowMs - Time window in milliseconds
   */
  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter((timestamp) => now - timestamp < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      return false;
    }

    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);

    return true;
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

// ============================================================================
// SECURE DATA HANDLING
// ============================================================================

/**
 * Masks sensitive data for logging
 */
export function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key', 'auth'];
  const masked = { ...data };

  Object.keys(masked).forEach((key) => {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      masked[key] = '***REDACTED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  });

  return masked;
}

/**
 * Safely parse JSON with error handling
 */
export function safeJSONParse<T = any>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return defaultValue;
  }
}

// ============================================================================
// PERMISSION CHECKS
// ============================================================================

/**
 * Checks if user owns a resource
 */
export function checkOwnership(userId: string, resourceOwnerId: string): boolean {
  return userId === resourceOwnerId;
}

/**
 * Checks if user has required role
 */
export function checkRole(userRole: string, requiredRole: string | string[]): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  return userRole === requiredRole;
}

// ============================================================================
// SQL INJECTION PROTECTION
// ============================================================================

/**
 * Note: Supabase client library already protects against SQL injection
 * by using parameterized queries. This function is for additional validation.
 * 
 * Validates input that will be used in database queries
 */
export function validateDatabaseInput(input: string): { isValid: boolean; error?: string } {
  // Check for SQL injection patterns
  const dangerousPatterns = [
    /(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b)/i,
    /(\bUNION\b|\bJOIN\b)/i,
    /(--|\/\*|\*\/|;)/,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      return {
        isValid: false,
        error: 'Invalid characters detected',
      };
    }
  }

  return { isValid: true };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const Security = {
  sanitizeInput,
  sanitizeEmail,
  sanitizeURL,
  sanitizeFileName,
  validateText,
  validateNumber,
  validateFile,
  validateDatabaseInput,
  maskSensitiveData,
  safeJSONParse,
  checkOwnership,
  checkRole,
  rateLimiter,
};


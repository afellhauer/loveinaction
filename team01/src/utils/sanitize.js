import DOMPurify from 'isomorphic-dompurify';

/**
 * Safely decodes HTML entities in a cross-platform way
 * Handles multiple levels of encoding (double-encoded, etc.)
 * @param {string} input - String that may contain HTML entities
 * @returns {string} - Decoded string
 */
function decodeHTMLEntities(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Common HTML entity mappings for security-critical entities
  const entityMap = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
    // Numeric entities for < and >
    '&#60;': '<',
    '&#62;': '>',
    '&#x3C;': '<',
    '&#x3E;': '>',
    // Double-encoded entities
    '&amp;lt;': '<',
    '&amp;gt;': '>',
  };

  let decoded = input;
  let previousDecoded = '';

  // Keep decoding until no more changes occur (handles multiple levels of encoding)
  while (decoded !== previousDecoded) {
    previousDecoded = decoded;
    for (const [entity, char] of Object.entries(entityMap)) {
      decoded = decoded.replace(new RegExp(entity, 'gi'), char);
    }
  }

  return decoded;
}

/**
 * Safely decodes HTML entities and then sanitizes the result
 * This prevents HTML entity encoding bypass attacks
 * @param {string} input - The input that may contain HTML entities
 * @returns {string} - Safely decoded and sanitized string
 */
function decodeAndSanitize(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // First pass: Let DOMPurify handle the input as-is
  let sanitized = DOMPurify.sanitize(input, options);

  // Second pass: If the result still contains entities, decode and sanitize again
  // This handles cases like &lt;script&gt; that might be decoded by the browser
  const hasEntities = /&[a-zA-Z0-9#]+;/.test(sanitized);
  if (hasEntities) {
    // Decode entities using our cross-platform function
    const decoded = decodeHTMLEntities(sanitized);

    // Sanitize the decoded content again
    sanitized = DOMPurify.sanitize(decoded, options);
  }

  return sanitized;
}

/**
 * Whitelist of allowed session messages
 * Only these exact messages are permitted to be displayed
 */
const ALLOWED_SESSION_MESSAGES = [
  'Logged out due to session expiry',
  'Session expired',
  'Please log in to continue',
  'You have been logged out',
  'Session timeout',
  'Login required',
  'Authentication required',
  'Your session has expired'
];

/**
 * Validates if a session message is in our whitelist
 * @param {string} message - The session message to validate
 * @returns {string|null} - The message if valid, null if not allowed
 */
export function validateSessionMessage(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  // First check: Reject if the raw input contains any HTML or suspicious patterns
  const suspiciousPatterns = [
    /<[^>]*>/,  // Any HTML tags
    /&[a-zA-Z0-9#]+;/,  // Any HTML entities
    /javascript:/i,
    /on\w+=/i,  // Event handlers like onclick=
    /script/i,
    /iframe/i,
    /object/i,
    /embed/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(message)) {
      return null; // Reject immediately if any suspicious content found
    }
  }

  // Second check: Ensure it's an exact match with our whitelist
  const trimmedMessage = message.trim();
  if (ALLOWED_SESSION_MESSAGES.includes(trimmedMessage)) {
    return trimmedMessage;
  }

  // If not in whitelist, reject it
  return null;
}

/**
 * Sanitizes user input to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @param {Object} options - DOMPurify configuration options
 * @returns {string} - Sanitized string safe for rendering
 */
export function sanitizeInput(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Default configuration for strict sanitization
  const defaultOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u'], // Only allow basic formatting tags
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content even if tags are removed
    ...options
  };

  return decodeAndSanitize(input, defaultOptions);
}

/**
 * Sanitizes session messages - extremely strict, only text allowed
 * @param {string} message - The session message to sanitize
 * @returns {string} - Sanitized text-only message
 * @deprecated - Use validateSessionMessage instead for better security
 */
export function sanitizeSessionMessage(message) {
  if (!message || typeof message !== 'string') {
    return '';
  }

  return decodeAndSanitize(message, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
}

/**
 * Sanitizes user messages for chat (allows some formatting)
 * @param {string} message - The chat message to sanitize
 * @returns {string} - Sanitized message with basic formatting allowed
 */
export function sanitizeChatMessage(message) {
  return sanitizeInput(message, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });
}

/**
 * Sanitizes plan inputs (time and location) - strict text-only sanitization
 * @param {string} input - The plan input to sanitize
 * @returns {string} - Sanitized text-only input
 */
export function sanitizePlanInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Use the secure decode and sanitize function
  return decodeAndSanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  }).trim();
} 
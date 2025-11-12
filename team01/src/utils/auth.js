/**
 * JWT Token utilities
 */

/**
 * Decode a JWT token and extract the payload
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null if invalid
 */
export function decodeJWT(token) {
  if (!token) return null;
  
  try {
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (middle part)
    const payload = parts[1];
    
    // Add padding if needed (base64 decode requires proper padding)
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Decode from base64
    const decoded = atob(padded);
    
    // Parse as JSON
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Get current user ID from stored access token
 * @returns {string|null} - User ID or null if not available
 */
export function getCurrentUserIdFromToken() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  
  const payload = decodeJWT(token);
  if (!payload) return null;
  
  // Check if token is expired
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    console.log('Token is expired');
    return null;
  }
  
  return payload.userId || null;
}

/**
 * Check if user is authenticated and token is valid
 * @returns {boolean}
 */
export function isAuthenticated() {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;
  
  const payload = decodeJWT(token);
  if (!payload) return false;
  
  // Check if token is expired
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    return false;
  }
  
  return true;
} 
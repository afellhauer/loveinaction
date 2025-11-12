/**
 * Decode a JWT token and extract the payload.
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null if invalid
 */
export function decodeJWT(token) {
    if (!token) return null;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        const decodedPayload = atob(padded);

        return JSON.parse(decodedPayload);
    } catch (e) {
        console.error('Failed to decode JWT:', e);
        return null;
    }
}

/**
 * Get current user ID from stored access token.
 * @returns {string|null}
 */
export function getCurrentUserIdFromToken() {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    const payload = decodeJWT(token);
    if (!payload) return null;

    // Optional: check for expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
        console.warn('Token is expired');
        return null;
    }

    return payload.userId || payload.sub || null;
}

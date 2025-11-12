// utils/deobfuscation.js

/**
 * Deobfuscate Base64 encoded API responses
 */
export const deobfuscateResponse = (response) => {
  // Check if response is obfuscated
  if (response && response.obfuscated && response.data) {
    try {
      // Decode base64 string back to JSON
      const binary = Uint8Array.from(atob(response.data), char => char.charCodeAt(0));

      // Decode UTF-8 binary safely back to string
      const decodedString = new TextDecoder("utf-8").decode(binary);

      // Parse as JSON
      return JSON.parse(decodedString);
    } catch (error) {
      console.error("Failed to deobfuscate response:", error);
      // Return the original response if deobfuscation fails
      return response;
    }
  }

  // Return as-is if not obfuscated
  return response;
};

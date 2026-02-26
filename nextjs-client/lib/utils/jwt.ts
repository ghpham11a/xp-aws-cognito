// JWT utility functions

export interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Decode a JWT token and return its payload
 * Note: This does NOT verify the token signature
 */
export function decodeJwt(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  return JSON.parse(atob(parts[1]));
}

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string, bufferMs = 0): boolean {
  try {
    const payload = decodeJwt(token);
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now() + bufferMs;
  } catch {
    return true;
  }
}

/**
 * Get the expiration time of a JWT token in milliseconds
 */
export function getTokenExpiration(token: string): number | null {
  try {
    const payload = decodeJwt(token);
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

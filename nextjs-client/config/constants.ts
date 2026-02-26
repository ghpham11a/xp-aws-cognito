// Application constants and magic values

// Token refresh configuration
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiration

// Storage keys
export const STORAGE_KEYS = {
  NATIVE_TOKENS: "native_auth_tokens",
} as const;

// Navigation items
export const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/account", label: "Account" },
] as const;

// External script URLs
export const EXTERNAL_SCRIPTS = {
  GOOGLE_IDENTITY: "https://accounts.google.com/gsi/client",
  APPLE_AUTH:
    "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
} as const;

// Validation rules
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
} as const;

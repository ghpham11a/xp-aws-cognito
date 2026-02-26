// API endpoint constants

export const ENDPOINTS = {
  // Messages
  MESSAGES_PUBLIC: "/messages/public",
  MESSAGES_PRIVATE: "/messages/private",

  // Users
  USERS_ME: "/users/me",
  USERS: "/users",
  USER_BY_ID: (id: string) => `/users/${id}`,

  // Auth (token exchange)
  AUTH_GOOGLE: "/auth/google",
  AUTH_APPLE: "/auth/apple",

  // Health
  HEALTH: "/health",
} as const;

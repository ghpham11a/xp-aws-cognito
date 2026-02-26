// Centralized environment variables
// All NEXT_PUBLIC_* variables should be accessed through this module

export const env = {
  // AWS Cognito
  awsRegion: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
  cognitoUserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  cognitoClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
  cognitoOAuthDomain:
    process.env.NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN ||
    "us-east-1kfpe5wcvo.auth.us-east-1.amazoncognito.com",

  // API
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:6969",

  // OAuth
  oauthRedirectUrl:
    typeof window !== "undefined"
      ? `${window.location.origin}/`
      : process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URL || "http://localhost:3000/",

  // Social Sign-In
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  appleClientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
  appleRedirectUri:
    process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ||
    (typeof window !== "undefined" ? window.location.origin : ""),

  // Feature flags
  useNativeApple: !!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
} as const;

// Auth API functions (native social sign-in token exchange)

import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { CognitoTokenResponse } from "@/types";

interface GoogleAuthRequest {
  id_token: string;
  email?: string;
  full_name?: string;
}

interface AppleAuthRequest {
  identity_token: string;
  authorization_code: string;
  email?: string;
  full_name?: string;
}

/**
 * Exchange Google ID token for Cognito tokens
 */
export async function exchangeGoogleToken(
  idToken: string,
  email?: string,
  name?: string
): Promise<CognitoTokenResponse> {
  const body: GoogleAuthRequest = {
    id_token: idToken,
    email,
    full_name: name,
  };

  return apiClient.post<CognitoTokenResponse>(ENDPOINTS.AUTH_GOOGLE, body, {
    skipAuth: true,
  });
}

/**
 * Exchange Apple ID token for Cognito tokens
 */
export async function exchangeAppleToken(
  idToken: string,
  code: string,
  email?: string,
  name?: string
): Promise<CognitoTokenResponse> {
  const body: AppleAuthRequest = {
    identity_token: idToken,
    authorization_code: code,
    email,
    full_name: name,
  };

  return apiClient.post<CognitoTokenResponse>(ENDPOINTS.AUTH_APPLE, body, {
    skipAuth: true,
  });
}

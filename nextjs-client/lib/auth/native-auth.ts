// Native authentication token management

import { STORAGE_KEYS } from "@/config";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/utils";
import { decodeJwt } from "@/lib/utils/jwt";
import { exchangeGoogleToken, exchangeAppleToken } from "@/lib/api";
import type { NativeTokens, AuthUser, CognitoTokenResponse } from "@/types";

/**
 * Load native tokens from localStorage
 */
export function loadNativeTokens(): NativeTokens | null {
  const tokens = getStorageItem<NativeTokens>(STORAGE_KEYS.NATIVE_TOKENS);
  if (tokens && tokens.expiresAt > Date.now()) {
    return tokens;
  }
  // Expired tokens - clean up
  if (tokens) {
    removeStorageItem(STORAGE_KEYS.NATIVE_TOKENS);
  }
  return null;
}

/**
 * Save native tokens to localStorage
 */
export function saveNativeTokens(tokens: NativeTokens): void {
  setStorageItem(STORAGE_KEYS.NATIVE_TOKENS, tokens);
}

/**
 * Clear native tokens from localStorage
 */
export function clearNativeTokens(): void {
  removeStorageItem(STORAGE_KEYS.NATIVE_TOKENS);
}

/**
 * Check if native tokens are valid
 */
export function areNativeTokensValid(tokens: NativeTokens | null): boolean {
  return tokens !== null && tokens.expiresAt > Date.now();
}

/**
 * Get user info from native tokens
 */
export function getUserFromNativeTokens(tokens: NativeTokens): AuthUser {
  const payload = decodeJwt(tokens.idToken);
  return {
    userId: payload.sub,
    signInDetails: {
      loginId: payload.email,
    },
  };
}

/**
 * Convert Cognito token response to NativeTokens format
 */
function convertToNativeTokens(response: CognitoTokenResponse): NativeTokens {
  return {
    idToken: response.id_token,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: Date.now() + response.expires_in * 1000,
  };
}

/**
 * Sign in with Google native (token exchange through backend)
 */
export async function signInWithGoogleNative(
  idToken: string,
  email?: string,
  name?: string
): Promise<{ tokens: NativeTokens; user: AuthUser }> {
  const response = await exchangeGoogleToken(idToken, email, name);
  const tokens = convertToNativeTokens(response);
  saveNativeTokens(tokens);

  const user = getUserFromNativeTokens(tokens);
  // Use provided email if token doesn't have one
  if (!user.signInDetails?.loginId && email) {
    user.signInDetails = { loginId: email };
  }

  return { tokens, user };
}

/**
 * Sign in with Apple native (token exchange through backend)
 */
export async function signInWithAppleNative(
  idToken: string,
  code: string,
  email?: string,
  name?: string
): Promise<{ tokens: NativeTokens; user: AuthUser }> {
  const response = await exchangeAppleToken(idToken, code, email, name);
  const tokens = convertToNativeTokens(response);
  saveNativeTokens(tokens);

  const user = getUserFromNativeTokens(tokens);
  // Use provided email if token doesn't have one
  if (!user.signInDetails?.loginId && email) {
    user.signInDetails = { loginId: email };
  }

  return { tokens, user };
}

// Amplify authentication operations

import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  confirmSignUp as amplifyConfirmSignUp,
  getCurrentUser,
  fetchAuthSession,
  resetPassword as amplifyResetPassword,
  confirmResetPassword as amplifyConfirmResetPassword,
  updatePassword as amplifyUpdatePassword,
  resendSignUpCode as amplifyResendSignUpCode,
  signInWithRedirect,
} from "aws-amplify/auth";
import type { AuthUser, SignUpResult } from "@/types";

/**
 * Check current Amplify auth status
 */
export async function checkAmplifyAuth(): Promise<{
  user: AuthUser;
  expiration: number | null;
} | null> {
  try {
    const currentUser = await getCurrentUser();
    const session = await fetchAuthSession();

    if (!session.tokens?.idToken) {
      return null;
    }

    const expiration = session.tokens.idToken.payload.exp;

    return {
      user: {
        userId: currentUser.userId,
        signInDetails: {
          loginId: currentUser.signInDetails?.loginId || currentUser.username,
        },
      },
      expiration: typeof expiration === "number" ? expiration * 1000 : null,
    };
  } catch {
    return null;
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ isSignedIn: boolean; needsConfirmation: boolean }> {
  const result = await amplifySignIn({ username: email, password });

  if (result.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
    return { isSignedIn: false, needsConfirmation: true };
  }

  return { isSignedIn: result.isSignedIn, needsConfirmation: false };
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string
): Promise<SignUpResult> {
  const result = await amplifySignUp({
    username: email,
    password,
    options: {
      userAttributes: { email },
    },
  });

  return {
    isSignUpComplete: result.isSignUpComplete,
    nextStep: result.nextStep?.signUpStep || "",
  };
}

/**
 * Confirm sign up with verification code
 */
export async function confirmSignUp(
  email: string,
  code: string
): Promise<void> {
  await amplifyConfirmSignUp({ username: email, confirmationCode: code });
}

/**
 * Resend sign up verification code
 */
export async function resendSignUpCode(email: string): Promise<void> {
  await amplifyResendSignUpCode({ username: email });
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await amplifySignOut();
}

/**
 * Initiate password reset
 */
export async function resetPassword(email: string): Promise<void> {
  await amplifyResetPassword({ username: email });
}

/**
 * Confirm password reset with code and new password
 */
export async function confirmResetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  await amplifyConfirmResetPassword({
    username: email,
    confirmationCode: code,
    newPassword,
  });
}

/**
 * Update password for authenticated user
 */
export async function updatePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  await amplifyUpdatePassword({ oldPassword, newPassword });
}

/**
 * Refresh session and get new token expiration
 */
export async function refreshSession(): Promise<number | null> {
  const session = await fetchAuthSession({ forceRefresh: true });
  const expiration = session.tokens?.idToken?.payload.exp;
  return typeof expiration === "number" ? expiration * 1000 : null;
}

/**
 * Get ID token from Amplify session
 */
export async function getAmplifyIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch {
    return null;
  }
}

/**
 * Sign in with Google OAuth redirect
 */
export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect({ provider: "Google" });
}

/**
 * Sign in with Apple OAuth redirect
 */
export async function signInWithApple(): Promise<void> {
  await signInWithRedirect({ provider: "Apple" });
}

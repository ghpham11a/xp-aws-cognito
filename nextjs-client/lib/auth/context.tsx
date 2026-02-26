"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Hub } from "aws-amplify/utils";
import { apiClient } from "@/lib/api";
import type { AuthStatus, AuthUser, NativeTokens, AuthContextType } from "./types";
import {
  loadNativeTokens,
  clearNativeTokens,
  areNativeTokensValid,
  getUserFromNativeTokens,
  signInWithGoogleNative as nativeGoogleSignIn,
  signInWithAppleNative as nativeAppleSignIn,
} from "./native-auth";
import {
  checkAmplifyAuth,
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
  resendSignUpCode as amplifyResendCode,
  signOut as amplifySignOut,
  resetPassword as amplifyResetPassword,
  confirmResetPassword as amplifyConfirmReset,
  updatePassword as amplifyUpdatePassword,
  refreshSession,
  getAmplifyIdToken,
  signInWithGoogle,
  signInWithApple,
} from "./amplify-auth";
import { scheduleTokenRefresh, clearTokenRefresh } from "./token-refresh";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("configuring");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [nativeTokens, setNativeTokens] = useState<NativeTokens | null>(null);

  // Set up API client token provider
  useEffect(() => {
    apiClient.setTokenProvider(async () => {
      // Check native tokens first
      if (nativeTokens && areNativeTokensValid(nativeTokens)) {
        return nativeTokens.idToken;
      }
      // Fall back to Amplify
      return getAmplifyIdToken();
    });
  }, [nativeTokens]);

  const handleAuthError = useCallback(() => {
    setUser(null);
    setAuthStatus("unauthenticated");
    clearTokenRefresh();
  }, []);

  const checkAuth = useCallback(async () => {
    // First check for native tokens
    const storedNativeTokens = loadNativeTokens();
    if (storedNativeTokens && areNativeTokensValid(storedNativeTokens)) {
      const nativeUser = getUserFromNativeTokens(storedNativeTokens);
      setUser(nativeUser);
      setNativeTokens(storedNativeTokens);
      setAuthStatus("authenticated");
      return;
    }

    // Fall back to Amplify auth
    const amplifyAuth = await checkAmplifyAuth();
    if (amplifyAuth) {
      setUser(amplifyAuth.user);
      setAuthStatus("authenticated");

      // Schedule token refresh
      if (amplifyAuth.expiration) {
        scheduleTokenRefresh(
          amplifyAuth.expiration,
          () => {}, // Token refreshed successfully
          handleAuthError
        );
      }
    } else {
      handleAuthError();
    }
  }, [handleAuthError]);

  // Initial auth check and Hub listener
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth();

    const hubListener = Hub.listen("auth", ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
        case "signInWithRedirect":
          checkAuth();
          break;
        case "signedOut":
          handleAuthError();
          break;
        case "signInWithRedirect_failure":
          console.error("OAuth sign-in failed:", payload.data);
          setAuthStatus("unauthenticated");
          break;
      }
    });

    return () => {
      clearTokenRefresh();
      hubListener();
    };
  }, [checkAuth, handleAuthError]);

  // Listen for visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && authStatus === "authenticated") {
        checkAuth();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authStatus, checkAuth]);

  const handleSignIn = async (email: string, password: string) => {
    const result = await amplifySignIn(email, password);
    if (result.isSignedIn) {
      await checkAuth();
    } else if (result.needsConfirmation) {
      throw new Error("CONFIRM_SIGN_UP");
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    return amplifySignUp(email, password);
  };

  const handleConfirmSignUp = async (email: string, code: string) => {
    await amplifyConfirmSignUp(email, code);
  };

  const handleResendSignUpCode = async (email: string) => {
    await amplifyResendCode(email);
  };

  const handleResetPassword = async (email: string) => {
    await amplifyResetPassword(email);
  };

  const handleConfirmResetPassword = async (
    email: string,
    code: string,
    newPassword: string
  ) => {
    await amplifyConfirmReset(email, code, newPassword);
  };

  const handleUpdatePassword = async (
    oldPassword: string,
    newPassword: string
  ) => {
    await amplifyUpdatePassword(oldPassword, newPassword);
  };

  const handleRefreshSession = async () => {
    await refreshSession();
    await checkAuth();
  };

  const handleSignInWithGoogleNative = async (
    idToken: string,
    email?: string,
    name?: string
  ) => {
    const result = await nativeGoogleSignIn(idToken, email, name);
    setNativeTokens(result.tokens);
    setUser(result.user);
    setAuthStatus("authenticated");
  };

  const handleSignInWithAppleNative = async (
    idToken: string,
    code: string,
    email?: string,
    name?: string
  ) => {
    const result = await nativeAppleSignIn(idToken, code, email, name);
    setNativeTokens(result.tokens);
    setUser(result.user);
    setAuthStatus("authenticated");
  };

  const handleGetIdToken = async (): Promise<string | null> => {
    // Check native tokens first
    if (nativeTokens && areNativeTokensValid(nativeTokens)) {
      return nativeTokens.idToken;
    }
    // Fall back to Amplify
    return getAmplifyIdToken();
  };

  const handleSignOut = async () => {
    clearTokenRefresh();
    clearNativeTokens();
    setNativeTokens(null);

    try {
      await amplifySignOut();
    } catch {
      // Ignore Amplify sign out errors if using native auth
    }

    setUser(null);
    setAuthStatus("unauthenticated");
  };

  return (
    <AuthContext.Provider
      value={{
        authStatus,
        user,
        signIn: handleSignIn,
        signUp: handleSignUp,
        confirmSignUp: handleConfirmSignUp,
        resendSignUpCode: handleResendSignUpCode,
        signOut: handleSignOut,
        resetPassword: handleResetPassword,
        confirmResetPassword: handleConfirmResetPassword,
        updatePassword: handleUpdatePassword,
        refreshSession: handleRefreshSession,
        signInWithGoogle,
        signInWithApple,
        signInWithGoogleNative: handleSignInWithGoogleNative,
        signInWithAppleNative: handleSignInWithAppleNative,
        getIdToken: handleGetIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

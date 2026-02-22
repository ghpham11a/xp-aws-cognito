"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  signIn,
  signUp,
  signOut as amplifySignOut,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
  resetPassword,
  confirmResetPassword,
  updatePassword,
  resendSignUpCode,
  signInWithRedirect,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

export type AuthStatus = "configuring" | "authenticated" | "unauthenticated";

export interface AuthUser {
  userId: string;
  signInDetails?: {
    loginId?: string;
  };
}

interface AuthContextType {
  authStatus: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ isSignUpComplete: boolean; nextStep: string }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendSignUpCode: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogleNative: (idToken: string, email?: string, name?: string) => Promise<void>;
  signInWithAppleNative: (idToken: string, code: string, email?: string, name?: string) => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Refresh session 5 minutes before expiration
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Native auth tokens (for Google native sign-in)
interface NativeTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

const NATIVE_TOKENS_KEY = "native_auth_tokens";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("configuring");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [nativeTokens, setNativeTokens] = useState<NativeTokens | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load native tokens from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(NATIVE_TOKENS_KEY);
    if (stored) {
      try {
        const tokens = JSON.parse(stored) as NativeTokens;
        if (tokens.expiresAt > Date.now()) {
          setNativeTokens(tokens);
        } else {
          localStorage.removeItem(NATIVE_TOKENS_KEY);
        }
      } catch {
        localStorage.removeItem(NATIVE_TOKENS_KEY);
      }
    }
  }, []);

  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback((expirationTime: number) => {
    clearRefreshTimeout();

    const now = Date.now();
    const timeUntilRefresh = expirationTime - now - REFRESH_BUFFER_MS;

    if (timeUntilRefresh > 0) {
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          // Force refresh the session
          const session = await fetchAuthSession({ forceRefresh: true });
          if (session.tokens?.idToken) {
            const newExpiration = session.tokens.idToken.payload.exp;
            if (typeof newExpiration === "number") {
              scheduleTokenRefresh(newExpiration * 1000);
            }
          }
        } catch {
          // Session refresh failed, user needs to re-authenticate
          setUser(null);
          setAuthStatus("unauthenticated");
        }
      }, timeUntilRefresh);
    }
  }, [clearRefreshTimeout]);

  const checkAuth = useCallback(async () => {
    // First check for native tokens
    const stored = localStorage.getItem(NATIVE_TOKENS_KEY);
    if (stored) {
      try {
        const tokens = JSON.parse(stored) as NativeTokens;
        if (tokens.expiresAt > Date.now()) {
          // Decode token to get user info
          const payload = JSON.parse(atob(tokens.idToken.split(".")[1]));
          setUser({
            userId: payload.sub,
            signInDetails: {
              loginId: payload.email,
            },
          });
          setNativeTokens(tokens);
          setAuthStatus("authenticated");
          return;
        } else {
          localStorage.removeItem(NATIVE_TOKENS_KEY);
        }
      } catch {
        localStorage.removeItem(NATIVE_TOKENS_KEY);
      }
    }

    // Fall back to Amplify auth
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();

      if (!session.tokens?.idToken) {
        throw new Error("No valid session");
      }

      setUser({
        userId: currentUser.userId,
        signInDetails: {
          loginId: currentUser.signInDetails?.loginId || currentUser.username,
        },
      });
      setAuthStatus("authenticated");

      // Schedule token refresh
      const expiration = session.tokens.idToken.payload.exp;
      if (typeof expiration === "number") {
        scheduleTokenRefresh(expiration * 1000);
      }
    } catch {
      setUser(null);
      setAuthStatus("unauthenticated");
      clearRefreshTimeout();
    }
  }, [scheduleTokenRefresh, clearRefreshTimeout]);

  useEffect(() => {
    checkAuth();

    // Listen for auth events (including OAuth redirects)
    const hubListener = Hub.listen("auth", ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
        case "signInWithRedirect":
          checkAuth();
          break;
        case "signedOut":
          setUser(null);
          setAuthStatus("unauthenticated");
          clearRefreshTimeout();
          break;
        case "signInWithRedirect_failure":
          console.error("OAuth sign-in failed:", payload.data);
          setAuthStatus("unauthenticated");
          break;
      }
    });

    return () => {
      clearRefreshTimeout();
      hubListener();
    };
  }, [checkAuth, clearRefreshTimeout]);

  // Listen for visibility changes to refresh session when tab becomes active
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
    const result = await signIn({ username: email, password });
    if (result.isSignedIn) {
      await checkAuth();
    } else if (result.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
      throw new Error("CONFIRM_SIGN_UP");
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    const result = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
        },
      },
    });
    return {
      isSignUpComplete: result.isSignUpComplete,
      nextStep: result.nextStep?.signUpStep || "",
    };
  };

  const handleConfirmSignUp = async (email: string, code: string) => {
    await confirmSignUp({ username: email, confirmationCode: code });
  };

  const handleResendSignUpCode = async (email: string) => {
    await resendSignUpCode({ username: email });
  };

  const handleResetPassword = async (email: string) => {
    await resetPassword({ username: email });
  };

  const handleConfirmResetPassword = async (
    email: string,
    code: string,
    newPassword: string
  ) => {
    await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword,
    });
  };

  const handleUpdatePassword = async (
    oldPassword: string,
    newPassword: string
  ) => {
    await updatePassword({ oldPassword, newPassword });
  };

  const handleRefreshSession = async () => {
    await fetchAuthSession({ forceRefresh: true });
    await checkAuth();
  };

  const handleSignInWithGoogle = async () => {
    await signInWithRedirect({ provider: "Google" });
  };

  const handleSignInWithApple = async () => {
    await signInWithRedirect({ provider: "Apple" });
  };

  const handleSignInWithGoogleNative = async (idToken: string, email?: string, name?: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6969";

    const response = await fetch(`${apiUrl}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_token: idToken,
        email,
        full_name: name,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to sign in with Google");
    }

    const tokens = await response.json();

    // Store tokens
    const nativeTokensData: NativeTokens = {
      idToken: tokens.id_token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    };

    localStorage.setItem(NATIVE_TOKENS_KEY, JSON.stringify(nativeTokensData));
    setNativeTokens(nativeTokensData);

    // Decode token to get user info
    const payload = JSON.parse(atob(tokens.id_token.split(".")[1]));
    setUser({
      userId: payload.sub,
      signInDetails: {
        loginId: payload.email || email,
      },
    });
    setAuthStatus("authenticated");
  };

  const handleSignInWithAppleNative = async (idToken: string, code: string, email?: string, name?: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6969";

    const response = await fetch(`${apiUrl}/auth/apple`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identity_token: idToken,
        authorization_code: code,
        email,
        full_name: name,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to sign in with Apple");
    }

    const tokens = await response.json();

    // Store tokens
    const nativeTokensData: NativeTokens = {
      idToken: tokens.id_token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    };

    localStorage.setItem(NATIVE_TOKENS_KEY, JSON.stringify(nativeTokensData));
    setNativeTokens(nativeTokensData);

    // Decode token to get user info
    const payload = JSON.parse(atob(tokens.id_token.split(".")[1]));
    setUser({
      userId: payload.sub,
      signInDetails: {
        loginId: payload.email || email,
      },
    });
    setAuthStatus("authenticated");
  };

  const handleGetIdToken = async (): Promise<string | null> => {
    // Check native tokens first
    if (nativeTokens && nativeTokens.expiresAt > Date.now()) {
      return nativeTokens.idToken;
    }

    // Fall back to Amplify
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch {
      return null;
    }
  };

  const handleSignOut = async () => {
    clearRefreshTimeout();

    // Clear native tokens
    localStorage.removeItem(NATIVE_TOKENS_KEY);
    setNativeTokens(null);

    // Sign out from Amplify
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
        signInWithGoogle: handleSignInWithGoogle,
        signInWithApple: handleSignInWithApple,
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

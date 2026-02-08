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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Refresh session 5 minutes before expiration
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("configuring");
  const [user, setUser] = useState<AuthUser | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    return () => {
      clearRefreshTimeout();
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

  const handleSignOut = async () => {
    clearRefreshTimeout();
    await amplifySignOut();
    setUser(null);
    setAuthStatus("unauthenticated");
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
    // TODO: Configure OAuth in Cognito and update amplify-config.ts with OAuth settings
    // Then uncomment: await signInWithRedirect({ provider: "Google" });
    throw new Error("Google Sign In not yet configured with Cognito. Configure OAuth in the Cognito User Pool and update amplify-config.ts.");
  };

  const handleSignInWithApple = async () => {
    // TODO: Configure OAuth in Cognito and update amplify-config.ts with OAuth settings
    // Then uncomment: await signInWithRedirect({ provider: "Apple" });
    throw new Error("Apple Sign In not yet configured with Cognito. Configure OAuth in the Cognito User Pool and update amplify-config.ts.");
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

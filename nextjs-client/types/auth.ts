// Authentication-related types

export type AuthStatus = "configuring" | "authenticated" | "unauthenticated";

export interface AuthUser {
  userId: string;
  signInDetails?: {
    loginId?: string;
  };
}

export interface NativeTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface CognitoTokenResponse {
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export type AuthView =
  | "signIn"
  | "signUp"
  | "confirmSignUp"
  | "forgotPassword"
  | "confirmReset";

export interface SignUpResult {
  isSignUpComplete: boolean;
  nextStep: string;
}

export interface AuthContextType {
  authStatus: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendSignUpCode: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<void>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogleNative: (
    idToken: string,
    email?: string,
    name?: string
  ) => Promise<void>;
  signInWithAppleNative: (
    idToken: string,
    code: string,
    email?: string,
    name?: string
  ) => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

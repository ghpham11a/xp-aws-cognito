"use client";

import { useAuth } from "@/lib/auth";
import { env } from "@/config";
import { AppleIcon } from "@/components/icons";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { AppleSignInButton } from "./AppleSignInButton";

interface SocialAuthButtonsProps {
  loading: boolean;
  socialLoading: "google" | "apple" | null;
  setSocialLoading: (loading: "google" | "apple" | null) => void;
  setError: (error: string) => void;
}

export function SocialAuthButtons({
  loading,
  socialLoading,
  setSocialLoading,
  setError,
}: SocialAuthButtonsProps) {
  const { signInWithGoogleNative, signInWithAppleNative, signInWithApple } =
    useAuth();

  const handleGoogleSuccess = async (
    idToken: string,
    email?: string,
    name?: string
  ) => {
    setSocialLoading("google");
    setError("");
    try {
      await signInWithGoogleNative(idToken, email, name);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to sign in with Google");
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleAppleSuccess = async (
    idToken: string,
    code: string,
    email?: string,
    name?: string
  ) => {
    setSocialLoading("apple");
    setError("");
    try {
      await signInWithAppleNative(idToken, code, email, name);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to sign in with Apple");
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleAppleSignIn = async () => {
    setSocialLoading("apple");
    setError("");
    try {
      await signInWithApple();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to sign in with Apple");
    } finally {
      setSocialLoading(null);
    }
  };

  const isDisabled = loading || socialLoading !== null;

  return (
    <>
      <div className="social-divider">
        <span>or continue with</span>
      </div>

      <div className="social-buttons">
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          disabled={isDisabled}
        />
        {env.useNativeApple ? (
          <AppleSignInButton
            onSuccess={handleAppleSuccess}
            onError={handleAppleError}
            disabled={isDisabled}
          />
        ) : (
          <button
            type="button"
            className="social-button social-button-apple"
            onClick={handleAppleSignIn}
            disabled={isDisabled}
          >
            <AppleIcon />
            <span>
              {socialLoading === "apple" ? "Signing in..." : "Apple"}
            </span>
          </button>
        )}
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import GoogleSignInButton from "./GoogleSignInButton";
import AppleSignInButton from "./AppleSignInButton";

// Set to true to use native Apple Sign-In (requires real domain, not localhost)
const USE_NATIVE_APPLE = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ? true : false;

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/>
    </svg>
  );
}

type AuthView = "signIn" | "signUp" | "confirmSignUp" | "forgotPassword" | "confirmReset";

export default function LoginPanel() {
  const { signIn, signUp, confirmSignUp, resendSignUpCode, resetPassword, confirmResetPassword, signInWithApple, signInWithGoogleNative, signInWithAppleNative } = useAuth();

  const [view, setView] = useState<AuthView>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);

  const clearForm = () => {
    setPassword("");
    setConfirmPassword("");
    setCode("");
    setNewPassword("");
    setError("");
    setMessage("");
  };

  const handleGoogleSuccess = async (idToken: string, email?: string, name?: string) => {
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

  const handleAppleSuccess = async (idToken: string, code: string, email?: string, name?: string) => {
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signIn(email, password);
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message === "CONFIRM_SIGN_UP") {
        setView("confirmSignUp");
        setMessage("Please confirm your account with the code sent to your email.");
      } else {
        setError(error.message || "Failed to sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const result = await signUp(email, password);
      if (!result.isSignUpComplete && result.nextStep === "CONFIRM_SIGN_UP") {
        setView("confirmSignUp");
        setMessage("A confirmation code has been sent to your email.");
        clearForm();
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await confirmSignUp(email, code);
      setView("signIn");
      setMessage("Account confirmed! Please sign in.");
      clearForm();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to confirm sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError("");

    try {
      await resendSignUpCode(email);
      setMessage("A new confirmation code has been sent to your email.");
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await resetPassword(email);
      setView("confirmReset");
      setMessage("A password reset code has been sent to your email.");
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await confirmResetPassword(email, code, newPassword);
      setView("signIn");
      setMessage("Password reset successful! Please sign in with your new password.");
      clearForm();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-panel">
      <div className="auth-card">
        {view === "signIn" && (
          <>
            <h2>Sign In</h2>
            <form onSubmit={handleSignIn}>
              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="form-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              {message && <p className="form-message">{message}</p>}
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="social-divider">
              <span>or continue with</span>
            </div>

            <div className="social-buttons">
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                disabled={loading || socialLoading !== null}
              />
              {USE_NATIVE_APPLE ? (
                <AppleSignInButton
                  onSuccess={handleAppleSuccess}
                  onError={handleAppleError}
                  disabled={loading || socialLoading !== null}
                />
              ) : (
                <button
                  type="button"
                  className="social-button social-button-apple"
                  onClick={handleAppleSignIn}
                  disabled={loading || socialLoading !== null}
                >
                  <AppleIcon />
                  <span>{socialLoading === "apple" ? "Signing in..." : "Apple"}</span>
                </button>
              )}
            </div>

            <div className="auth-links">
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setView("forgotPassword");
                  clearForm();
                }}
              >
                Forgot password?
              </button>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setView("signUp");
                  clearForm();
                }}
              >
                Create an account
              </button>
            </div>
          </>
        )}

        {view === "signUp" && (
          <>
            <h2>Create Account</h2>
            <form onSubmit={handleSignUp}>
              <div className="form-field">
                <label htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="form-field">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div className="form-field">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </form>

            <div className="social-divider">
              <span>or continue with</span>
            </div>

            <div className="social-buttons">
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                disabled={loading || socialLoading !== null}
              />
              {USE_NATIVE_APPLE ? (
                <AppleSignInButton
                  onSuccess={handleAppleSuccess}
                  onError={handleAppleError}
                  disabled={loading || socialLoading !== null}
                />
              ) : (
                <button
                  type="button"
                  className="social-button social-button-apple"
                  onClick={handleAppleSignIn}
                  disabled={loading || socialLoading !== null}
                >
                  <AppleIcon />
                  <span>{socialLoading === "apple" ? "Signing up..." : "Apple"}</span>
                </button>
              )}
            </div>

            <div className="auth-links">
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setView("signIn");
                  clearForm();
                }}
              >
                Already have an account? Sign in
              </button>
            </div>
          </>
        )}

        {view === "confirmSignUp" && (
          <>
            <h2>Confirm Your Account</h2>
            <p className="auth-description">
              Enter the confirmation code sent to {email}
            </p>
            <form onSubmit={handleConfirmSignUp}>
              <div className="form-field">
                <label htmlFor="confirm-code">Confirmation Code</label>
                <input
                  id="confirm-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoComplete="one-time-code"
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              {message && <p className="form-message">{message}</p>}
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Confirming..." : "Confirm"}
              </button>
            </form>
            <div className="auth-links">
              <button
                type="button"
                className="link-button"
                onClick={handleResendCode}
                disabled={loading}
              >
                Resend code
              </button>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setView("signIn");
                  clearForm();
                }}
              >
                Back to sign in
              </button>
            </div>
          </>
        )}

        {view === "forgotPassword" && (
          <>
            <h2>Reset Password</h2>
            <p className="auth-description">
              Enter your email to receive a password reset code
            </p>
            <form onSubmit={handleForgotPassword}>
              <div className="form-field">
                <label htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Sending code..." : "Send Reset Code"}
              </button>
            </form>
            <div className="auth-links">
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setView("signIn");
                  clearForm();
                }}
              >
                Back to sign in
              </button>
            </div>
          </>
        )}

        {view === "confirmReset" && (
          <>
            <h2>Set New Password</h2>
            <p className="auth-description">
              Enter the code sent to {email} and your new password
            </p>
            <form onSubmit={handleConfirmReset}>
              <div className="form-field">
                <label htmlFor="reset-code">Reset Code</label>
                <input
                  id="reset-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoComplete="one-time-code"
                />
              </div>
              <div className="form-field">
                <label htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              {message && <p className="form-message">{message}</p>}
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
            <div className="auth-links">
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setView("signIn");
                  clearForm();
                }}
              >
                Back to sign in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

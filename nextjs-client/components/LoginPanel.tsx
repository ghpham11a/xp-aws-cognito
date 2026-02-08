"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/>
    </svg>
  );
}

type AuthView = "signIn" | "signUp" | "confirmSignUp" | "forgotPassword" | "confirmReset";

export default function LoginPanel() {
  const { signIn, signUp, confirmSignUp, resendSignUpCode, resetPassword, confirmResetPassword, signInWithGoogle, signInWithApple } = useAuth();

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

  const handleGoogleSignIn = async () => {
    setSocialLoading("google");
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to sign in with Google");
    } finally {
      setSocialLoading(null);
    }
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
              <button
                type="button"
                className="social-button social-button-google"
                onClick={handleGoogleSignIn}
                disabled={loading || socialLoading !== null}
              >
                <GoogleIcon />
                <span>{socialLoading === "google" ? "Signing in..." : "Google"}</span>
              </button>
              <button
                type="button"
                className="social-button social-button-apple"
                onClick={handleAppleSignIn}
                disabled={loading || socialLoading !== null}
              >
                <AppleIcon />
                <span>{socialLoading === "apple" ? "Signing in..." : "Apple"}</span>
              </button>
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
              <button
                type="button"
                className="social-button social-button-google"
                onClick={handleGoogleSignIn}
                disabled={loading || socialLoading !== null}
              >
                <GoogleIcon />
                <span>{socialLoading === "google" ? "Signing up..." : "Google"}</span>
              </button>
              <button
                type="button"
                className="social-button social-button-apple"
                onClick={handleAppleSignIn}
                disabled={loading || socialLoading !== null}
              >
                <AppleIcon />
                <span>{socialLoading === "apple" ? "Signing up..." : "Apple"}</span>
              </button>
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

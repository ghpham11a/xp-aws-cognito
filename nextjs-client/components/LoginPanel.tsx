"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

type AuthView = "signIn" | "signUp" | "confirmSignUp" | "forgotPassword" | "confirmReset";

export default function LoginPanel() {
  const { signIn, signUp, confirmSignUp, resendSignUpCode, resetPassword, confirmResetPassword } = useAuth();

  const [view, setView] = useState<AuthView>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const clearForm = () => {
    setPassword("");
    setConfirmPassword("");
    setCode("");
    setNewPassword("");
    setError("");
    setMessage("");
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

"use client";

import { FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { FormMessage } from "@/components/ui";
import { VALIDATION } from "@/config";
import type { AuthView } from "../types";

interface ResetPasswordFormProps {
  email: string;
  code: string;
  newPassword: string;
  loading: boolean;
  error: string;
  message: string;
  onCodeChange: (code: string) => void;
  onNewPasswordChange: (password: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setView: (view: AuthView) => void;
  setMessage: (message: string) => void;
  clearForm: () => void;
}

export function ResetPasswordForm({
  email,
  code,
  newPassword,
  loading,
  error,
  message,
  onCodeChange,
  onNewPasswordChange,
  setLoading,
  setError,
  setView,
  setMessage,
  clearForm,
}: ResetPasswordFormProps) {
  const { confirmResetPassword } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
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
    <>
      <h2>Set New Password</h2>
      <p className="auth-description">
        Enter the code sent to {email} and your new password
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="reset-code">Reset Code</label>
          <input
            id="reset-code"
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
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
            onChange={(e) => onNewPasswordChange(e.target.value)}
            required
            autoComplete="new-password"
            minLength={VALIDATION.MIN_PASSWORD_LENGTH}
          />
        </div>
        {error && <FormMessage type="error">{error}</FormMessage>}
        {message && <FormMessage type="success">{message}</FormMessage>}
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
  );
}

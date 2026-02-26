"use client";

import { FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { FormMessage } from "@/components/ui";
import type { AuthView } from "../types";

interface ForgotPasswordFormProps {
  email: string;
  loading: boolean;
  error: string;
  onEmailChange: (email: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setView: (view: AuthView) => void;
  setMessage: (message: string) => void;
  clearForm: () => void;
}

export function ForgotPasswordForm({
  email,
  loading,
  error,
  onEmailChange,
  setLoading,
  setError,
  setView,
  setMessage,
  clearForm,
}: ForgotPasswordFormProps) {
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
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

  return (
    <>
      <h2>Reset Password</h2>
      <p className="auth-description">
        Enter your email to receive a password reset code
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="reset-email">Email</label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        {error && <FormMessage type="error">{error}</FormMessage>}
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
  );
}

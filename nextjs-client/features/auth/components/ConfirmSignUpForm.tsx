"use client";

import { FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { FormMessage } from "@/components/ui";
import type { AuthView } from "../types";

interface ConfirmSignUpFormProps {
  email: string;
  code: string;
  loading: boolean;
  error: string;
  message: string;
  onCodeChange: (code: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setView: (view: AuthView) => void;
  setMessage: (message: string) => void;
  clearForm: () => void;
}

export function ConfirmSignUpForm({
  email,
  code,
  loading,
  error,
  message,
  onCodeChange,
  setLoading,
  setError,
  setView,
  setMessage,
  clearForm,
}: ConfirmSignUpFormProps) {
  const { confirmSignUp, resendSignUpCode } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
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

  return (
    <>
      <h2>Confirm Your Account</h2>
      <p className="auth-description">
        Enter the confirmation code sent to {email}
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="confirm-code">Confirmation Code</label>
          <input
            id="confirm-code"
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            required
            autoComplete="one-time-code"
          />
        </div>
        {error && <FormMessage type="error">{error}</FormMessage>}
        {message && <FormMessage type="success">{message}</FormMessage>}
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
  );
}

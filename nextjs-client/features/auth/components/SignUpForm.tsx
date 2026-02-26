"use client";

import { FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { FormMessage } from "@/components/ui";
import { VALIDATION } from "@/config";
import type { AuthView } from "../types";

interface SignUpFormProps {
  email: string;
  password: string;
  confirmPassword: string;
  loading: boolean;
  error: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (password: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setView: (view: AuthView) => void;
  setMessage: (message: string) => void;
  clearForm: () => void;
}

export function SignUpForm({
  email,
  password,
  confirmPassword,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  setLoading,
  setError,
  setView,
  setMessage,
  clearForm,
}: SignUpFormProps) {
  const { signUp } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
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

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
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
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          autoComplete="new-password"
          minLength={VALIDATION.MIN_PASSWORD_LENGTH}
        />
      </div>
      <div className="form-field">
        <label htmlFor="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      {error && <FormMessage type="error">{error}</FormMessage>}
      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? "Creating account..." : "Sign Up"}
      </button>
    </form>
  );
}

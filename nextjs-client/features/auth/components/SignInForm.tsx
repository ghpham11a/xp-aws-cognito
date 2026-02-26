"use client";

import { FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { FormMessage } from "@/components/ui";
import type { AuthView } from "../types";

interface SignInFormProps {
  email: string;
  password: string;
  loading: boolean;
  error: string;
  message: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setView: (view: AuthView) => void;
  setMessage: (message: string) => void;
}

export function SignInForm({
  email,
  password,
  loading,
  error,
  message,
  onEmailChange,
  onPasswordChange,
  setLoading,
  setError,
  setView,
  setMessage,
}: SignInFormProps) {
  const { signIn } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
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

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
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
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      {error && <FormMessage type="error">{error}</FormMessage>}
      {message && <FormMessage type="success">{message}</FormMessage>}
      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

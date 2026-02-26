"use client";

import { useState, useCallback } from "react";
import type { AuthFormState, FormHandlers } from "../types";

export function useAuthForm(): AuthFormState & FormHandlers {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);

  const clearForm = useCallback(() => {
    setPassword("");
    setConfirmPassword("");
    setCode("");
    setNewPassword("");
    setError("");
    setMessage("");
  }, []);

  return {
    email,
    password,
    confirmPassword,
    code,
    newPassword,
    loading,
    error,
    message,
    socialLoading,
    setEmail,
    setPassword,
    setConfirmPassword,
    setCode,
    setNewPassword,
    setLoading,
    setError,
    setMessage,
    setSocialLoading,
    clearForm,
  };
}

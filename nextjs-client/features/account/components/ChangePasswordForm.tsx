"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { FormMessage } from "@/components/ui";
import { VALIDATION } from "@/config";

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const { updatePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < VALIDATION.MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setLoading(true);

    try {
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess?.();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="change-password-form">
      <div className="form-field">
        <label htmlFor="current-password">Current Password</label>
        <input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
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
          minLength={VALIDATION.MIN_PASSWORD_LENGTH}
        />
      </div>
      <div className="form-field">
        <label htmlFor="confirm-new-password">Confirm New Password</label>
        <input
          id="confirm-new-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      {error && <FormMessage type="error">{error}</FormMessage>}
      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}

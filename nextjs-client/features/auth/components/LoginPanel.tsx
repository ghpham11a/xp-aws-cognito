"use client";

import { useState } from "react";
import type { AuthView } from "../types";
import { useAuthForm } from "../hooks";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { ConfirmSignUpForm } from "./ConfirmSignUpForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { SocialAuthButtons } from "./SocialAuthButtons";

export function LoginPanel() {
  const [view, setView] = useState<AuthView>("signIn");
  const form = useAuthForm();

  return (
    <div className="login-panel">
      <div className="auth-card">
        {view === "signIn" && (
          <>
            <h2>Sign In</h2>
            <SignInForm
              email={form.email}
              password={form.password}
              loading={form.loading}
              error={form.error}
              message={form.message}
              onEmailChange={form.setEmail}
              onPasswordChange={form.setPassword}
              setLoading={form.setLoading}
              setError={form.setError}
              setView={setView}
              setMessage={form.setMessage}
            />
            <SocialAuthButtons
              loading={form.loading}
              socialLoading={form.socialLoading}
              setSocialLoading={form.setSocialLoading}
              setError={form.setError}
            />
            <div className="auth-links">
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setView("forgotPassword");
                  form.clearForm();
                }}
              >
                Forgot password?
              </button>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setView("signUp");
                  form.clearForm();
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
            <SignUpForm
              email={form.email}
              password={form.password}
              confirmPassword={form.confirmPassword}
              loading={form.loading}
              error={form.error}
              onEmailChange={form.setEmail}
              onPasswordChange={form.setPassword}
              onConfirmPasswordChange={form.setConfirmPassword}
              setLoading={form.setLoading}
              setError={form.setError}
              setView={setView}
              setMessage={form.setMessage}
              clearForm={form.clearForm}
            />
            <SocialAuthButtons
              loading={form.loading}
              socialLoading={form.socialLoading}
              setSocialLoading={form.setSocialLoading}
              setError={form.setError}
            />
            <div className="auth-links">
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setView("signIn");
                  form.clearForm();
                }}
              >
                Already have an account? Sign in
              </button>
            </div>
          </>
        )}

        {view === "confirmSignUp" && (
          <ConfirmSignUpForm
            email={form.email}
            code={form.code}
            loading={form.loading}
            error={form.error}
            message={form.message}
            onCodeChange={form.setCode}
            setLoading={form.setLoading}
            setError={form.setError}
            setView={setView}
            setMessage={form.setMessage}
            clearForm={form.clearForm}
          />
        )}

        {view === "forgotPassword" && (
          <ForgotPasswordForm
            email={form.email}
            loading={form.loading}
            error={form.error}
            onEmailChange={form.setEmail}
            setLoading={form.setLoading}
            setError={form.setError}
            setView={setView}
            setMessage={form.setMessage}
            clearForm={form.clearForm}
          />
        )}

        {view === "confirmReset" && (
          <ResetPasswordForm
            email={form.email}
            code={form.code}
            newPassword={form.newPassword}
            loading={form.loading}
            error={form.error}
            message={form.message}
            onCodeChange={form.setCode}
            onNewPasswordChange={form.setNewPassword}
            setLoading={form.setLoading}
            setError={form.setError}
            setView={setView}
            setMessage={form.setMessage}
            clearForm={form.clearForm}
          />
        )}
      </div>
    </div>
  );
}

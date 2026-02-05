"use client";

import { useAuth } from "@/lib/auth-context";
import Navigation from "./Navigation";

export default function AppHeader() {
  const { authStatus } = useAuth();
  const isAuthenticated = authStatus === "authenticated";

  return (
    <>
      <header className="app-header">
        <h1 className="app-title">AWS Cognito Auth Demo</h1>
        {isAuthenticated && <span className="auth-status">Logged In</span>}
      </header>
      <Navigation />
    </>
  );
}

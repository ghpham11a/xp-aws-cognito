"use client";

import { useAuth } from "@/lib/auth-context";
import LoginPanel from "./LoginPanel";
import LoadingSpinner from "./LoadingSpinner";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { authStatus } = useAuth();

  if (authStatus === "configuring") {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  if (authStatus === "unauthenticated") {
    return <LoginPanel />;
  }

  return <>{children}</>;
}

"use client";

import { useAuth } from "@/lib/auth";
import { LoadingSpinner } from "@/components/ui";
import { LoginPanel } from "./LoginPanel";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { authStatus } = useAuth();

  if (authStatus === "configuring") {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  if (authStatus === "unauthenticated") {
    return <LoginPanel />;
  }

  return <>{children}</>;
}

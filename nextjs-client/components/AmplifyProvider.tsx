"use client";

import { configureAmplify } from "@/lib/amplify-config";
import { AuthProvider } from "@/lib/auth-context";

configureAmplify();

interface AmplifyProviderProps {
  children: React.ReactNode;
}

export default function AmplifyProvider({ children }: AmplifyProviderProps) {
  return <AuthProvider>{children}</AuthProvider>;
}

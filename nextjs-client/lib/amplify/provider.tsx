"use client";

import { configureAmplify } from "./config";
import { AuthProvider } from "@/lib/auth";

configureAmplify();

interface AmplifyProviderProps {
  children: React.ReactNode;
}

export default function AmplifyProvider({ children }: AmplifyProviderProps) {
  return <AuthProvider>{children}</AuthProvider>;
}

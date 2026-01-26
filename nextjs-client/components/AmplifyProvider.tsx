"use client";

import { configureAmplify } from "@/lib/amplify-config";
import { Authenticator } from "@aws-amplify/ui-react";

configureAmplify();

interface AmplifyProviderProps {
  children: React.ReactNode;
}

export default function AmplifyProvider({ children }: AmplifyProviderProps) {
  return <Authenticator.Provider>{children}</Authenticator.Provider>;
}

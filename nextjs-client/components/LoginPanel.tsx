"use client";

import { Authenticator } from "@aws-amplify/ui-react";

export default function LoginPanel() {
  return (
    <div className="login-panel">
      <Authenticator />
    </div>
  );
}

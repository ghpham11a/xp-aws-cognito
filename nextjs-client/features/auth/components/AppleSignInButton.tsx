"use client";

import { useEffect, useState } from "react";
import { env, EXTERNAL_SCRIPTS } from "@/config";
import { AppleIcon } from "@/components/icons";

interface AppleSignInButtonProps {
  onSuccess: (
    idToken: string,
    code: string,
    email?: string,
    name?: string
  ) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export function AppleSignInButton({
  onSuccess,
  onError,
  disabled,
}: AppleSignInButtonProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if Apple Sign In is already loaded and ready
    if (window.AppleID?.auth) {
      setScriptLoaded(true);
      return;
    }

    // Check if script element exists but hasn't finished loading
    const existingScript = document.querySelector(
      `script[src="${EXTERNAL_SCRIPTS.APPLE_AUTH}"]`
    );
    if (existingScript) {
      // Script exists but not ready - poll for window.AppleID
      const checkApple = setInterval(() => {
        if (window.AppleID?.auth) {
          clearInterval(checkApple);
          setScriptLoaded(true);
        }
      }, 50);
      return () => clearInterval(checkApple);
    }

    const script = document.createElement("script");
    script.src = EXTERNAL_SCRIPTS.APPLE_AUTH;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => onError("Failed to load Apple Sign-In");
    document.body.appendChild(script);
  }, [onError]);

  useEffect(() => {
    if (!scriptLoaded || !window.AppleID) return;

    const clientId = env.appleClientId;
    const redirectURI = env.appleRedirectUri;

    if (!clientId) {
      console.warn("Apple Client ID not configured");
      return;
    }

    try {
      window.AppleID.auth.init({
        clientId,
        scope: "name email",
        redirectURI,
        usePopup: true,
      });
    } catch (e) {
      console.error("Failed to initialize Apple Sign-In:", e);
    }
  }, [scriptLoaded]);

  const handleClick = async () => {
    if (!window.AppleID || disabled || isLoading) return;

    setIsLoading(true);
    try {
      const response = await window.AppleID.auth.signIn();

      const idToken = response.authorization.id_token;
      const code = response.authorization.code;
      const email = response.user?.email;
      const name = response.user?.name
        ? `${response.user.name.firstName || ""} ${response.user.name.lastName || ""}`.trim()
        : undefined;

      onSuccess(idToken, code, email, name);
    } catch (e: unknown) {
      const error = e as { error?: string };
      if (error.error === "popup_closed_by_user") {
        // User cancelled - don't show error
      } else {
        onError(error.error || "Apple Sign-In failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading || !scriptLoaded}
      className="social-button social-button-apple"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "300px",
        backgroundColor: "#000",
        color: "#fff",
        border: "1px solid #000",
        borderRadius: "4px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontSize: "14px",
        fontWeight: 500,
      }}
    >
      <AppleIcon />
      <span>{isLoading ? "Signing in..." : "Continue with Apple"}</span>
    </button>
  );
}

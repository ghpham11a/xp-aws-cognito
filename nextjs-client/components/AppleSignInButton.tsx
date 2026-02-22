"use client";

import { useEffect, useRef, useState } from "react";

interface AppleSignInButtonProps {
  onSuccess: (idToken: string, code: string, email?: string, name?: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            id_token: string;
            code: string;
          };
          user?: {
            email?: string;
            name?: {
              firstName?: string;
              lastName?: string;
            };
          };
        }>;
      };
    };
  }
}

export default function AppleSignInButton({ onSuccess, onError, disabled }: AppleSignInButtonProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const APPLE_SCRIPT_URL = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

    // Check if Apple Sign In is already loaded and ready
    if (window.AppleID?.auth) {
      setScriptLoaded(true);
      return;
    }

    // Check if script element exists but hasn't finished loading
    const existingScript = document.querySelector(`script[src="${APPLE_SCRIPT_URL}"]`);
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
    script.src = APPLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => onError("Failed to load Apple Sign-In");
    document.body.appendChild(script);
  }, [onError]);

  useEffect(() => {
    if (!scriptLoaded || !window.AppleID) return;

    const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID; // This is your Services ID
    const redirectURI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || window.location.origin;

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

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/>
    </svg>
  );
}

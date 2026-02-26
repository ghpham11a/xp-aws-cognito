"use client";

import { useEffect, useRef, useState } from "react";
import { env, EXTERNAL_SCRIPTS } from "@/config";
import { GoogleIcon } from "@/components/icons";

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string, email?: string, name?: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  disabled,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if Google Identity Services is already loaded and ready
    if (window.google?.accounts?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScriptLoaded(true);
      return;
    }

    // Check if script element exists but hasn't finished loading
    const existingScript = document.querySelector(
      `script[src="${EXTERNAL_SCRIPTS.GOOGLE_IDENTITY}"]`
    );
    if (existingScript) {
      // Script exists but not ready - poll for window.google
      const checkGoogle = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkGoogle);
          setScriptLoaded(true);
        }
      }, 50);
      return () => clearInterval(checkGoogle);
    }

    const script = document.createElement("script");
    script.src = EXTERNAL_SCRIPTS.GOOGLE_IDENTITY;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => onError("Failed to load Google Sign-In");
    document.body.appendChild(script);
  }, [onError]);

  useEffect(() => {
    if (!scriptLoaded || !buttonRef.current || !window.google) return;

    const clientId = env.googleClientId;
    if (!clientId) {
      onError("Google Client ID not configured");
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            // Decode the JWT to get user info
            const payload = JSON.parse(atob(response.credential.split(".")[1]));
            onSuccess(response.credential, payload.email, payload.name);
          } else {
            onError("No credential received");
          }
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        text: "continue_with",
        shape: "rectangular",
        width: 400,
      });
    } catch (e) {
      onError(
        e instanceof Error ? e.message : "Failed to initialize Google Sign-In"
      );
    }
  }, [scriptLoaded, onSuccess, onError]);

  if (disabled) {
    return (
      <button
        type="button"
        className="social-button social-button-google"
        disabled
        style={{ opacity: 0.5, cursor: "not-allowed" }}
      >
        <GoogleIcon />
        <span>Google</span>
      </button>
    );
  }

  return (
    <div
      ref={buttonRef}
      style={{ display: "flex", justifyContent: "center", width: "100%" }}
    />
  );
}

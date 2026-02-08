"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service in production
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="error-container">
      <div className="error-card">
        <h1>Something went wrong</h1>
        <p>
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>
        {process.env.NODE_ENV === "development" && (
          <details className="error-details">
            <summary>Error details</summary>
            <pre>{error.message}</pre>
            {error.stack && <pre>{error.stack}</pre>}
          </details>
        )}
        <div className="error-actions">
          <button onClick={reset} className="auth-button">
            Try again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="link-button"
          >
            Go to homepage
          </button>
        </div>
      </div>
    </div>
  );
}

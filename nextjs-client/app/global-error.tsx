"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            backgroundColor: "#0a0a0a",
            color: "#ededed",
          }}
        >
          <div
            style={{
              maxWidth: "500px",
              textAlign: "center",
            }}
          >
            <h1 style={{ marginBottom: "1rem" }}>Something went wrong</h1>
            <p style={{ marginBottom: "2rem", color: "#888" }}>
              A critical error occurred. Please try refreshing the page.
            </p>
            {process.env.NODE_ENV === "development" && (
              <pre
                style={{
                  textAlign: "left",
                  padding: "1rem",
                  background: "#1f2937",
                  borderRadius: "0.5rem",
                  overflow: "auto",
                  marginBottom: "2rem",
                  fontSize: "0.875rem",
                }}
              >
                {error.message}
              </pre>
            )}
            <button
              onClick={reset}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

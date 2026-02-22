"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6969";

interface MessageResponse {
  message: string;
  authenticated: boolean;
}

export default function HomeContent() {
  const [publicMessage, setPublicMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPublicMessage() {
      try {
        const response = await fetch(`${API_URL}/messages/public`);
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        const data: MessageResponse = await response.json();
        setPublicMessage(data.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load message");
      } finally {
        setLoading(false);
      }
    }

    fetchPublicMessage();
  }, []);

  return (
    <div className="home-content">
      <div className="server-message-card">
        <h3>Server Message</h3>
        {loading && <p className="loading">Loading...</p>}
        {error && <p className="error">{error}</p>}
        {publicMessage && <p className="message">{publicMessage}</p>}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getPublicMessage } from "@/lib/api";

export function HomeContent() {
  const [publicMessage, setPublicMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPublicMessage() {
      try {
        const data = await getPublicMessage();
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

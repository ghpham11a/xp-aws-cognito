"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import LoadingSpinner from "./LoadingSpinner";

interface MessageResponse {
  message: string;
  authenticated: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6969";

export default function DashboardContent() {
  const { user, getIdToken } = useAuth();
  const [privateMessage, setPrivateMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initDashboard() {
      try {
        const token = await getIdToken();

        if (!token) {
          setError("No auth token available. Please sign in again.");
          setLoading(false);
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // Sync user to backend (creates user record if doesn't exist)
        const userResponse = await fetch(`${API_URL}/users/me`, { headers });
        if (!userResponse.ok && userResponse.status !== 404) {
          console.warn("Failed to sync user:", userResponse.status);
        }

        // Fetch private message
        const messageResponse = await fetch(`${API_URL}/messages/private`, {
          headers,
        });
        if (messageResponse.ok) {
          const messageData: MessageResponse = await messageResponse.json();
          setPrivateMessage(messageData.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load feed");
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, [getIdToken]);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <div className="dashboard-content">

      <div className="server-message-card">
        <h3>Server Message</h3>
        {privateMessage && <p className="message">{privateMessage}</p>}
      </div>
    </div>
  );
}

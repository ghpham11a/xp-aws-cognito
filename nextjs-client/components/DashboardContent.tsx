"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchAuthSession } from "aws-amplify/auth";
import LoadingSpinner from "./LoadingSpinner";

interface FeedItem {
  id: string;
  title: string;
  content: string;
  type: string;
}

interface MessageResponse {
  message: string;
  authenticated: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6969";

export default function DashboardContent() {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [privateMessage, setPrivateMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initDashboard() {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();

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

        // Fetch feed items
        const response = await fetch(`${API_URL}/feed`, { headers });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Your session has expired. Please sign in again.");
          } else {
            setError(`Failed to fetch feed: ${response.status}`);
          }
          return;
        }

        const data = await response.json();
        setFeedItems(data);

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
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <div className="dashboard-content">
      <h1>Dashboard</h1>
      <div className="welcome-card">
        <h2>Welcome, {user?.signInDetails?.loginId || "User"}!</h2>
        <p>You have successfully authenticated with AWS Cognito.</p>
      </div>

      <div className="server-message-card">
        <h3>Server Message</h3>
        {privateMessage && <p className="message">{privateMessage}</p>}
      </div>

      <div className="feed-section">
        <h3>Your Feed</h3>
        {error && <p className="feed-error">{error}</p>}
        {!error && feedItems.length === 0 && (
          <p className="feed-empty">No items in your feed.</p>
        )}
        <div className="feed-list">
          {feedItems.map((item) => (
            <div key={item.id} className={`feed-item feed-item-${item.type}`}>
              <span className="feed-item-type">{item.type}</span>
              <h4>{item.title}</h4>
              <p>{item.content}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-stats">
        <h3>Your Account Info</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="label">User ID:</span>
            <span className="value">{user?.userId || "N/A"}</span>
          </div>
          <div className="info-item">
            <span className="label">Username:</span>
            <span className="value">
              {user?.signInDetails?.loginId || "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

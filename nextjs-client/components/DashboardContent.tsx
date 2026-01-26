"use client";

import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { fetchAuthSession } from "aws-amplify/auth";

interface FeedItem {
  id: string;
  title: string;
  content: string;
  type: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6969";

export default function DashboardContent() {
  const { user } = useAuthenticator((context) => [context.user]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initDashboard() {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();

        if (!token) {
          setError("No auth token available");
          setLoading(false);
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // Sync user to backend (creates user record if doesn't exist)
        await fetch(`${API_URL}/users/me`, { headers });

        // Fetch feed items
        const response = await fetch(`${API_URL}/feed`, { headers });

        if (!response.ok) {
          throw new Error(`Failed to fetch feed: ${response.status}`);
        }

        const data = await response.json();
        setFeedItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load feed");
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, []);

  return (
    <div className="dashboard-content">
      <h1>Dashboard</h1>
      <div className="welcome-card">
        <h2>Welcome, {user?.signInDetails?.loginId || "User"}!</h2>
        <p>You have successfully authenticated with AWS Cognito.</p>
      </div>

      <div className="feed-section">
        <h3>Your Feed</h3>
        {loading && <p className="feed-loading">Loading feed...</p>}
        {error && <p className="feed-error">{error}</p>}
        {!loading && !error && feedItems.length === 0 && (
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

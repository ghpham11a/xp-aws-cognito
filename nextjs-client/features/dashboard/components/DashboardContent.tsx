"use client";

import { LoadingSpinner } from "@/components/ui";
import { useDashboardData } from "../hooks";

export function DashboardContent() {
  const { privateMessage, loading, error } = useDashboardData();

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="dashboard-content">
        <div className="server-message-card">
          <h3>Error</h3>
          <p className="error">{error}</p>
        </div>
      </div>
    );
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

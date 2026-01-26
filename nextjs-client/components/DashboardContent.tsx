"use client";

import { useAuthenticator } from "@aws-amplify/ui-react";

export default function DashboardContent() {
  const { user } = useAuthenticator((context) => [context.user]);

  return (
    <div className="dashboard-content">
      <h1>Dashboard</h1>
      <div className="welcome-card">
        <h2>Welcome, {user?.signInDetails?.loginId || "User"}!</h2>
        <p>You have successfully authenticated with AWS Cognito.</p>
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
      <div className="authorized-content">
        <h3>Authorized Content</h3>
        <p>
          This content is only visible to authenticated users. You can add any
          protected features or data here.
        </p>
      </div>
    </div>
  );
}

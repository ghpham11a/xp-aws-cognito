"use client";

import { useAuthenticator, AccountSettings } from "@aws-amplify/ui-react";

export default function UserManagement() {
  const { user, signOut } = useAuthenticator((context) => [
    context.user,
    context.signOut,
  ]);

  return (
    <div className="user-management">
      <h1>Account Settings</h1>

      <div className="profile-section">
        <h2>Profile Information</h2>
        <div className="profile-info">
          <div className="info-row">
            <span className="label">Email:</span>
            <span className="value">
              {user?.signInDetails?.loginId || "N/A"}
            </span>
          </div>
          <div className="info-row">
            <span className="label">User ID:</span>
            <span className="value">{user?.userId || "N/A"}</span>
          </div>
        </div>
      </div>

      <div className="password-section">
        <h2>Change Password</h2>
        <AccountSettings.ChangePassword onSuccess={() => alert("Password changed successfully!")} />
      </div>

      <div className="signout-section">
        <h2>Sign Out</h2>
        <p>End your current session and sign out of your account.</p>
        <button onClick={signOut} className="signout-button">
          Sign Out
        </button>
      </div>
    </div>
  );
}

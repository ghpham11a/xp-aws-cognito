"use client";

export default function HomeContent() {
  return (
    <div className="home-content">
      <h1>Welcome to AWS Cognito Auth Demo</h1>
      <p>
        This application demonstrates AWS Cognito authentication with Next.js
        and AWS Amplify.
      </p>
      <div className="features">
        <h2>Features</h2>
        <ul>
          <li>User sign-up and sign-in</li>
          <li>Password management</li>
          <li>MFA (Multi-Factor Authentication) support</li>
          <li>Protected routes and content</li>
        </ul>
      </div>
      <div className="instructions">
        <h2>Getting Started</h2>
        <p>
          Navigate to the <strong>Dashboard</strong> or <strong>Account</strong>{" "}
          tab to sign in or create an account.
        </p>
      </div>
    </div>
  );
}

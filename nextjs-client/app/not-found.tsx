import Link from "next/link";

export default function NotFound() {
  return (
    <div className="error-container">
      <div className="error-card">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist or has been moved.</p>
        <div className="error-actions">
          <Link href="/" className="auth-button">
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

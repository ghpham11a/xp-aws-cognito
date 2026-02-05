export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner" aria-label="Loading" />
      <p className="loading-message">{message}</p>
    </div>
  );
}

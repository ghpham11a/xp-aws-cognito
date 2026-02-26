interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="loading-container">
      <div className="loading-spinner" aria-label="Loading" />
      <p className="loading-message">{message}</p>
    </div>
  );
}

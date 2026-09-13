export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-message" role="alert">
      <strong>Something went wrong</strong>
      <span>{message}</span>
      {onRetry ? (
        <button className="button button-secondary" type="button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

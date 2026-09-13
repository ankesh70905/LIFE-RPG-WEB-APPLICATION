import { useToast } from "../context/ToastContext.jsx";

const toastIcons = {
  success: "✓",
  error: "!",
  achievement: "🏆",
  info: "✦"
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div className={`toast toast-${toast.type}`} key={toast.id} role="status">
          <span className="toast-icon" aria-hidden="true">
            {toastIcons[toast.type] || toastIcons.info}
          </span>
          <span>{toast.message}</span>
          <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

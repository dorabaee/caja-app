import { CheckCircle2, Info, AlertCircle } from "lucide-react";
import { useUI } from "@core/store";
import { cn } from "./cn";
import styles from "./ToastHost.module.css";

const ICONS = {
  success: CheckCircle2,
  info: Info,
  error: AlertCircle,
} as const;

export function ToastHost() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);
  if (!toasts.length) return null;

  return (
    <div className={styles.host} role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <button
            key={t.id}
            type="button"
            className={cn(styles.toast, styles[t.tone])}
            onClick={() => dismiss(t.id)}
          >
            <Icon className={styles.icon} size={18} aria-hidden />
            <span>{t.message}</span>
          </button>
        );
      })}
    </div>
  );
}

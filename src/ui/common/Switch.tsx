import { cn } from "./cn";
import styles from "./Switch.module.css";

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export function Switch({ checked, onChange, id, disabled, "aria-label": ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(styles.track, checked && styles.on)}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} aria-hidden="true" />
    </button>
  );
}

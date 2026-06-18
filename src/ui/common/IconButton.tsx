import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import styles from "./IconButton.module.css";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — required, since the button has no visible text. */
  label: string;
  icon: ReactNode;
  size?: "sm" | "md";
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, size = "md", active, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={cn(styles.btn, styles[size], active && styles.active, className)}
      {...rest}
    >
      {icon}
    </button>
  );
});

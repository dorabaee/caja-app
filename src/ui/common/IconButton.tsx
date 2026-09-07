import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import styles from "./IconButton.module.css";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — required, since the button has no visible text. */
  label: string;
  icon: ReactNode;
  size?: "sm" | "md";
  active?: boolean;
  /** "info" paints the classic blue help affordance (outline + tint + blue glyph). */
  tone?: "default" | "info";
  /** Keep long edge tooltips inside narrow containers such as the sidebar. */
  tooltipAlign?: "center" | "start" | "end";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, size = "md", active, tone = "default", tooltipAlign = "center", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      data-tooltip={label}
      data-tooltip-align={tooltipAlign}
      aria-pressed={active || undefined}
      className={cn(
        styles.btn,
        styles[size],
        active && styles.active,
        tone === "info" && styles.info,
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
});

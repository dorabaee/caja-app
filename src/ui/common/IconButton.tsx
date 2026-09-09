import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import { Tooltip } from "./Tooltip";
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
  /** Render the tooltip in a body portal so overflow-hidden parents cannot crop it. */
  portalTooltip?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, size = "md", active, tone = "default", tooltipAlign = "center", portalTooltip = false, className, type = "button", ...rest },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      data-tooltip={!portalTooltip ? label : undefined}
      data-tooltip-align={!portalTooltip ? tooltipAlign : undefined}
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
  return portalTooltip ? <Tooltip label={label} side="bottom">{button}</Tooltip> : button;
});

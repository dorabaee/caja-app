import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";
import styles from "./SegmentedControl.module.css";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string | number> {
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
  "aria-label": string;
  variant?: "rounded" | "pill";
  className?: string;
}

/** Shared moving-thumb control used anywhere one choice is selected from a short list. */
export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  variant = "rounded",
  className,
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <div
      className={cn(styles.root, variant === "pill" && styles.pill, className)}
      role="group"
      aria-label={ariaLabel}
      style={
        {
          "--segment-count": options.length,
          "--active-index": activeIndex,
        } as CSSProperties
      }
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(styles.option, selected && styles.optionOn)}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
          >
            {option.icon && <span className={styles.icon}>{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

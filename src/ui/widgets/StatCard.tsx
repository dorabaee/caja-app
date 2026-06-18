import { type ReactNode } from "react";
import { cn } from "@ui/common";
import styles from "./statCard.module.css";

export type StatTone = "accent" | "income" | "expense" | "plain";

/** A quiet KPI tile: small label + big Geist-Mono figure, optional sub-line. */
export function StatCard({
  label,
  value,
  tone = "plain",
  icon,
  sub,
}: {
  label: string;
  value: string;
  tone?: StatTone;
  icon?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className={cn(styles.stat, styles[tone])}>
      <div className={styles.statHead}>
        {icon && (
          <span className={styles.statIcon} aria-hidden>
            {icon}
          </span>
        )}
        <span className={styles.statLabel}>{label}</span>
      </div>
      <div className={cn(styles.statValue, "tnum")}>{value}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Scale, Check, Target } from "lucide-react";
import type { MonthlyTotals } from "@core/compute";
import { cn } from "@ui/common";
import { useFormat } from "@ui/hooks/useFormat";
import styles from "./KpiHero.module.css";

type Tone = "income" | "expense" | "accent";

export function KpiCard({
  label,
  value,
  tone,
  icon,
  footer,
  menu,
}: {
  label: string;
  value: string;
  tone: Tone;
  icon: ReactNode;
  footer?: ReactNode;
  /** Optional control rendered top-right of the card (e.g. the #12 breakdown menu). */
  menu?: ReactNode;
}) {
  return (
    <div className={cn(styles.card, styles[tone])}>
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
        <span className={styles.label}>{label}</span>
        {menu && <span className={styles.menu}>{menu}</span>}
      </div>
      <div className={cn(styles.value, "tnum")}>{value}</div>
      {footer}
    </div>
  );
}

function GoalProgress({ value, target }: { value: number; target: number }) {
  const fmt = useFormat();
  const { t } = useTranslation();
  const ratio = value / target;
  const reached = value >= target;
  const width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  return (
    <div className={styles.goal}>
      <div className={styles.goalTrack}>
        <div className={styles.goalFill} style={{ width }} />
      </div>
      <div className={styles.goalCaption}>
        <span className={styles.goalMeta}>
          <Target size={12} aria-hidden /> {t("month.goal")} {fmt.money(target)}
        </span>
        <span className={cn("tnum", styles.goalPct)}>
          {reached ? (
            <>
              <Check size={12} aria-hidden /> {t("month.goalReached")}
            </>
          ) : (
            fmt.percent(Math.max(0, ratio))
          )}
        </span>
      </div>
    </div>
  );
}

export function KpiHero({
  totals,
  goal,
  labels,
  menus,
}: {
  totals: MonthlyTotals;
  /** Optional monthly profit target — renders progress under the "Te queda" card. */
  goal?: number;
  labels?: { entro: string; salio: string; teQueda: string };
  /** Optional per-card controls (the #12 breakdown menus on Entró / Salió, and the
   *  "Te queda" ↔ "Saldo final" toggle on the third card). */
  menus?: { entro?: ReactNode; salio?: ReactNode; teQueda?: ReactNode };
}) {
  const fmt = useFormat();
  const { t } = useTranslation();
  const resolved = labels ?? {
    entro: t("month.entro"),
    salio: t("month.salio"),
    teQueda: t("month.teQueda"),
  };
  return (
    <div className={styles.hero}>
      <KpiCard
        label={resolved.entro}
        tone="income"
        icon={<TrendingUp size={16} />}
        value={fmt.money(totals.entro)}
        menu={menus?.entro}
      />
      <KpiCard
        label={resolved.salio}
        tone="expense"
        icon={<TrendingDown size={16} />}
        value={fmt.money(totals.salio)}
        menu={menus?.salio}
      />
      <KpiCard
        label={resolved.teQueda}
        tone="accent"
        icon={<Scale size={16} />}
        value={fmt.money(totals.teQueda)}
        menu={menus?.teQueda}
        footer={goal != null && goal > 0 ? <GoalProgress value={totals.teQueda} target={goal} /> : undefined}
      />
    </div>
  );
}

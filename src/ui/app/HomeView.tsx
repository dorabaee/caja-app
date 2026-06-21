import { Building2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { yearlyResumen } from "@core/compute";
import { useStore, useUI } from "@core/store";
import { cn } from "@ui/common";
import { useFormat } from "@ui/hooks/useFormat";
import styles from "./HomeView.module.css";

/** Tiny inline sparkline of a project's monthly "Te queda" (no recharts). */
function Sparkline({ values }: { values: number[] }) {
  const w = 120;
  const h = 34;
  const pad = 3;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const n = Math.max(1, values.length - 1);
  const points = values
    .map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / n;
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className={styles.spark} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Businesses launcher: one card per project; click to open it on its board. */
export function HomeView() {
  const { t } = useTranslation();
  const projects = useStore((s) => s.doc.projects);
  const selectProject = useStore((s) => s.selectProject);
  const setMonth = useUI((s) => s.setMonth);
  const monthIndex = useUI((s) => s.monthIndex);
  const editProject = useUI((s) => s.editProject);
  const openModal = useUI((s) => s.openModal);
  const fmt = useFormat();

  const open = (id: string) => {
    selectProject(id);
    setMonth(monthIndex); // sets nav -> "month", opening that business' board
  };
  const createNew = () => {
    editProject(null);
    openModal("newProject");
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.lead}>
        <h1 className={styles.title}>{t("shell.homeTitle")}</h1>
        <p className={styles.subtitle}>{t("shell.homeSubtitle")}</p>
      </header>

      <div className={styles.grid}>
        {projects.map((p) => {
          const { months, totals } = yearlyResumen(p);
          const spark = months.map((m) => m.teQueda);
          return (
            <button key={p.id} type="button" className={styles.card} onClick={() => open(p.id)}>
              <span className={styles.cardHead}>
                <span className={styles.cardIcon} aria-hidden>
                  <Building2 size={18} />
                </span>
                <span className={styles.cardName}>{p.name}</span>
              </span>
              <span className={styles.metricLabel}>{t("month.teQueda")}</span>
              <span className={cn(styles.metric, totals.teQueda < 0 && styles.negative)}>
                {fmt.money(totals.teQueda)}
              </span>
              <span className={styles.sparkWrap}>
                <Sparkline values={spark} />
              </span>
            </button>
          );
        })}

        <button type="button" className={cn(styles.card, styles.newCard)} onClick={createNew}>
          <span className={styles.newIcon} aria-hidden>
            <Plus size={22} />
          </span>
          <span className={styles.newLabel}>{t("shell.newBusiness")}</span>
        </button>
      </div>
    </div>
  );
}

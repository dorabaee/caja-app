import { useEffect } from "react";
import { ArrowDownToLine, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { checkForUpdates, installUpdate, retryRestart, startUpdateCheck, supportsUpdates, useUpdater } from "@platform/tauri/updater";
import styles from "./UpdateButton.module.css";

export function UpdateButton({ collapsed, settings = false }: { collapsed: boolean; settings?: boolean }) {
  const { t } = useTranslation();
  const { phase, version, percent } = useUpdater();
  useEffect(() => { startUpdateCheck(); }, []);
  if (!supportsUpdates()) return null;
  if (!settings && ["idle", "checking", "current", "error"].includes(phase)) return null;
  const busy = ["checking", "downloading", "installing"].includes(phase);
  const label = t(`shell.update.${phase}`, { version, progress: percent == null ? "" : `${percent}%` });
  const action = phase === "available" ? installUpdate : phase === "restart" ? retryRestart : checkForUpdates;
  return (
    <>
      {settings && <p>{t("shell.update.description")}</p>}
      <button type="button" className={styles.button} disabled={busy} title={label} aria-label={label}
        onClick={() => void action()} data-highlight={phase === "available" || phase === "downloading"}>
        {phase === "downloading" && <span className={styles.fill} style={{ width: `${percent ?? 25}%` }} />}
        {busy ? <LoaderCircle size={16} className={styles.spinner} aria-hidden /> : phase === "available" ? <ArrowDownToLine size={16} aria-hidden /> : <RefreshCw size={16} aria-hidden />}
        {!collapsed && <span className={styles.label} aria-live="polite">{label}</span>}
      </button>
      {phase === "installing" && <div className={styles.blocker} role="alert" aria-busy="true">{t("shell.update.installing")}</div>}
    </>
  );
}

import { useEffect } from "react";
import { ArrowDownToLine, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { checkForUpdates, installUpdate, retryRestart, startUpdateCheck, supportsUpdates, useUpdater } from "@platform/tauri/updater";
import styles from "./UpdateButton.module.css";
import { Tooltip } from "@ui/common/Tooltip";
import type { Phase } from "@platform/tauri/updater";

export function UpdateButton({ collapsed, settings = false }: { collapsed: boolean; settings?: boolean }) {
  const { phase, version, percent } = useUpdater();
  useEffect(() => { startUpdateCheck(); }, []);
  if (!supportsUpdates()) return null;
  const action = ["available", "downloadError"].includes(phase) ? installUpdate : phase === "restart" ? retryRestart : checkForUpdates;
  return <UpdateControl collapsed={collapsed} settings={settings} phase={phase} version={version} percent={percent} action={action} />;
}

export function UpdateControl({ collapsed, settings = false, phase, version, percent, action }: {
  collapsed: boolean; settings?: boolean; phase: Phase; version: string; percent: number | null; action: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  if (!settings && ["idle", "checking", "current", "error", "offline"].includes(phase)) return null;
  const busy = ["checking", "downloading", "installing"].includes(phase);
  const label = t(`shell.update.${phase}`, { version, progress: percent == null ? "" : `${percent}%` });
  const button = <button type="button" className={styles.button} disabled={busy} aria-label={label}
    onClick={() => void action()} data-collapsed={collapsed} data-phase={phase} data-highlight={phase === "available" || phase === "downloading"}>
    {phase === "downloading" && <span className={styles.fill} data-indeterminate={percent == null} style={{ width: `${percent ?? 35}%` }} />}
    {busy ? <LoaderCircle size={18} className={styles.spinner} aria-hidden /> : phase === "available" ? <ArrowDownToLine size={18} className={styles.downloadIcon} aria-hidden /> : <RefreshCw size={18} aria-hidden />}
    {!collapsed && <span className={styles.label}>{label}</span>}
    {collapsed && phase === "available" && <span className={styles.dot} />}
    {phase === "downloading" && <span className={styles.track} role="progressbar" aria-label={t("shell.update.downloading", { progress: "" })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined}><span style={{ width: `${percent ?? 35}%` }} data-indeterminate={percent == null} /></span>}
  </button>;
  return (
    <>
      {settings && <p>{t("shell.update.description")}</p>}
      {collapsed ? <Tooltip label={label} side="right">{button}</Tooltip> : button}
      {!settings && phase === "installing" && <div className={styles.blocker} role="alert" aria-busy="true"><LoaderCircle className={styles.spinner} size={30} />{t("shell.update.installing")}</div>}
    </>
  );
}

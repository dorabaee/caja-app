import {
  ChevronRight,
  Plus,
  Undo2,
  Redo2,
  BarChart3,
  LayoutGrid,
  List,
  ZoomIn,
  ZoomOut,
  Wand2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore, useUI } from "@core/store";
import { Button, IconButton } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { autoArrange } from "@ui/util/autoArrange";
import { AddTableMenu } from "./AddTableMenu";
import { ExportMenu } from "./ExportMenu";
import styles from "./TopBar.module.css";

export function TopBar() {
  const { t } = useTranslation();
  const current = useCurrentProject();
  const nav = useUI((s) => s.nav);
  const isMonth = nav === "month";
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const monthIndex = useUI((s) => s.monthIndex);
  const select = useUI((s) => s.select);
  const addChart = useStore((s) => s.addChart);
  const zoom = useUI((s) => s.zoom);
  const zoomIn = useUI((s) => s.zoomIn);
  const zoomOut = useUI((s) => s.zoomOut);
  const resetZoom = useUI((s) => s.resetZoom);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);

  const reacomodar = () => {
    const st = useStore.getState();
    const project =
      st.doc.projects.find((p) => p.id === st.doc.currentProjectId) ?? st.doc.projects[0];
    const month = project?.months[monthIndex];
    if (!month) return;
    const maxWidth = Math.max(960, window.innerWidth - 248 - 48);
    const placed = autoArrange(
      month.tables.map((t) => ({ id: t.id, layout: t.layout })),
      maxWidth,
    );
    for (const t of month.tables) {
      const p = placed[t.id];
      if (p) st.setWidgetLayout(monthIndex, t.id, p);
    }
  };

  const onAddChart = () => {
    const st = useStore.getState();
    const project =
      st.doc.projects.find((p) => p.id === st.doc.currentProjectId) ?? st.doc.projects[0];
    const month = project?.months[monthIndex];
    // Default-link the first regular table (fall back to ledger / unlinked).
    const defaultTable = month?.tables.find((t) => t.kind !== "ledger") ?? month?.tables[0] ?? null;
    select(addChart(monthIndex, defaultTable?.id ?? null));
  };

  const showCanvasTools = isMonth && view === "canvas";

  return (
    <header className={styles.bar}>
      <div className={styles.crumb}>
        <span className={styles.crumbRoot}>{t("shell.businesses")}</span>
        <ChevronRight size={15} className={styles.crumbSep} aria-hidden />
        <h1 className={styles.crumbCurrent}>
          {nav === "allBiz" ? t("shell.allBusinesses") : (current?.name ?? "—")}
        </h1>
      </div>

      {!isMonth && (
        <div className={styles.tools}>
          <ExportMenu />
        </div>
      )}

      {isMonth && (
        <div className={styles.tools}>
          <AddTableMenu
            trigger={
              <Button variant="primary" icon={<Plus />} data-tour="addTable">
                {t("shell.addTable")}
              </Button>
            }
          />

          <Button variant="ghost" icon={<BarChart3 />} onClick={onAddChart}>
            {t("shell.chart")}
          </Button>

          {showCanvasTools && (
            <>
              <span className={styles.divider} aria-hidden />
              <IconButton label={t("shell.rearrangeTables")} icon={<Wand2 />} onClick={reacomodar} />
            </>
          )}

          <span className={styles.divider} aria-hidden />

          <IconButton label={t("shell.undo")} icon={<Undo2 />} onClick={undo} disabled={!canUndo} />
          <IconButton label={t("shell.redo")} icon={<Redo2 />} onClick={redo} disabled={!canRedo} />

          {showCanvasTools && (
            <>
              <span className={styles.divider} aria-hidden />
              <div className={styles.zoom}>
                <IconButton label={t("shell.zoomOut")} icon={<ZoomOut />} size="sm" onClick={zoomOut} />
                <button type="button" className={styles.zoomLabel} onClick={resetZoom} title={t("shell.resetZoom")}>
                  {Math.round(zoom * 100)}%
                </button>
                <IconButton label={t("shell.zoomIn")} icon={<ZoomIn />} size="sm" onClick={zoomIn} />
              </div>
            </>
          )}

          <span className={styles.divider} aria-hidden />

          <div className={styles.segmented} role="group" aria-label={t("shell.view")}>
            <IconButton
              label={t("shell.canvasView")}
              icon={<LayoutGrid />}
              size="sm"
              active={view === "canvas"}
              onClick={() => setView("canvas")}
            />
            <IconButton
              label={t("shell.listView")}
              icon={<List />}
              size="sm"
              active={view === "list"}
              onClick={() => setView("list")}
            />
          </div>
        </div>
      )}
    </header>
  );
}

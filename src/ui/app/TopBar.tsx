import { useRef } from "react";
import {
  ArrowLeft,
  MoreHorizontal,
  Zap,
  ChevronRight,
  Plus,
  Undo2,
  Redo2,
  BarChart3,
  LayoutGrid,
  List,
  ZoomIn,
  ZoomOut,
  Clipboard,
  ClipboardPaste,
  FileStack,
  CalendarPlus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore, useUI } from "@core/store";
import { Button, IconButton, Menu, MenuItem, MenuLabel, MenuSeparator, Popover } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useElementWidth } from "@ui/hooks/useElementWidth";
import { AddTableMenu } from "./AddTableMenu";
import { NewChartMenu } from "./NewChartMenu";
import { ExportMenu } from "./ExportMenu";
import { QuickAddBar } from "./QuickAddBar";
import styles from "./TopBar.module.css";

/**
 * Widths (of the bar itself, so the sidebar's state counts) at which the toolbar sheds
 * weight. Below the last tier the secondary tools live in an overflow menu — nothing is
 * ever allowed to overlap, which is what used to happen once the bar ran out of room.
 */
const TIER_CHART_ICON = 1280;
const TIER_QUICK_ADD = 1120;
const TIER_OVERFLOW = 1000;

export function TopBar() {
  const { t } = useTranslation();
  const barRef = useRef<HTMLElement>(null);
  const barWidth = useElementWidth(barRef);
  // 0 = not measured yet; render roomy so the first paint isn't a collapsed flash.
  const roomy = (min: number) => barWidth === 0 || barWidth >= min;
  const current = useCurrentProject();
  const nav = useUI((s) => s.nav);
  const goTo = useUI((s) => s.goTo);
  const projectCount = useStore((s) => s.doc.projects.length);
  const isMonth = nav === "month";
  const isHome = nav === "home";
  // Back to the businesses overview is meaningful only when there's more than one
  // business and we're currently inside one (not already on the overview).
  const canGoBack = projectCount > 1 && nav !== "allBiz";
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const monthIndex = useUI((s) => s.monthIndex);
  const select = useUI((s) => s.select);
  const zoom = useUI((s) => s.zoom);
  const zoomIn = useUI((s) => s.zoomIn);
  const zoomOut = useUI((s) => s.zoomOut);
  const resetZoom = useUI((s) => s.resetZoom);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const pasteTable = useStore((s) => s.pasteTable);
  const clipboardTable = useUI((s) => s.clipboardTable);
  const openModal = useUI((s) => s.openModal);

  // Paste the copied table into this month, then clear the clipboard (the icon turns off).
  const pasteClip = (withData: boolean) => {
    if (!clipboardTable) return;
    select(pasteTable(monthIndex, clipboardTable, withData));
    useUI.getState().copyTableToClipboard(null);
    useUI.getState().toast(t("shell.tablePasted"), "success");
  };

  const showCanvasTools = isMonth && view === "canvas";
  const chartLabel = roomy(TIER_CHART_ICON);
  const inlineQuickAdd = roomy(TIER_QUICK_ADD);
  const inlineTools = roomy(TIER_OVERFLOW);

  const clipboardMenu = clipboardTable ? (
    <Menu
      align="end"
      trigger={
        <IconButton
          label={t("shell.clipboardPaste", { title: clipboardTable.title })}
          icon={<Clipboard />}
          className={styles.clipActive}
        />
      }
    >
      <MenuLabel>{t("shell.clipboardHas", { title: clipboardTable.title })}</MenuLabel>
      <MenuItem icon={<ClipboardPaste />} onClick={() => pasteClip(true)}>
        {t("shell.pasteWithData", { title: clipboardTable.title })}
      </MenuItem>
      <MenuItem icon={<FileStack />} onClick={() => pasteClip(false)}>
        {t("shell.pasteStructure", { title: clipboardTable.title })}
      </MenuItem>
    </Menu>
  ) : (
    <IconButton label={t("shell.clipboardEmpty")} icon={<Clipboard />} disabled />
  );

  return (
    <header className={styles.bar} ref={barRef}>
      <div className={styles.crumb}>
        {isHome ? (
          <h1 className={styles.crumbCurrent}>{t("shell.home")}</h1>
        ) : (
          <>
            {canGoBack && (
              <>
                <button
                  type="button"
                  className={styles.crumbBack}
                  onClick={() => goTo("allBiz")}
                  title={t("shell.backToBusinesses")}
                >
                  <ArrowLeft size={15} aria-hidden />
                  <span>{t("shell.businesses")}</span>
                </button>
                <ChevronRight size={15} className={styles.crumbSep} aria-hidden />
              </>
            )}
            <h1 className={styles.crumbCurrent}>
              {nav === "allBiz" ? t("shell.allBusinesses") : (current?.name ?? "—")}
            </h1>
          </>
        )}
      </div>

      {isMonth &&
        (inlineQuickAdd ? (
          <div className={styles.quickAddSlot}>
            <QuickAddBar compact monthIndex={monthIndex} />
          </div>
        ) : (
          <Popover
            align="start"
            minWidth={320}
            className={styles.quickAddPop}
            trigger={<IconButton label={t("shell.quickAdd")} icon={<Zap />} />}
          >
            <QuickAddBar monthIndex={monthIndex} />
          </Popover>
        ))}

      {!isMonth && !isHome && (
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

          <NewChartMenu
            trigger={
              chartLabel ? (
                <Button variant="ghost" icon={<BarChart3 />}>
                  {t("shell.chart")}
                </Button>
              ) : (
                <IconButton label={t("shell.chart")} icon={<BarChart3 />} />
              )
            }
          />

          <span className={styles.divider} aria-hidden />

          {inlineTools ? (
            <>
              {/* Clipboard: lit when a table is copied; click to paste here (then it clears). */}
              {clipboardMenu}

              <IconButton
                label={t("shell.copyMonth")}
                icon={<CalendarPlus />}
                onClick={() => openModal("copyMonth")}
              />

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
            </>
          ) : (
            <Menu align="end" trigger={<IconButton label={t("shell.moreTools")} icon={<MoreHorizontal />} />}>
              <MenuItem icon={<Undo2 />} disabled={!canUndo} onClick={undo}>
                {t("shell.undo")}
              </MenuItem>
              <MenuItem icon={<Redo2 />} disabled={!canRedo} onClick={redo}>
                {t("shell.redo")}
              </MenuItem>
              <MenuSeparator />
              {clipboardTable && (
                <>
                  <MenuItem icon={<ClipboardPaste />} onClick={() => pasteClip(true)}>
                    {t("shell.pasteWithData", { title: clipboardTable.title })}
                  </MenuItem>
                  <MenuItem icon={<FileStack />} onClick={() => pasteClip(false)}>
                    {t("shell.pasteStructure", { title: clipboardTable.title })}
                  </MenuItem>
                </>
              )}
              <MenuItem icon={<CalendarPlus />} onClick={() => openModal("copyMonth")}>
                {t("shell.copyMonth")}
              </MenuItem>
              {showCanvasTools && (
                <>
                  <MenuSeparator />
                  <MenuLabel>{Math.round(zoom * 100) + "%"}</MenuLabel>
                  <MenuItem icon={<ZoomOut />} onClick={zoomOut}>
                    {t("shell.zoomOut")}
                  </MenuItem>
                  <MenuItem icon={<ZoomIn />} onClick={zoomIn}>
                    {t("shell.zoomIn")}
                  </MenuItem>
                  <MenuItem onClick={resetZoom}>{t("shell.resetZoom")}</MenuItem>
                </>
              )}
            </Menu>
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

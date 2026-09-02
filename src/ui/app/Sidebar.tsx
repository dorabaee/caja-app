import { useState, type ReactNode } from "react";
import {
  Wallet,
  Plus,
  Home,
  LayoutDashboard,
  PieChart,
  CalendarRange,
  Layers,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  MoreHorizontal,
  Pencil,
  Trash2,
  Building2,
  GripVertical,
  Keyboard,
  Compass,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore, useUI } from "@core/store";
import type { NavView } from "@core/store/ui";
import { IconButton, Menu, MenuItem, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useListReorder } from "@ui/hooks/useListReorder";
import { ShortcutsOverlay } from "./ShortcutsOverlay";
import styles from "./Sidebar.module.css";

/** Vista tabs exclude "home" (that's the pinned launcher, reached separately). */
type VistaKey = Exclude<NavView, "home">;
const VIEW_NAV: Record<VistaKey, { icon: ReactNode; labelKey: string; motion: string }> = {
  month: { icon: <LayoutDashboard size={16} aria-hidden />, labelKey: "shell.board", motion: "pop" },
  panel: { icon: <PieChart size={16} aria-hidden />, labelKey: "shell.panel", motion: "spin" },
  resumen: { icon: <CalendarRange size={16} aria-hidden />, labelKey: "shell.yearSummary", motion: "nudge" },
  allBiz: { icon: <Layers size={16} aria-hidden />, labelKey: "shell.allBusinesses", motion: "fan" },
};

export function Sidebar() {
  const { t } = useTranslation();
  const projects = useStore((s) => s.doc.projects);
  const current = useCurrentProject();
  const theme = useStore((s) => s.doc.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);
  const selectProject = useStore((s) => s.selectProject);
  const setProjectOrder = useStore((s) => s.setProjectOrder);
  const openModal = useUI((s) => s.openModal);
  const editProject = useUI((s) => s.editProject);
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const toggleSidebar = useUI((s) => s.toggleSidebar);
  const nav = useUI((s) => s.nav);
  const goTo = useUI((s) => s.goTo);
  const [shortcuts, setShortcuts] = useState(false);

  // Drag-reorder the business list (pointer-based; see useListReorder).
  const biz = useListReorder(setProjectOrder);

  const toggleTheme = () => updateSettings({ theme: theme === "dark" ? "light" : "dark" });
  const newProject = () => {
    editProject(null);
    openModal("newProject");
  };

  return (
    <aside
      className={cn(styles.sidebar, collapsed && styles.collapsed)}
      // After the width transition settles, nudge resize listeners (e.g. the Tour
      // spotlight) to re-measure against the new layout.
      onTransitionEnd={(e) => {
        if (e.propertyName === "width") window.dispatchEvent(new Event("resize"));
      }}
    >
      <button
        type="button"
        className={styles.brand}
        onClick={toggleSidebar}
        aria-label={collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
        title={collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
      >
        <span className={styles.mark} aria-hidden>
          <Wallet size={18} />
        </span>
        <span className={styles.wordmark}>Caja</span>
      </button>

      <nav className={styles.list}>
        <button
          type="button"
          className={cn(styles.navItem, styles.hop, nav === "home" && styles.navActive)}
          onClick={() => goTo("home")}
          title={collapsed ? t("shell.home") : undefined}
        >
          <Home size={16} aria-hidden />
          <span>{t("shell.home")}</span>
        </button>
      </nav>

      <div className={styles.section} data-tour="businesses">
        <div className={styles.sectionHead}>
          <span className={styles.sectionTitle}>{t("shell.businesses")}</span>
          <IconButton
            label={t("shell.newBusiness")}
            icon={<Plus />}
            size="sm"
            className={styles.turn}
            onClick={newProject}
          />
        </div>
        <nav className={styles.list}>
          {projects.map((p) => {
            const active = current?.id === p.id;
            return (
              <div
                key={p.id}
                data-reorder-id={p.id}
                className={cn(
                  styles.bizRow,
                  active && styles.bizActive,
                  biz.dragId === p.id && styles.navDragging,
                  biz.overId === p.id && styles.navDragOver,
                )}
              >
                {!collapsed && (
                  <span
                    className={styles.grip}
                    title={t("shell.reorderBusiness")}
                    onPointerDown={(e) => biz.start(e, p.id)}
                  >
                    <GripVertical size={14} aria-hidden />
                  </span>
                )}
                <button
                  type="button"
                  className={cn(styles.bizButton, styles.lift)}
                  onClick={() => selectProject(p.id)}
                  aria-current={active ? "true" : undefined}
                  title={collapsed ? p.name : undefined}
                >
                  <Building2 size={16} className={styles.bizIcon} aria-hidden />
                  <span className={styles.bizName}>{p.name}</span>
                </button>
                <Menu
                  align="end"
                  trigger={
                    <IconButton
                      label={t("shell.optionsFor", { name: p.name })}
                      icon={<MoreHorizontal />}
                      size="sm"
                      className={styles.bizMenu}
                    />
                  }
                >
                  <MenuItem
                    icon={<Pencil />}
                    onClick={() => {
                      editProject(p.id);
                      openModal("newProject");
                    }}
                  >
                    {t("shell.editBusiness")}
                  </MenuItem>
                  <MenuItem
                    icon={<Trash2 />}
                    danger
                    onClick={() => {
                      if (confirm(t("shell.deleteConfirm", { name: p.name })))
                        useStore.getState().deleteProject(p.id);
                    }}
                  >
                    {t("shell.deleteBusiness")}
                  </MenuItem>
                </Menu>
              </div>
            );
          })}
        </nav>
      </div>

      <div className={styles.section} data-tour="views">
        <span className={styles.sectionTitle}>{t("shell.view")}</span>
        <ViewNav />
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={cn(styles.navItem, styles.gear)}
          data-tour="settings"
          onClick={() => openModal("settings")}
          title={collapsed ? t("shell.settings") : undefined}
        >
          <Settings size={16} aria-hidden />
          <span>{t("shell.settings")}</span>
        </button>
        <div className={styles.footerRow}>
          <IconButton
            label={theme === "dark" ? t("shell.lightMode") : t("shell.darkMode")}
            icon={theme === "dark" ? <Sun /> : <Moon />}
            size="sm"
            className={styles.celestial}
            onClick={toggleTheme}
          />
          <Menu
            align="end"
            trigger={
              <IconButton
                label={t("shell.help")}
                icon={<HelpCircle />}
                size="sm"
                tone="info"
                data-tour="help"
              />
            }
          >
            <MenuItem icon={<Compass />} onClick={() => updateSettings({ runTour: true })}>
              {t("shell.replayTour")}
            </MenuItem>
            <MenuItem icon={<Keyboard />} onClick={() => setShortcuts(true)}>
              {t("shortcuts.title")}
            </MenuItem>
          </Menu>
        </div>
      </div>

      <ShortcutsOverlay open={shortcuts} onClose={() => setShortcuts(false)} />
    </aside>
  );
}

/** The "Vista" nav: data-driven from useUI.navOrder, drag-reorderable when expanded. */
function ViewNav() {
  const { t } = useTranslation();
  const nav = useUI((s) => s.nav);
  const navOrder = useUI((s) => s.navOrder);
  const setNavOrder = useUI((s) => s.setNavOrder);
  const setMonth = useUI((s) => s.setMonth);
  const goTo = useUI((s) => s.goTo);
  const monthIndex = useUI((s) => s.monthIndex);
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const projectCount = useStore((s) => s.doc.projects.length);

  // Pointer-based reorder. The grip gives the rendered (visible) keys in their new
  // order; rebuild navOrder from them and re-append allBiz if it's currently hidden
  // (keeps navOrder valid — all four keys present).
  const reorder = useListReorder((ids) => {
    const next = ids.filter((k) => k !== "home") as NavView[];
    if (!next.includes("allBiz")) next.push("allBiz");
    setNavOrder(next);
  });

  // allBiz only exists with >1 business; keep it in the stored order regardless.
  // (navOrder never contains "home" — the type guard just narrows for VIEW_NAV.)
  const visible = navOrder.filter(
    (k): k is VistaKey => k !== "home" && (k !== "allBiz" || projectCount > 1),
  );

  const activate = (key: VistaKey) => (key === "month" ? setMonth(monthIndex) : goTo(key));

  return (
    <nav className={styles.list}>
      {visible.map((key) => {
        const { icon, labelKey, motion } = VIEW_NAV[key];
        return (
          <button
            key={key}
            type="button"
            data-reorder-id={key}
            className={cn(
              styles.navItem,
              styles[motion],
              nav === key && styles.navActive,
              reorder.dragId === key && styles.navDragging,
              reorder.overId === key && styles.navDragOver,
            )}
            onClick={() => activate(key)}
            title={collapsed ? t(labelKey) : undefined}
          >
            {!collapsed && (
              <span
                className={styles.grip}
                title={t("shell.reorderView")}
                onPointerDown={(e) => reorder.start(e, key)}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical size={14} aria-hidden />
              </span>
            )}
            {icon}
            <span>{t(labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}

import { useRef, useState, type ReactNode } from "react";
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
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore, useUI } from "@core/store";
import type { NavView } from "@core/store/ui";
import { IconButton, Menu, MenuItem, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import styles from "./Sidebar.module.css";

/** Vista tabs exclude "home" (that's the pinned launcher, reached separately). */
type VistaKey = Exclude<NavView, "home">;
const VIEW_NAV: Record<VistaKey, { icon: ReactNode; labelKey: string }> = {
  month: { icon: <LayoutDashboard size={16} aria-hidden />, labelKey: "shell.board" },
  panel: { icon: <PieChart size={16} aria-hidden />, labelKey: "shell.panel" },
  resumen: { icon: <CalendarRange size={16} aria-hidden />, labelKey: "shell.yearSummary" },
  allBiz: { icon: <Layers size={16} aria-hidden />, labelKey: "shell.allBusinesses" },
};

export function Sidebar() {
  const { t } = useTranslation();
  const projects = useStore((s) => s.doc.projects);
  const current = useCurrentProject();
  const theme = useStore((s) => s.doc.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);
  const selectProject = useStore((s) => s.selectProject);
  const reorderProjects = useStore((s) => s.reorderProjects);
  const openModal = useUI((s) => s.openModal);
  const editProject = useUI((s) => s.editProject);
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const toggleSidebar = useUI((s) => s.toggleSidebar);
  const nav = useUI((s) => s.nav);
  const goTo = useUI((s) => s.goTo);

  // Drag-reorder the business list. The row is always draggable, but a drag only
  // proceeds when it was started from the grip handle (armedRef, set synchronously
  // on the grip's mousedown so `draggable` timing is never an issue).
  const [dragBizId, setDragBizId] = useState<string | null>(null);
  const [overBizId, setOverBizId] = useState<string | null>(null);
  const bizArmed = useRef(false);
  const dropBiz = (targetId: string) => {
    if (dragBizId && dragBizId !== targetId) reorderProjects(dragBizId, targetId);
    setDragBizId(null);
    setOverBizId(null);
    bizArmed.current = false;
  };

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
          className={cn(styles.navItem, nav === "home" && styles.navActive)}
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
          <IconButton label={t("shell.newBusiness")} icon={<Plus />} size="sm" onClick={newProject} />
        </div>
        <nav className={styles.list}>
          {projects.map((p) => {
            const active = current?.id === p.id;
            return (
              <div
                key={p.id}
                className={cn(
                  styles.bizRow,
                  active && styles.bizActive,
                  dragBizId === p.id && styles.navDragging,
                  overBizId === p.id && dragBizId && dragBizId !== p.id && styles.navDragOver,
                )}
                draggable={!collapsed}
                onDragStart={(e) => {
                  if (!bizArmed.current) {
                    e.preventDefault();
                    return;
                  }
                  setDragBizId(p.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (dragBizId) {
                    e.preventDefault();
                    setOverBizId(p.id);
                  }
                }}
                onDragEnd={() => {
                  setDragBizId(null);
                  setOverBizId(null);
                  bizArmed.current = false;
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dropBiz(p.id);
                }}
              >
                {!collapsed && (
                  <span
                    className={styles.grip}
                    aria-hidden
                    title={t("shell.reorderBusiness")}
                    onMouseDown={() => {
                      bizArmed.current = true;
                    }}
                  >
                    <GripVertical size={14} />
                  </span>
                )}
                <button
                  type="button"
                  className={styles.bizButton}
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
          className={styles.navItem}
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
            onClick={toggleTheme}
          />
          <IconButton
            label={t("shell.replayTour")}
            icon={<HelpCircle />}
            size="sm"
            onClick={() => updateSettings({ runTour: true })}
          />
        </div>
      </div>
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

  const [dragKey, setDragKey] = useState<NavView | null>(null);
  const [overKey, setOverKey] = useState<NavView | null>(null);
  // See the business list: drag only proceeds when started from the grip handle.
  const armed = useRef(false);

  // allBiz only exists with >1 business; keep it in the stored order regardless.
  // (navOrder never contains "home" — the type guard just narrows for VIEW_NAV.)
  const visible = navOrder.filter(
    (k): k is VistaKey => k !== "home" && (k !== "allBiz" || projectCount > 1),
  );

  const activate = (key: VistaKey) => (key === "month" ? setMonth(monthIndex) : goTo(key));

  const drop = (target: NavView) => {
    if (dragKey && dragKey !== target) {
      const order = [...navOrder];
      order.splice(order.indexOf(dragKey), 1);
      order.splice(order.indexOf(target), 0, dragKey);
      setNavOrder(order);
    }
    setDragKey(null);
    setOverKey(null);
    armed.current = false;
  };

  return (
    <nav className={styles.list}>
      {visible.map((key) => {
        const { icon, labelKey } = VIEW_NAV[key];
        return (
          <button
            key={key}
            type="button"
            draggable={!collapsed}
            className={cn(
              styles.navItem,
              nav === key && styles.navActive,
              dragKey === key && styles.navDragging,
              overKey === key && dragKey && dragKey !== key && styles.navDragOver,
            )}
            onClick={() => activate(key)}
            title={collapsed ? t(labelKey) : undefined}
            onDragStart={(e) => {
              if (!armed.current) {
                e.preventDefault();
                return;
              }
              setDragKey(key);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (dragKey) {
                e.preventDefault();
                setOverKey(key);
              }
            }}
            onDragEnd={() => {
              setDragKey(null);
              setOverKey(null);
              armed.current = false;
            }}
            onDrop={(e) => {
              e.preventDefault();
              drop(key);
            }}
          >
            {!collapsed && (
              <span
                className={styles.grip}
                aria-hidden
                title={t("shell.reorderView")}
                onMouseDown={() => {
                  armed.current = true;
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical size={14} />
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

import {
  Wallet,
  Plus,
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
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore, useUI } from "@core/store";
import { IconButton, Menu, MenuItem, cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const { t } = useTranslation();
  const projects = useStore((s) => s.doc.projects);
  const current = useCurrentProject();
  const theme = useStore((s) => s.doc.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);
  const selectProject = useStore((s) => s.selectProject);
  const projectCount = projects.length;
  const nav = useUI((s) => s.nav);
  const setMonth = useUI((s) => s.setMonth);
  const goTo = useUI((s) => s.goTo);
  const openModal = useUI((s) => s.openModal);
  const editProject = useUI((s) => s.editProject);
  const monthIndex = useUI((s) => s.monthIndex);

  const toggleTheme = () => updateSettings({ theme: theme === "dark" ? "light" : "dark" });
  const newProject = () => {
    editProject(null);
    openModal("newProject");
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden>
          <Wallet size={18} />
        </span>
        <span className={styles.wordmark}>Caja</span>
      </div>

      <div className={styles.section} data-tour="businesses">
        <div className={styles.sectionHead}>
          <span className={styles.sectionTitle}>{t("shell.businesses")}</span>
          <IconButton label={t("shell.newBusiness")} icon={<Plus />} size="sm" onClick={newProject} />
        </div>
        <nav className={styles.list}>
          {projects.map((p) => {
            const active = current?.id === p.id;
            return (
              <div key={p.id} className={cn(styles.bizRow, active && styles.bizActive)}>
                <button
                  type="button"
                  className={styles.bizButton}
                  onClick={() => selectProject(p.id)}
                  aria-current={active ? "true" : undefined}
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
        <nav className={styles.list}>
          <button
            type="button"
            className={cn(styles.navItem, nav === "month" && styles.navActive)}
            onClick={() => setMonth(monthIndex)}
          >
            <LayoutDashboard size={16} aria-hidden />
            <span>{t("shell.board")}</span>
          </button>
          <button
            type="button"
            className={cn(styles.navItem, nav === "panel" && styles.navActive)}
            onClick={() => goTo("panel")}
          >
            <PieChart size={16} aria-hidden />
            <span>{t("shell.panel")}</span>
          </button>
          <button
            type="button"
            className={cn(styles.navItem, nav === "resumen" && styles.navActive)}
            onClick={() => goTo("resumen")}
          >
            <CalendarRange size={16} aria-hidden />
            <span>{t("shell.yearSummary")}</span>
          </button>
          {projectCount > 1 && (
            <button
              type="button"
              className={cn(styles.navItem, nav === "allBiz" && styles.navActive)}
              onClick={() => goTo("allBiz")}
            >
              <Layers size={16} aria-hidden />
              <span>{t("shell.allBusinesses")}</span>
            </button>
          )}
        </nav>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.navItem}
          data-tour="settings"
          onClick={() => openModal("settings")}
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

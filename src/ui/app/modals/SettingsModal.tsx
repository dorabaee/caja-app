import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sun, Moon, Check, Droplet, Palette, DatabaseBackup, RotateCcw, AlertTriangle,
  ChevronDown, Info, ChevronLeft, GripVertical, Trash2, Plus,
} from "lucide-react";
import type { AccentName, ChartPalette, Locale, ThemeMode } from "@core/model/types";
import { useStore, useUI } from "@core/store";
import { Button, Menu, MenuItem, Modal, SegmentedControl, TextInput, cn } from "@ui/common";
import { useExport } from "@ui/hooks/useExport";
import appPackage from "../../../../package.json";
import { useCurrentProject } from "@ui/hooks/useProject";
import styles from "./SettingsModal.module.css";

const ACCENTS: { name: AccentName; labelKey: string; color: string }[] = [
  { name: "emerald", labelKey: "modals.accentEmerald", color: "#10b981" },
  { name: "ocean", labelKey: "modals.accentOcean", color: "#0ea5e9" },
  { name: "grape", labelKey: "modals.accentGrape", color: "#8b5cf6" },
  { name: "sunset", labelKey: "modals.accentSunset", color: "#f97316" },
  { name: "cherry", labelKey: "modals.accentCherry", color: "#ec4899" },
  { name: "graphite", labelKey: "modals.accentGraphite", color: "#5b6675" },
];

const CURRENCIES: { code: string; labelKey: string }[] = [
  { code: "MXN", labelKey: "modals.currencyMXN" },
  { code: "USD", labelKey: "modals.currencyUSD" },
  { code: "EUR", labelKey: "modals.currencyEUR" },
  { code: "COP", labelKey: "modals.currencyCOP" },
  { code: "ARS", labelKey: "modals.currencyARS" },
  { code: "GTQ", labelKey: "modals.currencyGTQ" },
];

export function SettingsModal() {
  const { t } = useTranslation();
  const modal = useUI((s) => s.modal);
  const closeModal = useUI((s) => s.closeModal);
  const settings = useStore((s) => s.doc.settings);
  const update = useStore((s) => s.updateSettings);
  const { exportBackup, restoreBackup } = useExport();
  const [confirmRestore, setConfirmRestore] = useState(false);
  const selectedCurrency = CURRENCIES.find((currency) => currency.code === settings.currency) ?? CURRENCIES[0];
  const releaseDate = new Intl.DateTimeFormat(settings.locale === "es" ? "es-MX" : "en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${appPackage.releaseDate}T00:00:00Z`));
  const [advanced, setAdvanced] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [categoryGroup, setCategoryGroup] = useState<"fiscal" | "noFiscal">("fiscal");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [removingCategory, setRemovingCategory] = useState<string | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const project = useCurrentProject();

  const categoryKey = (name: string, group?: string) => `${group ?? "other"}:${name}`;
  const categories = project?.categories ?? [];
  const addCategory = () => {
    const name = categoryDraft.trim();
    if (!project || !name || categories.some((c) => c.group === categoryGroup && c.name.toLowerCase() === name.toLowerCase())) return;
    useStore.getState().updateProject(project.id, { categories: [...categories, { name, group: categoryGroup }] });
    setCategoryDraft("");
  };
  const removeCategory = (name: string, group: "fiscal" | "noFiscal") => {
    if (!project) return;
    const key = categoryKey(name, group);
    setRemovingCategory(key);
    window.setTimeout(() => {
      useStore.getState().removeProjectCategory(project.id, name, group);
      setRemovingCategory((current) => (current === key ? null : current));
    }, 180);
  };
  const renameCategory = (oldName: string, group: "fiscal" | "noFiscal", value: string) => {
    if (project && value.trim() && value.trim() !== oldName) useStore.getState().renameProjectCategory(project.id, oldName, group, value);
    setEditingCategory(null);
  };
  const moveCategory = (targetName: string, targetGroup?: string) => {
    if (!project || !draggedCategory) return;
    const sourceIndex = categories.findIndex((c) => categoryKey(c.name, c.group) === draggedCategory);
    const targetIndex = categories.findIndex((c) => categoryKey(c.name, c.group) === categoryKey(targetName, targetGroup));
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const next = [...categories];
    const [item] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, item);
    useStore.getState().updateProject(project.id, { categories: next });
    setDraggedCategory(null);
  };

  const doRestore = async () => {
    setConfirmRestore(false);
    await restoreBackup();
    closeModal();
  };

  if (advanced) {
    return (
      <Modal open={modal === "settings"} onClose={() => { setAdvanced(false); closeModal(); }} title={t("modals.advancedSettingsTitle")} description={t("modals.advancedSettingsDescription")}>
        <section className={styles.section}>
          <button type="button" className={styles.backButton} onClick={() => setAdvanced(false)}><ChevronLeft size={16} /> {t("modals.backToSettings")}</button>
          <div className={styles.headingRow}><h3 className={styles.heading}>{t("modals.categories")}</h3><span className={styles.muted}>{t("modals.globalCategories")}</span></div>
          <div className={styles.categoryGroups}>
            {(["fiscal", "noFiscal"] as const).map((group) => (
              <div key={group} className={styles.categoryGroup}>
                <p className={styles.groupLabel}>{t(`widgets.group_${group}`)}</p>
                {categories.filter((c) => c.group === group).map((cat) => (
                  <div key={categoryKey(cat.name, cat.group)} className={cn(styles.manageCategory, removingCategory === categoryKey(cat.name, cat.group) && styles.categoryRemoving)} draggable
                    onDragStart={() => setDraggedCategory(categoryKey(cat.name, cat.group))}
                    onDragOver={(e) => e.preventDefault()} onDrop={() => moveCategory(cat.name, cat.group)}>
                    <GripVertical size={15} className={styles.dragIcon} />
                    {editingCategory === categoryKey(cat.name, cat.group) ? (
                      <input autoFocus className={styles.editInput} defaultValue={cat.name} onBlur={(e) => renameCategory(cat.name, group, e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
                    ) : <button type="button" className={styles.categoryName} onDoubleClick={() => setEditingCategory(categoryKey(cat.name, cat.group))}>{cat.name}</button>}
                    <button type="button" className={styles.iconDanger} aria-label={t("modals.removeCategory", { name: cat.name })} onClick={() => removeCategory(cat.name, group)}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <form className={styles.addRow} onSubmit={(e) => { e.preventDefault(); addCategory(); }}>
            <TextInput value={categoryDraft} placeholder={t("modals.newCategory")} onChange={(e) => setCategoryDraft(e.target.value)} />
            <select className={styles.select} value={categoryGroup} onChange={(e) => setCategoryGroup(e.target.value as "fiscal" | "noFiscal")}><option value="fiscal">{t("widgets.group_fiscal")}</option><option value="noFiscal">{t("widgets.group_noFiscal")}</option></select>
            <Button type="submit" variant="secondary" icon={<Plus />}>{t("common.add")}</Button>
          </form>
          <p className={styles.muted}>{t("modals.editCategoriesHint")}</p>
        </section>
      </Modal>
    );
  }

  return (
    <Modal
      open={modal === "settings"}
      onClose={() => {
        setConfirmRestore(false);
        closeModal();
      }}
      title={t("modals.settingsTitle")}
      description={t("modals.settingsDescription")}
    >
      <section className={styles.section}>
        <h3 className={styles.heading}>{t("modals.appearance")}</h3>

        <div className={styles.row}>
          <span className={styles.label}>{t("modals.mode")}</span>
          <SegmentedControl<ThemeMode>
            className={styles.settingSegments}
            aria-label={t("modals.mode")}
            value={settings.theme}
            options={[
              { value: "light", label: t("modals.light"), icon: <Sun /> },
              { value: "dark", label: t("modals.dark"), icon: <Moon /> },
            ]}
            onChange={(theme) => update({ theme })}
          />
        </div>

        <div className={styles.row}>
          <span className={styles.label}>{t("modals.advancedSettings")}</span>
          <Button variant="secondary" onClick={() => setAdvanced(true)}>{t("modals.manageCategories")}</Button>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>{t("modals.color")}</span>
          <div className={styles.swatches}>
            {ACCENTS.map((a) => (
              <button
                key={a.name}
                type="button"
                className={cn(styles.swatch, settings.accent === a.name && styles.swatchOn)}
                style={{ background: a.color }}
                aria-label={t(a.labelKey)}
                aria-pressed={settings.accent === a.name}
                title={t(a.labelKey)}
                onClick={() => update({ accent: a.name })}
              >
                {settings.accent === a.name && <Check size={16} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>{t("modals.charts")}</span>
          <SegmentedControl<ChartPalette>
            className={styles.settingSegments}
            aria-label={t("modals.chartStyle")}
            value={settings.chartPalette}
            options={[
              { value: "mono", label: t("modals.monochrome"), icon: <Droplet /> },
              { value: "colorful", label: t("modals.colorful"), icon: <Palette /> },
            ]}
            onChange={(chartPalette) => update({ chartPalette })}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>{t("modals.preferences")}</h3>

        <div className={styles.row}>
          <span className={styles.label}>{t("modals.hiddenWidgetsLayout")}</span>
          <div className={styles.segmented} role="group" aria-label={t("modals.hiddenWidgetsLayout")}>
            {(["preserve", "arrange"] as const).map((mode) => (
              <button key={mode} type="button" className={cn(styles.seg, settings.hiddenWidgetsLayout === mode && styles.segOn)}
                aria-pressed={settings.hiddenWidgetsLayout === mode} onClick={() => update({ hiddenWidgetsLayout: mode })}>
                {t(`modals.hiddenWidgets_${mode}`)}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{t("modals.quickAddDateMode")}</span>
          <div className={styles.segmented} role="group" aria-label={t("modals.quickAddDateMode")}>
            {(["calendar", "typing"] as const).map((mode) => (
              <button key={mode} type="button" className={cn(styles.seg, settings.quickAddDateMode === mode && styles.segOn)} aria-pressed={settings.quickAddDateMode === mode} onClick={() => update({ quickAddDateMode: mode })}>
                {t(`modals.quickAddDate_${mode}`)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>{t("modals.language")}</span>
          <SegmentedControl<Locale>
            className={styles.settingSegments}
            aria-label={t("modals.language")}
            value={settings.locale}
            options={[
              { value: "es", label: t("modals.spanish") },
              { value: "en", label: t("modals.english") },
            ]}
            onChange={(locale) => update({ locale })}
          />
        </div>

        <div className={styles.row}>
          <label className={styles.label} htmlFor="set-currency">
            {t("modals.currency")}
          </label>
          <Menu
            align="end"
            minWidth={240}
            className={styles.currencyMenu}
            trigger={
              <button id="set-currency" type="button" className={styles.currencyTrigger}>
                <span>{t(selectedCurrency.labelKey)}</span>
                <ChevronDown size={15} aria-hidden />
              </button>
            }
          >
            {CURRENCIES.map((currency) => (
              <MenuItem
                key={currency.code}
                checked={settings.currency === currency.code}
                onClick={() => update({ currency: currency.code })}
              >
                <span className={styles.currencyOption}>
                  <span>{t(currency.labelKey)}</span>
                  <span className={styles.currencyCode}>{currency.code}</span>
                </span>
              </MenuItem>
            ))}
          </Menu>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>{t("modals.decimals")}</span>
          <SegmentedControl<number>
            className={styles.settingSegments}
            aria-label={t("modals.decimals")}
            value={settings.decimals}
            options={[
              { value: 0, label: t("modals.noCents") },
              { value: 2, label: t("modals.withCents") },
            ]}
            onChange={(decimals) => update({ decimals })}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>{t("modals.data")}</h3>
        <p className={styles.dataDesc}>{t("modals.dataDescription")}</p>

        {confirmRestore ? (
          <div className={styles.warn}>
            <p className={styles.warnText}>
              <AlertTriangle size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} aria-hidden />
              {t("modals.restoreWarning")}
            </p>
            <div className={styles.warnActions}>
              <Button variant="danger" icon={<RotateCcw />} onClick={doRestore}>
                {t("modals.yesRestore")}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmRestore(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.dataActions}>
            <Button variant="secondary" icon={<DatabaseBackup />} onClick={exportBackup}>
              {t("modals.createBackup")}
            </Button>
            <Button variant="secondary" icon={<RotateCcw />} onClick={() => setConfirmRestore(true)}>
              {t("common.restore")}
            </Button>
          </div>
        )}
        <div className={styles.versionInfo}>
          <Info size={14} aria-hidden />
          <span>
            {t("modals.versionInfo", {
              version: appPackage.version,
              author: appPackage.author,
              date: releaseDate,
            })}
          </span>
        </div>
      </section>
    </Modal>
  );
}

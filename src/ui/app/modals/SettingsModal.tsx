import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sun,
  Moon,
  Check,
  Droplet,
  Palette,
  DatabaseBackup,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  Info,
} from "lucide-react";
import type { AccentName, ChartPalette, Locale, ThemeMode } from "@core/model/types";
import { useStore, useUI } from "@core/store";
import { Button, Menu, MenuItem, Modal, SegmentedControl, cn } from "@ui/common";
import { useExport } from "@ui/hooks/useExport";
import appPackage from "../../../../package.json";
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

  const doRestore = async () => {
    setConfirmRestore(false);
    await restoreBackup();
    closeModal();
  };

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

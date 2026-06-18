import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Check, Droplet, Palette, DatabaseBackup, RotateCcw, AlertTriangle } from "lucide-react";
import type { AccentName, ChartPalette, Locale, ThemeMode } from "@core/model/types";
import { useStore, useUI } from "@core/store";
import { Button, Modal, cn } from "@ui/common";
import { useExport } from "@ui/hooks/useExport";
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
          <div className={styles.segmented} role="group" aria-label={t("modals.mode")}>
            {(["light", "dark"] as ThemeMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={cn(styles.seg, settings.theme === m && styles.segOn)}
                aria-pressed={settings.theme === m}
                onClick={() => update({ theme: m })}
              >
                {m === "light" ? <Sun size={15} /> : <Moon size={15} />}
                {m === "light" ? t("modals.light") : t("modals.dark")}
              </button>
            ))}
          </div>
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
          <div className={styles.segmented} role="group" aria-label={t("modals.chartStyle")}>
            {(["mono", "colorful"] as ChartPalette[]).map((p) => (
              <button
                key={p}
                type="button"
                className={cn(styles.seg, settings.chartPalette === p && styles.segOn)}
                aria-pressed={settings.chartPalette === p}
                onClick={() => update({ chartPalette: p })}
              >
                {p === "mono" ? <Droplet size={15} /> : <Palette size={15} />}
                {p === "mono" ? t("modals.monochrome") : t("modals.colorful")}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>{t("modals.preferences")}</h3>

        <div className={styles.row}>
          <span className={styles.label}>{t("modals.language")}</span>
          <div className={styles.segmented} role="group" aria-label={t("modals.language")}>
            {(["es", "en"] as Locale[]).map((l) => (
              <button
                key={l}
                type="button"
                className={cn(styles.seg, settings.locale === l && styles.segOn)}
                aria-pressed={settings.locale === l}
                onClick={() => update({ locale: l })}
              >
                {l === "es" ? t("modals.spanish") : t("modals.english")}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <label className={styles.label} htmlFor="set-currency">
            {t("modals.currency")}
          </label>
          <select
            id="set-currency"
            className={styles.select}
            value={settings.currency}
            onChange={(e) => update({ currency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {t(c.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>{t("modals.decimals")}</span>
          <div className={styles.segmented} role="group" aria-label={t("modals.decimals")}>
            {[0, 2].map((d) => (
              <button
                key={d}
                type="button"
                className={cn(styles.seg, settings.decimals === d && styles.segOn)}
                aria-pressed={settings.decimals === d}
                onClick={() => update({ decimals: d })}
              >
                {d === 0 ? t("modals.noCents") : t("modals.withCents")}
              </button>
            ))}
          </div>
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
      </section>
    </Modal>
  );
}

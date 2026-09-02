import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { bankMeta } from "@core/model/banks";
import type { BankKey } from "@core/model/types";
import { useCurrentProject } from "@ui/hooks/useProject";
import styles from "../widget.module.css";

/**
 * The bank a fiscal table is tagged with, shown next to its title so two fiscal tables
 * are tellable apart at a glance.
 *
 * Built-in banks draw their mark from `public/banks/<key>.svg`; a bank the user added
 * has no artwork and falls back to its initials on a neutral chip. The same fallback
 * covers a missing or unreadable file, so the tag can never render broken.
 */
export function BankTag({ bank }: { bank: BankKey | undefined }) {
  const { t } = useTranslation();
  const [logoFailed, setLogoFailed] = useState(false);
  const project = useCurrentProject();
  const meta = bankMeta(bank, project?.banks);
  if (!meta) return null;

  const style = { "--bank-color": meta.color, "--bank-tint": meta.tint } as CSSProperties;
  const showLogo = !!meta.logo && !logoFailed;

  return (
    <span
      className={styles.bankTag}
      style={style}
      title={t("widgets.bankAccount", { name: meta.label })}
    >
      {showLogo ? (
        <img
          className={styles.bankLogo}
          src={`${import.meta.env.BASE_URL}banks/${meta.logo}`}
          alt=""
          aria-hidden
          loading="lazy"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className={styles.bankMark} aria-hidden>
          {meta.short}
        </span>
      )}
      {meta.label}
    </span>
  );
}

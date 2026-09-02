import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { bankMeta } from "@core/model/banks";
import type { BankKey } from "@core/model/types";
import { cn } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import styles from "../widget.module.css";

/**
 * The bank a fiscal table is tagged with, shown next to its title so two fiscal tables
 * are tellable apart at a glance.
 *
 * Built-in banks draw their real mark from `public/banks/<key>.svg`. Most of those are
 * wordmarks that already spell the bank out, so the chip shows the artwork on its own
 * rather than printing the name twice; only a symbol-only logo (and a bank the user
 * added, which has no artwork at all) gets the name beside it.
 */
export function BankTag({ bank }: { bank: BankKey | undefined }) {
  const { t } = useTranslation();
  const [logoFailed, setLogoFailed] = useState(false);
  const project = useCurrentProject();
  const meta = bankMeta(bank, project?.banks);
  if (!meta) return null;

  const style = { "--bank-color": meta.color, "--bank-tint": meta.tint } as CSSProperties;
  const showLogo = !!meta.logo && !logoFailed;
  const wordmark = showLogo && meta.mark === "wordmark";

  return (
    <span
      className={cn(styles.bankTag, wordmark && styles.bankTagLogo)}
      style={style}
      title={t("widgets.bankAccount", { name: meta.label })}
      aria-label={t("widgets.bankAccount", { name: meta.label })}
    >
      {showLogo ? (
        <img
          className={wordmark ? styles.bankWordmark : styles.bankLogo}
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
      {!wordmark && meta.label}
    </span>
  );
}

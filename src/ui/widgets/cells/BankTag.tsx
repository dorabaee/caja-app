import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { bankMeta } from "@core/model/banks";
import type { BankKey } from "@core/model/types";
import styles from "../widget.module.css";

/**
 * The bank a fiscal table is tagged with, shown next to its title so two fiscal tables
 * are tellable apart at a glance.
 *
 * The mark is the bank's own logo from `public/banks/<key>.png` when that file exists;
 * if it doesn't (or fails to decode) the tag falls back to the bank's initials on its
 * brand colour, so the app never ships a broken image and works with no assets at all.
 */
export function BankTag({ bank }: { bank: BankKey | undefined }) {
  const { t } = useTranslation();
  const [logoFailed, setLogoFailed] = useState(false);
  const meta = bankMeta(bank);
  if (!meta) return null;
  const style = { "--bank-color": meta.color, "--bank-tint": meta.tint } as CSSProperties;
  return (
    <span className={styles.bankTag} style={style} title={t("widgets.bankAccount", { name: meta.label })}>
      {logoFailed ? (
        <span className={styles.bankMark} aria-hidden>
          {meta.short}
        </span>
      ) : (
        <img
          className={styles.bankLogo}
          src={`${import.meta.env.BASE_URL}banks/${meta.key}.png`}
          alt=""
          aria-hidden
          loading="lazy"
          onError={() => setLogoFailed(true)}
        />
      )}
      {meta.label}
    </span>
  );
}

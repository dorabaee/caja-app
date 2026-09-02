import { useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  Table2,
  ClipboardPaste,
  FileStack,
  HelpCircle,
} from "lucide-react";
import { useStore, useUI } from "@core/store";
import type { TemplateKey } from "@core/model/defaults";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@ui/common";
import { TemplatePreview } from "./TemplatePreview";
import styles from "./AddTableMenu.module.css";

export function AddTableMenu({ trigger }: { trigger: ReactElement }) {
  const { t } = useTranslation();
  // Which template's demo is open, if any. Lives here so the "?" can sit inside the menu
  // while its overlay renders in a portal above everything.
  const [preview, setPreview] = useState<TemplateKey | null>(null);
  const monthIndex = useUI((s) => s.monthIndex);
  const select = useUI((s) => s.select);
  const addTable = useStore((s) => s.addTable);
  const pasteTable = useStore((s) => s.pasteTable);
  const clipboardTable = useUI((s) => s.clipboardTable);

  const add = (tpl: TemplateKey) => select(addTable(monthIndex, tpl));

  /** The "?" on a template row: opens its demo instead of creating the table. */
  const help = (tpl: TemplateKey, label: string) => (
    <button
      type="button"
      className={styles.help}
      aria-label={t("preview.explain", { name: label })}
      title={t("preview.explain", { name: label })}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setPreview(tpl);
      }}
    >
      <HelpCircle size={14} aria-hidden />
    </button>
  );
  const paste = (withData: boolean) => {
    if (!clipboardTable) return;
    select(pasteTable(monthIndex, clipboardTable, withData));
    useUI.getState().copyTableToClipboard(null); // single-use: clear after pasting
    useUI.getState().toast(t("shell.tablePasted"), "success");
  };

  const menu = (
    <Menu trigger={trigger}>
      <MenuLabel>{t("shell.templates")}</MenuLabel>
      <MenuItem icon={<TrendingUp />} onClick={() => add("income")}>
        <span className={styles.row}>
          {t("shell.tplIncome")}
          {help("income", t("shell.tplIncome"))}
        </span>
      </MenuItem>
      <MenuItem icon={<TrendingDown />} onClick={() => add("expense")}>
        <span className={styles.row}>
          {t("shell.tplExpense")}
          {help("expense", t("shell.tplExpense"))}
        </span>
      </MenuItem>
      <MenuItem icon={<Landmark />} onClick={() => add("ledger")}>
        <span className={styles.row}>
          {t("shell.tplLedger")}
          {help("ledger", t("shell.tplLedger"))}
        </span>
      </MenuItem>
      <MenuItem icon={<Table2 />} onClick={() => add("blank")}>
        <span className={styles.row}>
          {t("shell.tplBlank")}
          {help("blank", t("shell.tplBlank"))}
        </span>
      </MenuItem>
      {clipboardTable && (
        <>
          <MenuSeparator />
          <MenuLabel>{t("shell.clipboard")}</MenuLabel>
          <MenuItem icon={<ClipboardPaste />} onClick={() => paste(true)}>
            {t("shell.pasteWithData", { title: clipboardTable.title })}
          </MenuItem>
          <MenuItem icon={<FileStack />} onClick={() => paste(false)}>
            {t("shell.pasteStructure", { title: clipboardTable.title })}
          </MenuItem>
        </>
      )}
    </Menu>
  );

  return (
    <>
      {menu}
      <TemplatePreview
        open={preview !== null}
        template={preview ?? "income"}
        onClose={() => setPreview(null)}
        onUse={(tpl) => {
          setPreview(null);
          add(tpl);
        }}
      />
    </>
  );
}

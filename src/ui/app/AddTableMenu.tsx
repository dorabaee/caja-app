import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Landmark, Table2, ClipboardPaste, FileStack } from "lucide-react";
import { useStore, useUI } from "@core/store";
import type { TemplateKey } from "@core/model/defaults";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@ui/common";

export function AddTableMenu({ trigger }: { trigger: ReactElement }) {
  const { t } = useTranslation();
  const monthIndex = useUI((s) => s.monthIndex);
  const select = useUI((s) => s.select);
  const addTable = useStore((s) => s.addTable);
  const pasteTable = useStore((s) => s.pasteTable);
  const clipboardTable = useUI((s) => s.clipboardTable);

  const add = (tpl: TemplateKey) => select(addTable(monthIndex, tpl));
  const paste = (withData: boolean) => {
    if (!clipboardTable) return;
    select(pasteTable(monthIndex, clipboardTable, withData));
    useUI.getState().copyTableToClipboard(null); // single-use: clear after pasting
    useUI.getState().toast(t("shell.tablePasted"), "success");
  };

  return (
    <Menu trigger={trigger}>
      <MenuLabel>{t("shell.templates")}</MenuLabel>
      <MenuItem icon={<TrendingUp />} onClick={() => add("income")}>
        {t("shell.tplIncome")}
      </MenuItem>
      <MenuItem icon={<TrendingDown />} onClick={() => add("expense")}>
        {t("shell.tplExpense")}
      </MenuItem>
      <MenuItem icon={<Landmark />} onClick={() => add("ledger")}>
        {t("shell.tplLedger")}
      </MenuItem>
      <MenuItem icon={<Table2 />} onClick={() => add("blank")}>
        {t("shell.tplBlank")}
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
}

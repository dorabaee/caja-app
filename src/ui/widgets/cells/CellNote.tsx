import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StickyNote } from "lucide-react";
import { Popover, cn } from "@ui/common";
import styles from "../widget.module.css";

export function CellNote({
  note,
  onChange,
  side,
}: {
  note: string;
  onChange: (value: string) => void;
  side: string;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(note);

  return (
    <Popover
      align="end"
      minWidth={260}
      className={styles.notePop}
      onOpenChange={(open) => {
        if (open) setDraft(note);
        else if (draft !== note) onChange(draft);
      }}
      trigger={
        <button
          type="button"
          className={cn(styles.note, side, note && styles.noteOn)}
          aria-label={note ? t("widgets.editNote") : t("widgets.addNote")}
        >
          <StickyNote size={12} />
        </button>
      }
    >
      {({ close }) => (
        <div>
          <textarea
            autoFocus
            className={styles.noteArea}
            value={draft}
            placeholder={t("widgets.notePlaceholder")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                close();
              }
            }}
          />
          <div className={styles.noteFoot}>
            <button type="button" className={styles.noteClear} onClick={() => setDraft("")}>
              {t("widgets.clearNote")}
            </button>
            <button type="button" className={styles.noteDone} onClick={close}>
              {t("common.done")}
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

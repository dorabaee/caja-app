import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Paperclip, FileText, Download, Trash2, Upload } from "lucide-react";
import { Popover, IconButton, Button } from "@ui/common";
import type { Attachment } from "@core/model/types";
import { useAttachments } from "@ui/hooks/useAttachments";
import { isImageMime } from "@ui/media/downscale";
import styles from "./rowAttachments.module.css";

const ACCEPT = "image/*,application/pdf";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RowAttachments({
  monthIndex,
  tableId,
  rowId,
  attachments,
}: {
  monthIndex: number;
  tableId: string;
  rowId: string;
  attachments: Attachment[];
}) {
  const { t } = useTranslation();
  const { add, remove, loadUrl } = useAttachments();
  const inputRef = useRef<HTMLInputElement>(null);
  const count = attachments.length;

  async function onPick(files: FileList | null): Promise<void> {
    if (!files) return;
    for (const file of Array.from(files)) {
      await add(monthIndex, tableId, rowId, file);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function download(att: Attachment): Promise<void> {
    const url = await loadUrl(att.id);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke after the navigation kicks off, not in the same tick (download race).
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <Popover
      align="end"
      minWidth={272}
      className={styles.pop}
      trigger={
        <span className={styles.triggerWrap}>
          <IconButton
            size="sm"
            label={count ? t("widgets.attachmentsCount", { count }) : t("widgets.attachFile")}
            active={count > 0}
            icon={<Paperclip size={16} />}
          />
          {count > 0 && (
            <span className={styles.badge} aria-hidden="true">
              {count}
            </span>
          )}
        </span>
      }
    >
      <div className={styles.panel}>
        <h3 className={styles.heading}>{t("widgets.attachments")}</h3>

        {count === 0 ? (
          <p className={styles.empty}>{t("widgets.noAttachments")}</p>
        ) : (
          <ul className={styles.grid}>
            {attachments.map((att) => (
              <AttachmentItem
                key={att.id}
                att={att}
                loadUrl={loadUrl}
                onDownload={() => download(att)}
                onRemove={() => remove(monthIndex, tableId, rowId, att)}
              />
            ))}
          </ul>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className={styles.hiddenInput}
          onChange={(e) => onPick(e.target.files)}
        />
        <Button
          variant="secondary"
          size="sm"
          block
          icon={<Upload size={16} />}
          onClick={() => inputRef.current?.click()}
        >
          {t("widgets.uploadFile")}
        </Button>
      </div>
    </Popover>
  );
}

function AttachmentItem({
  att,
  loadUrl,
  onDownload,
  onRemove,
}: {
  att: Attachment;
  loadUrl: (id: string) => Promise<string | null>;
  onDownload: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const isImage = isImageMime(att.mime);

  useEffect(() => {
    if (!isImage) return;
    let active = true;
    let current: string | null = null;
    loadUrl(att.id).then((u) => {
      if (active && u) {
        current = u;
        setUrl(u);
      } else if (u) {
        URL.revokeObjectURL(u);
      }
    });
    return () => {
      active = false;
      if (current) URL.revokeObjectURL(current);
    };
  }, [att.id, isImage, loadUrl]);

  return (
    <li className={styles.item}>
      <span className={styles.thumb}>
        {isImage && url ? (
          <img src={url} alt={att.name} className={styles.thumbImg} loading="lazy" />
        ) : (
          <FileText size={20} className={styles.glyph} aria-hidden="true" />
        )}
      </span>
      <span className={styles.meta}>
        <span className={styles.name} title={att.name}>
          {att.name}
        </span>
        <span className={styles.size}>{formatSize(att.size)}</span>
      </span>
      <span className={styles.actions}>
        <IconButton size="sm" label={t("widgets.download")} icon={<Download size={15} />} onClick={onDownload} />
        <IconButton
          size="sm"
          label={t("common.delete")}
          className={styles.danger}
          icon={<Trash2 size={15} />}
          onClick={onRemove}
        />
      </span>
    </li>
  );
}

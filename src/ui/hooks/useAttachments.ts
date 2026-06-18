import { useCallback } from "react";
import { useStore, useUI } from "@core/store";
import type { Attachment } from "@core/model/types";
import { getStorage } from "@core/platform";
import { downscaleImage } from "@ui/media/downscale";
import { nanoid } from "nanoid";
import { useTranslation } from "react-i18next";

/**
 * Row attachment side-effects: downscale + blob-store on add, blob-delete on
 * remove, and object-URL minting for preview/download. The store only ever
 * holds the lightweight {@link Attachment} metadata — bytes live in the blob
 * store so the main JSON stays small. The returned callbacks are stable
 * (useCallback) so consumers' effects keyed on them don't re-run each render.
 */
export function useAttachments() {
  const { t } = useTranslation();

  const add = useCallback(
    async (monthIndex: number, tableId: string, rowId: string, file: File): Promise<void> => {
      try {
        const res = await downscaleImage(file);
        const blobId = nanoid();
        await getStorage().putBlob(blobId, res.blob, { name: file.name, mime: res.mime, size: res.blob.size });
        useStore.getState().addAttachment(monthIndex, tableId, rowId, {
          id: blobId,
          name: file.name,
          mime: res.mime,
          size: res.blob.size,
          w: res.width,
          h: res.height,
        });
      } catch (e) {
        console.error("attach add", e);
        useUI.getState().toast(t("widgets.attachError"), "error");
      }
    },
    [t],
  );

  const remove = useCallback(
    async (monthIndex: number, tableId: string, rowId: string, att: Attachment): Promise<void> => {
      await getStorage().deleteBlob(att.id);
      useStore.getState().removeAttachment(monthIndex, tableId, rowId, att.id);
    },
    [],
  );

  /** Mints an object URL for a stored blob — the caller is responsible for revoking it. */
  const loadUrl = useCallback(async (id: string): Promise<string | null> => {
    const b = await getStorage().getBlob(id);
    return b ? URL.createObjectURL(b) : null;
  }, []);

  return { add, remove, loadUrl };
}

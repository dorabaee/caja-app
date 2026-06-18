import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText, Mail, MessageCircle } from "lucide-react";
import { getShare } from "@core/platform";
import { useUI } from "@core/store";
import { buildStatement } from "@core/export";
import { Button, Modal } from "@ui/common";
import { useCurrentProject } from "@ui/hooks/useProject";
import { useExport } from "@ui/hooks/useExport";
import { useFormat } from "@ui/hooks/useFormat";
import styles from "./ShareModal.module.css";

export function ShareModal() {
  const { t } = useTranslation();
  const modal = useUI((s) => s.modal);
  const closeModal = useUI((s) => s.closeModal);
  const project = useCurrentProject();
  const fmt = useFormat();
  const { exportStatementPdf } = useExport();
  const [busy, setBusy] = useState(false);

  const open = modal === "share";
  if (!open || !project) return null;

  const s = buildStatement(project);
  const shareText = t("modals.shareText", {
    name: s.businessName,
    year: s.year,
    in: fmt.money(s.totals.entro),
    out: fmt.money(s.totals.salio),
    balance: fmt.money(s.totals.teQueda),
  });

  const shareWhatsApp = () =>
    getShare().openExternal(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
  const shareEmail = () =>
    getShare().openExternal(
      `mailto:?subject=${encodeURIComponent(t("modals.shareSubject", { name: s.businessName, year: s.year }))}&body=${encodeURIComponent(shareText)}`,
    );

  const downloadPdf = async () => {
    setBusy(true);
    try {
      await exportStatementPdf(project);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={t("modals.shareTitle")}
      description={`${s.businessName} · ${s.year}`}
      size="sm"
      footer={
        <Button variant="ghost" onClick={closeModal}>
          {t("common.close")}
        </Button>
      }
    >
      <div className={styles.info}>
        <span className={styles.infoIcon} aria-hidden>
          <FileText size={16} />
        </span>
        <p className={styles.infoText}>{t("modals.shareInfo")}</p>
      </div>

      <p className={styles.label}>{t("modals.shareBy")}</p>
      <div className={styles.actions}>
        <Button variant="secondary" icon={<MessageCircle />} onClick={shareWhatsApp} style={{ flex: 1 }}>
          WhatsApp
        </Button>
        <Button variant="secondary" icon={<Mail />} onClick={shareEmail} style={{ flex: 1 }}>
          Gmail
        </Button>
        <Button variant="primary" icon={<Download />} onClick={downloadPdf} disabled={busy} style={{ flex: 1 }}>
          {busy ? t("modals.generating") : t("modals.downloadPdf")}
        </Button>
      </div>
    </Modal>
  );
}

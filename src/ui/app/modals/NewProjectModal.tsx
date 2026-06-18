import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore, useUI } from "@core/store";
import { parseMoney } from "@core/format/money";
import { Button, Field, Modal, Switch, TextInput } from "@ui/common";
import { useFormat } from "@ui/hooks/useFormat";

export function NewProjectModal() {
  const { t } = useTranslation();
  const modal = useUI((s) => s.modal);
  const editProjectId = useUI((s) => s.editProjectId);
  const closeModal = useUI((s) => s.closeModal);
  const projects = useStore((s) => s.doc.projects);
  const createProject = useStore((s) => s.createProject);
  const renameProject = useStore((s) => s.renameProject);
  const updateProject = useStore((s) => s.updateProject);
  const fmt = useFormat();

  const open = modal === "newProject";
  const editing = editProjectId ? (projects.find((p) => p.id === editProjectId) ?? null) : null;
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [carryOver, setCarryOver] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      const t = editing?.goal?.monthlyProfitTarget;
      setGoal(t ? String(t) : "");
      setCarryOver(editing?.carryOver ?? false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editProjectId]);

  const submit = () => {
    const n = name.trim();
    const target = parseMoney(goal);
    const patch = {
      goal: target > 0 ? { monthlyProfitTarget: target } : undefined,
      carryOver,
    };
    if (editing) {
      if (n) renameProject(editing.id, n);
      updateProject(editing.id, patch);
    } else {
      const id = createProject(n || t("modals.defaultBusinessName"), "empty");
      updateProject(id, patch);
    }
    closeModal();
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={editing ? t("modals.editBusiness") : t("modals.newBusiness")}
      description={editing ? undefined : t("modals.newBusinessDescription")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={submit}>
            {editing ? t("common.save") : t("modals.createBusiness")}
          </Button>
        </>
      }
    >
      <form
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label={t("modals.businessName")}>
          {({ id }) => (
            <TextInput
              id={id}
              autoFocus
              value={name}
              placeholder={t("modals.businessNamePlaceholder")}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <Field
          label={t("modals.monthlyProfitGoal")}
          hint={t("modals.monthlyProfitGoalHint", { currency: fmt.currency })}
        >
          {({ id }) => (
            <TextInput
              id={id}
              value={goal}
              inputMode="numeric"
              placeholder="3,000"
              onChange={(e) => setGoal(e.target.value)}
            />
          )}
        </Field>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-3)",
            }}
          >
            <label
              htmlFor="carryover-toggle"
              style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-muted)" }}
            >
              {t("modals.carryOver")}
            </label>
            <Switch
              id="carryover-toggle"
              checked={carryOver}
              onChange={setCarryOver}
              aria-label={t("modals.carryOver")}
            />
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-subtle)", margin: 0 }}>
            {t("modals.carryOverDescription")}
          </p>
        </div>
      </form>
    </Modal>
  );
}

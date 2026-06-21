import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Wallet, Plus } from "lucide-react";
import { useStore, useUI } from "@core/store";
import { Button, Field, TextInput, cn } from "@ui/common";
import styles from "./Onboarding.module.css";

export function Onboarding() {
  const { t } = useTranslation();
  const createProject = useStore((s) => s.createProject);
  const setMonth = useUI((s) => s.setMonth);
  const [name, setName] = useState("");
  const [choice, setChoice] = useState<"empty" | "template">("template");

  const submit = () => {
    createProject(name.trim() || t("shell.defaultBusinessName"), choice === "template" ? "income" : "empty");
    // Land the brand-new business on its board (not the Home launcher) so the
    // first-run guided tour can spotlight the KPI hero + Add-table controls.
    setMonth(new Date().getMonth());
  };

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <span className={styles.mark} aria-hidden>
          <Wallet size={22} />
        </span>
        <h1 className={styles.title}>{t("shell.welcomeTitle")}</h1>
        <p className={styles.sub}>{t("shell.welcomeSubtitle")}</p>

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label={t("shell.businessNameLabel")}>
            {({ id }) => (
              <TextInput
                id={id}
                autoFocus
                value={name}
                placeholder={t("shell.businessNamePlaceholder")}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>

          <div className={styles.choices}>
            <button
              type="button"
              className={cn(styles.choice, choice === "template" && styles.choiceOn)}
              aria-pressed={choice === "template"}
              onClick={() => setChoice("template")}
            >
              <span className={styles.choiceTitle}>{t("shell.templateChoiceTitle")}</span>
              <span className={styles.choiceDesc}>{t("shell.templateChoiceDesc")}</span>
            </button>
            <button
              type="button"
              className={cn(styles.choice, choice === "empty" && styles.choiceOn)}
              aria-pressed={choice === "empty"}
              onClick={() => setChoice("empty")}
            >
              <span className={styles.choiceTitle}>{t("shell.emptyChoiceTitle")}</span>
              <span className={styles.choiceDesc}>{t("shell.emptyChoiceDesc")}</span>
            </button>
          </div>

          <Button type="submit" variant="primary" block icon={<Plus />}>
            {t("shell.createBusiness")}
          </Button>
        </form>
      </div>
    </div>
  );
}

import { SettingsModal } from "./modals/SettingsModal";
import { NewProjectModal } from "./modals/NewProjectModal";
import { ShareModal } from "./modals/ShareModal";
import { CategoriesModal } from "./modals/CategoriesModal";
import { RecurringModal } from "./modals/RecurringModal";
import { CopyMonthModal } from "./modals/CopyMonthModal";

/** Renders every app-level modal; each shows itself based on the UI store's modal kind. */
export function ModalsHost() {
  return (
    <>
      <SettingsModal />
      <NewProjectModal />
      <ShareModal />
      <CategoriesModal />
      <RecurringModal />
      <CopyMonthModal />
    </>
  );
}

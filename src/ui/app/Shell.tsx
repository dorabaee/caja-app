import { useUI } from "@core/store";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MonthStrip } from "./MonthStrip";
import { HomeView } from "./HomeView";
import { MonthView } from "./MonthView";
import { ResumenView } from "./ResumenView";
import { PanelView } from "./PanelView";
import { AllBusinessesView } from "./AllBusinessesView";
import styles from "./Shell.module.css";

export function Shell() {
  const nav = useUI((s) => s.nav);
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <TopBar />
        <div className={styles.content}>
          {nav === "home" ? (
            <HomeView />
          ) : nav === "panel" ? (
            <PanelView />
          ) : nav === "resumen" ? (
            <ResumenView />
          ) : nav === "allBiz" ? (
            <AllBusinessesView />
          ) : (
            <MonthView />
          )}
        </div>
        {nav !== "home" && <MonthStrip />}
      </main>
    </div>
  );
}

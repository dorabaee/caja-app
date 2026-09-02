import { useEffect, useRef } from "react";
import { useUI } from "@core/store";
import type { NavView } from "@core/store/ui";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MonthStrip } from "./MonthStrip";
import { HomeView } from "./HomeView";
import { MonthView } from "./MonthView";
import { ResumenView } from "./ResumenView";
import { PanelView } from "./PanelView";
import { AllBusinessesView } from "./AllBusinessesView";
import styles from "./Shell.module.css";

/** Where each view sits in the sidebar, so a switch can slide the way the eye expects. */
const ORDER: NavView[] = ["home", "month", "panel", "resumen", "allBiz"];

export function Shell() {
  const nav = useUI((s) => s.nav);
  const prev = useRef<NavView>(nav);
  // Moving down the sidebar list slides the new view up, and vice versa.
  const direction = ORDER.indexOf(nav) >= ORDER.indexOf(prev.current) ? "down" : "up";
  useEffect(() => {
    prev.current = nav;
  }, [nav]);

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <TopBar />
        {/* Keyed on the view so each one mounts fresh and animates in. */}
        <div key={nav} className={styles.content} data-dir={direction}>
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

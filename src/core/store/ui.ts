import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Table } from "../model/types";

export type ModalKind =
  | "none"
  | "settings"
  | "newProject"
  | "share"
  | "addTable"
  | "backup"
  | "categories"
  | "recurring"
  | "copyMonth";
export type ViewMode = "canvas" | "list";
/** Which figure the third KPI card shows: the month's net, or the fiscal saldo final. */
export type BalanceMode = "teQueda" | "saldoFinal";
/** Top-level screen in the main area (driven by the sidebar + month strip).
 *  "home" is the businesses launcher — reached via the pinned "Inicio" row, not a
 *  Vista tab, so it stays out of `navOrder` (and its persistence/validation). */
export type NavView = "home" | "month" | "panel" | "resumen" | "allBiz";
export type ToastTone = "info" | "success" | "error";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2;

// Sidebar collapsed state is a deliberate, durable preference (unlike monthIndex/zoom),
// so it's persisted — but as a tiny UI flag in localStorage, never in the doc JSON
// (keeps it out of undo history and off the schema). Guarded for non-browser (test) envs.
const SIDEBAR_KEY = "caja:sidebarCollapsed";
function readSidebarCollapsed(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}
function writeSidebarCollapsed(v: boolean): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

// User-reorderable order of the "Vista" nav tabs — a deliberate, durable preference,
// persisted in localStorage (validated against the known keys so a corrupt/outdated
// value falls back to the default rather than dropping or duplicating a tab).
const NAV_ORDER_KEY = "caja:navOrder";
const DEFAULT_NAV_ORDER: NavView[] = ["month", "panel", "resumen", "allBiz"];
function readNavOrder(): NavView[] {
  try {
    if (typeof localStorage === "undefined") return [...DEFAULT_NAV_ORDER];
    const raw = localStorage.getItem(NAV_ORDER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.length === DEFAULT_NAV_ORDER.length &&
        DEFAULT_NAV_ORDER.every((k) => parsed.includes(k))
      ) {
        return parsed as NavView[];
      }
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_NAV_ORDER];
}
function writeNavOrder(order: NavView[]): void {
  try {
    if (typeof localStorage !== "undefined")
      localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

// The active month tab + top-level view are "resume where I left off" state: persisted
// as tiny localStorage flags (never in the doc) so reopening the app lands on the month
// and view the user was last on, instead of snapping back to today's month every time.
const MONTH_KEY = "caja:monthIndex";
function readMonthIndex(): number {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(MONTH_KEY) : null;
    const n = raw == null ? NaN : Number(raw);
    // Default to January (0) on a fresh install; a saved value (resume) wins.
    return Number.isInteger(n) && n >= 0 && n <= 11 ? n : 0;
  } catch {
    return 0;
  }
}
function writeMonthIndex(i: number): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(MONTH_KEY, String(i));
  } catch {
    /* ignore */
  }
}

const NAV_KEY = "caja:nav";
const NAV_VALUES: NavView[] = ["home", "month", "panel", "resumen", "allBiz"];
function readNav(): NavView {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(NAV_KEY) : null;
    return raw && (NAV_VALUES as string[]).includes(raw) ? (raw as NavView) : "home";
  } catch {
    return "home";
  }
}
function writeNav(nav: NavView): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(NAV_KEY, nav);
  } catch {
    /* ignore */
  }
}

export interface UIState {
  monthIndex: number;
  /** Which top-level screen is shown in the main area. */
  nav: NavView;
  /** Collapsed (icon-only) sidebar — persisted preference. */
  sidebarCollapsed: boolean;
  /** Order of the "Vista" nav tabs — drag-reorderable, persisted preference. */
  navOrder: NavView[];
  /** Third KPI card: the month's net ("Te queda") or the fiscal tables' saldo final. */
  balanceMode: BalanceMode;
  /** Table ids opted out of their KPI total — an ephemeral "what-if" for the month view. */
  kpiExclusions: ReadonlySet<string>;
  /** A copied table held in a session clipboard (never persisted to the doc) for paste-into-month. */
  clipboardTable: Table | null;
  /** Active "send a value" flow (#7): the value picked up + the source cell key to exclude. */
  sendValue: { value: string; sourceKey: string } | null;
  /** Every selected widget. One-widget selection is just a set of size 1. */
  selectedIds: ReadonlySet<string>;
  /** The single selected widget, or null when zero or several are selected. */
  selectedWidgetId: string | null;
  zoom: number;
  view: ViewMode;
  modal: ModalKind;
  /** When the project modal is open: the project being renamed, or null to create a new one. */
  editProjectId: string | null;
  /** Target table for table-scoped modals ("categories" / "recurring"). */
  modalTableId: string | null;
  quickAddOpen: boolean;
  toasts: Toast[];

  setMonth(i: number): void;
  goTo(nav: NavView): void;
  toggleSidebar(): void;
  setSidebarCollapsed(collapsed: boolean): void;
  setNavOrder(order: NavView[]): void;
  toggleKpiExclusion(tableId: string): void;
  /** Flip the third KPI card between "Te queda" and "Saldo final". */
  toggleBalanceMode(): void;
  copyTableToClipboard(table: Table | null): void;
  startSendValue(value: string, sourceKey: string): void;
  cancelSendValue(): void;
  editProject(projectId: string | null): void;
  select(widgetId: string | null): void;
  /** Add/remove one widget from the selection (Ctrl/Shift+click). */
  toggleSelect(widgetId: string): void;
  /** Replace the selection wholesale (marquee, select-all). */
  selectMany(widgetIds: Iterable<string>): void;
  clearSelection(): void;
  setZoom(z: number): void;
  zoomIn(): void;
  zoomOut(): void;
  resetZoom(): void;
  setView(v: ViewMode): void;
  openModal(m: ModalKind, tableId?: string | null): void;
  closeModal(): void;
  setQuickAdd(open: boolean): void;
  toast(message: string, tone?: ToastTone): void;
  dismissToast(id: string): void;
}

const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));

export const useUI = create<UIState>((set, get) => ({
  monthIndex: readMonthIndex(),
  nav: readNav(),
  sidebarCollapsed: readSidebarCollapsed(),
  navOrder: readNavOrder(),
  balanceMode: "teQueda",
  kpiExclusions: new Set<string>(),
  clipboardTable: null,
  sendValue: null,
  selectedIds: new Set<string>(),
  selectedWidgetId: null,
  zoom: 1,
  view: "canvas",
  modal: "none",
  editProjectId: null,
  modalTableId: null,
  quickAddOpen: false,
  toasts: [],

  setMonth: (i) => {
    const monthIndex = Math.max(0, Math.min(11, i));
    writeMonthIndex(monthIndex);
    writeNav("month");
    set({ monthIndex, nav: "month", selectedIds: new Set<string>(), selectedWidgetId: null });
  },
  goTo: (nav) => {
    writeNav(nav);
    set({ nav, selectedIds: new Set<string>(), selectedWidgetId: null });
  },
  toggleSidebar: () =>
    set((s) => {
      const sidebarCollapsed = !s.sidebarCollapsed;
      writeSidebarCollapsed(sidebarCollapsed);
      return { sidebarCollapsed };
    }),
  setSidebarCollapsed: (sidebarCollapsed) => {
    writeSidebarCollapsed(sidebarCollapsed);
    set({ sidebarCollapsed });
  },
  setNavOrder: (navOrder) => {
    writeNavOrder(navOrder);
    set({ navOrder });
  },
  toggleBalanceMode: () =>
    set((s) => ({ balanceMode: s.balanceMode === "teQueda" ? "saldoFinal" : "teQueda" })),
  toggleKpiExclusion: (tableId) =>
    set((s) => {
      const next = new Set(s.kpiExclusions);
      if (next.has(tableId)) next.delete(tableId);
      else next.add(tableId);
      return { kpiExclusions: next };
    }),
  copyTableToClipboard: (clipboardTable) => set({ clipboardTable }),
  startSendValue: (value, sourceKey) => set({ sendValue: { value, sourceKey } }),
  cancelSendValue: () => set({ sendValue: null }),
  editProject: (editProjectId) => set({ editProjectId }),
  select: (widgetId) =>
    set({
      selectedIds: widgetId ? new Set([widgetId]) : new Set<string>(),
      selectedWidgetId: widgetId,
    }),
  toggleSelect: (widgetId) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(widgetId)) next.delete(widgetId);
      else next.add(widgetId);
      return { selectedIds: next, selectedWidgetId: next.size === 1 ? [...next][0] : null };
    }),
  selectMany: (widgetIds) =>
    set(() => {
      const next = new Set(widgetIds);
      return { selectedIds: next, selectedWidgetId: next.size === 1 ? [...next][0] : null };
    }),
  clearSelection: () => set({ selectedIds: new Set<string>(), selectedWidgetId: null }),
  setZoom: (z) => set({ zoom: clampZoom(z) }),
  zoomIn: () => set({ zoom: clampZoom(get().zoom + 0.1) }),
  zoomOut: () => set({ zoom: clampZoom(get().zoom - 0.1) }),
  resetZoom: () => set({ zoom: 1 }),
  setView: (view) => set({ view }),
  openModal: (modal, tableId = null) => set({ modal, modalTableId: tableId }),
  closeModal: () => set({ modal: "none", modalTableId: null }),
  setQuickAdd: (quickAddOpen) => set({ quickAddOpen }),

  toast: (message, tone = "info") => {
    const t: Toast = { id: nanoid(), message, tone };
    set((s) => ({ toasts: [...s.toasts, t] }));
    setTimeout(() => get().dismissToast(t.id), 3500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

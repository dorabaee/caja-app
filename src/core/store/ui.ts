import { create } from "zustand";
import { nanoid } from "nanoid";

export type ModalKind =
  | "none"
  | "settings"
  | "newProject"
  | "share"
  | "addTable"
  | "backup"
  | "categories"
  | "recurring";
export type ViewMode = "canvas" | "list";
/** Top-level screen in the main area (driven by the sidebar + month strip). */
export type NavView = "month" | "panel" | "resumen" | "allBiz";
export type ToastTone = "info" | "success" | "error";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2;

export interface UIState {
  monthIndex: number;
  /** Which top-level screen is shown in the main area. */
  nav: NavView;
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
  editProject(projectId: string | null): void;
  select(widgetId: string | null): void;
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
  monthIndex: new Date().getMonth(),
  nav: "month",
  selectedWidgetId: null,
  zoom: 1,
  view: "canvas",
  modal: "none",
  editProjectId: null,
  modalTableId: null,
  quickAddOpen: false,
  toasts: [],

  setMonth: (i) =>
    set({ monthIndex: Math.max(0, Math.min(11, i)), nav: "month", selectedWidgetId: null }),
  goTo: (nav) => set({ nav, selectedWidgetId: null }),
  editProject: (editProjectId) => set({ editProjectId }),
  select: (widgetId) => set({ selectedWidgetId: widgetId }),
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

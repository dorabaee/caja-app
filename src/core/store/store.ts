import { create } from "zustand";
import { type Draft, produce } from "immer";
import {
  type AppDoc,
  type ChartType,
  type ColumnType,
  type Project,
  type RecurringDef,
  type Settings,
  type Table,
  type TableKind,
  type WidgetLayout,
} from "../model/types";
import {
  cloneMonth,
  cloneTable,
  id,
  makeChart,
  makeColumn,
  makeRow,
  makeTableFromTemplate,
  newAppDoc,
  newProject,
  newTemplateProject,
  nextWidgetSlot,
  MIN_COLUMN_WIDTH,
  type TemplateKey,
} from "../model/defaults";
import { nextRowValues } from "../compute/rows";

const HISTORY_LIMIT = 60;

export interface StoreState {
  doc: AppDoc;
  past: AppDoc[];
  future: AppDoc[];

  // boot / lifecycle
  load(doc: AppDoc): void;

  // settings
  updateSettings(patch: Partial<Settings>): void;

  // projects
  createProject(name: string, template?: TemplateKey | "empty"): string;
  renameProject(projectId: string, name: string): void;
  deleteProject(projectId: string): void;
  selectProject(projectId: string): void;
  updateProject(projectId: string, patch: Partial<Project>): void;
  /** Reorder businesses to match the given id order (sidebar drag-reorder; persisted + undoable). */
  setProjectOrder(orderedIds: string[]): void;

  // recurring entries (per project)
  addRecurring(projectId: string, def: Omit<RecurringDef, "id">): string;
  updateRecurring(projectId: string, defId: string, patch: Partial<Omit<RecurringDef, "id">>): void;
  removeRecurring(projectId: string, defId: string): void;
  setRecurringOverrideCell(
    projectId: string,
    defId: string,
    monthIndex: number,
    columnName: string,
    value: string,
  ): void;
  skipRecurringOccurrence(projectId: string, defId: string, monthIndex: number, skip: boolean): void;

  // tables (current project)
  addTable(monthIndex: number, template: TemplateKey): string;
  removeTable(monthIndex: number, tableId: string): void;
  /** Clone a table into the same month; returns the new table's id (for auto-select). */
  duplicateTable(monthIndex: number, tableId: string): string;
  /** Paste a (copied) table into a month, with or without its data; returns the new id. */
  pasteTable(dstMonthIndex: number, table: Table, withData: boolean): string;
  /** Replace each target month with a clone of the source month (layout, or layout + data). */
  copyMonthInto(sourceMonthIndex: number, targetMonthIndices: number[], withData: boolean): void;
  setTableTitle(monthIndex: number, tableId: string, title: string): void;
  setTableKind(monthIndex: number, tableId: string, kind: TableKind): void;
  setTableInitialBalance(monthIndex: number, tableId: string, value: number): void;
  setWidgetLayout(monthIndex: number, widgetId: string, layout: Partial<WidgetLayout>): void;

  // columns
  addColumn(monthIndex: number, tableId: string, type: ColumnType): void;
  removeColumn(monthIndex: number, tableId: string, columnId: string): void;
  renameColumn(monthIndex: number, tableId: string, columnId: string, name: string): void;
  setColumnType(monthIndex: number, tableId: string, columnId: string, type: ColumnType): void;
  /** Mark a column as the table's category column (clears the flag from others). */
  setColumnCategory(monthIndex: number, tableId: string, columnId: string | null): void;
  /** Set a fixed px width for a column (drag-resize), or null to revert to flex. */
  setColumnWidth(monthIndex: number, tableId: string, columnId: string, width: number | null): void;

  // rows
  addRow(monthIndex: number, tableId: string): void;
  addRowWithValues(monthIndex: number, tableId: string, values: Record<string, string>): string;
  removeRow(monthIndex: number, tableId: string, rowId: string): void;
  duplicateRow(monthIndex: number, tableId: string, rowId: string): void;
  setCell(monthIndex: number, tableId: string, rowId: string, columnId: string, value: string): void;
  setNote(monthIndex: number, tableId: string, rowId: string, columnId: string, note: string): void;

  // charts
  addChart(monthIndex: number, linkedTableIds?: string[]): string;
  removeChart(monthIndex: number, chartId: string): void;
  updateChart(
    monthIndex: number,
    chartId: string,
    patch: Partial<{ type: ChartType; title: string; linkedTableIds: string[]; xColumnId: string | null; valueColumnId: string | null }>,
  ): void;

  // history
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

export const useStore = create<StoreState>()((set, get) => {
  /** Apply an immutable change to the doc, recording history. */
  const commit = (recipe: (d: Draft<AppDoc>) => void) => {
    const prev = get().doc;
    const next = produce(prev, recipe);
    if (next === prev) return;
    set((s) => ({ doc: next, past: [...s.past, prev].slice(-HISTORY_LIMIT), future: [] }));
  };

  const currentProject = (d: Draft<AppDoc>): Draft<Project> | undefined =>
    d.projects.find((p) => p.id === d.currentProjectId);

  const findTable = (d: Draft<AppDoc>, monthIndex: number, tableId: string): Draft<Table> | undefined =>
    currentProject(d)?.months[monthIndex]?.tables.find((t) => t.id === tableId);

  return {
    doc: newAppDoc(),
    past: [],
    future: [],

    load: (doc) => set({ doc, past: [], future: [] }),

    updateSettings: (patch) =>
      commit((d) => {
        Object.assign(d.settings, patch);
      }),

    createProject: (name, template = "empty") => {
      const project =
        template === "empty" || template === "blank"
          ? newProject(name || "Negocio sin nombre")
          : template === "income" || template === "expense" || template === "ledger"
            ? newTemplateProject(name || "Negocio sin nombre")
            : newTemplateProject(name || "Negocio sin nombre");
      commit((d) => {
        const first = d.projects.length === 0;
        d.projects.push(project);
        d.currentProjectId = project.id;
        d.settings.onboarded = true;
        if (first) d.settings.runTour = true; // guided tour on the very first business
      });
      return project.id;
    },

    renameProject: (projectId, name) =>
      commit((d) => {
        const p = d.projects.find((x) => x.id === projectId);
        if (p) p.name = name;
      }),

    deleteProject: (projectId) =>
      commit((d) => {
        d.projects = d.projects.filter((p) => p.id !== projectId);
        if (d.currentProjectId === projectId) d.currentProjectId = d.projects[0]?.id ?? null;
      }),

    selectProject: (projectId) =>
      commit((d) => {
        d.currentProjectId = projectId;
      }),

    updateProject: (projectId, patch) =>
      commit((d) => {
        const p = d.projects.find((x) => x.id === projectId);
        if (p) Object.assign(p, patch);
      }),

    setProjectOrder: (orderedIds) =>
      commit((d) => {
        // Stable sort by the requested order; any id not listed sorts to the end.
        const rank = new Map(orderedIds.map((id, i) => [id, i] as const));
        d.projects.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
      }),

    addRecurring: (projectId, def) => {
      const newId = id();
      commit((d) => {
        const p = d.projects.find((x) => x.id === projectId);
        if (!p) return;
        if (!p.recurring) p.recurring = [];
        p.recurring.push({ ...def, id: newId });
      });
      return newId;
    },

    updateRecurring: (projectId, defId, patch) =>
      commit((d) => {
        const def = d.projects.find((x) => x.id === projectId)?.recurring?.find((r) => r.id === defId);
        if (def) Object.assign(def, patch);
      }),

    removeRecurring: (projectId, defId) =>
      commit((d) => {
        const p = d.projects.find((x) => x.id === projectId);
        if (p?.recurring) p.recurring = p.recurring.filter((r) => r.id !== defId);
      }),

    setRecurringOverrideCell: (projectId, defId, monthIndex, columnName, value) =>
      commit((d) => {
        const def = d.projects.find((x) => x.id === projectId)?.recurring?.find((r) => r.id === defId);
        if (!def) return;
        if (!def.overrides) def.overrides = {};
        const ov = (def.overrides[monthIndex] ??= {});
        if (!ov.cells) ov.cells = {};
        ov.cells[columnName] = value;
      }),

    skipRecurringOccurrence: (projectId, defId, monthIndex, skip) =>
      commit((d) => {
        const def = d.projects.find((x) => x.id === projectId)?.recurring?.find((r) => r.id === defId);
        if (!def) return;
        if (!def.overrides) def.overrides = {};
        const ov = (def.overrides[monthIndex] ??= {});
        ov.skip = skip;
      }),

    addTable: (monthIndex, template) => {
      const newId = id();
      commit((d) => {
        const month = currentProject(d)?.months[monthIndex];
        if (!month) return;
        const t = makeTableFromTemplate(template);
        const slot = nextWidgetSlot([...month.tables, ...month.charts], t.layout);
        t.layout.x = slot.x;
        t.layout.y = slot.y;
        t.id = newId;
        month.tables.push(t);
      });
      return newId;
    },

    removeTable: (monthIndex, tableId) =>
      commit((d) => {
        const month = currentProject(d)?.months[monthIndex];
        if (!month) return;
        month.tables = month.tables.filter((t) => t.id !== tableId);
        // Drop the deleted table from every chart that referenced it.
        month.charts.forEach((c) => {
          c.linkedTableIds = c.linkedTableIds.filter((id) => id !== tableId);
        });
      }),

    duplicateTable: (monthIndex, tableId) => {
      let newId = "";
      commit((d) => {
        const month = currentProject(d)?.months[monthIndex];
        const src = month?.tables.find((t) => t.id === tableId);
        if (!month || !src) return;
        const clone = cloneTable(src, { withData: true, titleSuffix: " (copia)" });
        newId = clone.id;
        clone.layout = { ...src.layout, x: src.layout.x + 32, y: src.layout.y + 32 };
        month.tables.push(clone);
      });
      return newId;
    },

    pasteTable: (dstMonthIndex, table, withData) => {
      let newId = "";
      commit((d) => {
        const month = currentProject(d)?.months[dstMonthIndex];
        if (!month) return;
        const clone = cloneTable(table, { withData });
        newId = clone.id;
        // Shelf-place by real size so it never lands on top of an existing widget.
        const slot = nextWidgetSlot([...month.tables, ...month.charts], clone.layout);
        clone.layout = { ...clone.layout, x: slot.x, y: slot.y };
        month.tables.push(clone);
      });
      return newId;
    },

    copyMonthInto: (sourceMonthIndex, targetMonthIndices, withData) =>
      commit((d) => {
        const p = currentProject(d);
        const src = p?.months[sourceMonthIndex];
        if (!p || !src) return;
        for (const ti of targetMonthIndices) {
          if (ti === sourceMonthIndex || ti < 0 || ti > 11) continue;
          p.months[ti] = cloneMonth(src, withData); // fresh ids per target; replaces content
        }
      }),

    setTableTitle: (monthIndex, tableId, title) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (t) t.title = title;
      }),

    setTableKind: (monthIndex, tableId, kind) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (t) t.kind = kind;
      }),

    setTableInitialBalance: (monthIndex, tableId, value) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (t) t.initialBalance = value;
      }),

    setWidgetLayout: (monthIndex, widgetId, layout) =>
      commit((d) => {
        const month = currentProject(d)?.months[monthIndex];
        if (!month) return;
        const t = month.tables.find((x) => x.id === widgetId);
        if (t) {
          Object.assign(t.layout, layout);
          return;
        }
        const c = month.charts.find((x) => x.id === widgetId);
        if (c) Object.assign(c.layout, layout);
      }),

    addColumn: (monthIndex, tableId, type) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (!t) return;
        const labels: Record<ColumnType, string> = { money: "Monto", text: "Texto", date: "Fecha" };
        const col = makeColumn(labels[type], type);
        t.columns.push(col);
        for (const r of t.rows) r.cells[col.id] = "";
      }),

    removeColumn: (monthIndex, tableId, columnId) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (!t) return;
        t.columns = t.columns.filter((c) => c.id !== columnId);
        for (const r of t.rows) delete r.cells[columnId];
      }),

    renameColumn: (monthIndex, tableId, columnId, name) =>
      commit((d) => {
        const c = findTable(d, monthIndex, tableId)?.columns.find((x) => x.id === columnId);
        if (c) c.name = name;
      }),

    setColumnType: (monthIndex, tableId, columnId, type) =>
      commit((d) => {
        const c = findTable(d, monthIndex, tableId)?.columns.find((x) => x.id === columnId);
        if (c) c.type = type;
      }),

    setColumnCategory: (monthIndex, tableId, columnId) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (!t) return;
        for (const c of t.columns) {
          if (columnId && c.id === columnId) c.category = true;
          else delete c.category;
        }
      }),

    setColumnWidth: (monthIndex, tableId, columnId, width) =>
      commit((d) => {
        const c = findTable(d, monthIndex, tableId)?.columns.find((x) => x.id === columnId);
        if (!c) return;
        if (width == null) delete c.width;
        else c.width = Math.max(MIN_COLUMN_WIDTH, Math.round(width));
      }),

    addRow: (monthIndex, tableId) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (t) t.rows.push(makeRow(t.columns, nextRowValues(t.columns, t.rows)));
      }),

    addRowWithValues: (monthIndex, tableId, values) => {
      const newId = id();
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (!t) return;
        const row = makeRow(t.columns, values);
        row.id = newId;
        t.rows.push(row);
      });
      return newId;
    },

    removeRow: (monthIndex, tableId, rowId) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (t) t.rows = t.rows.filter((r) => r.id !== rowId);
      }),

    duplicateRow: (monthIndex, tableId, rowId) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (!t) return;
        const idx = t.rows.findIndex((r) => r.id === rowId);
        if (idx < 0) return;
        const src = t.rows[idx];
        t.rows.splice(idx + 1, 0, {
          id: id(),
          cells: { ...src.cells },
          notes: { ...(src.notes ?? {}) },
          links: { ...(src.links ?? {}) },
        });
      }),

    setCell: (monthIndex, tableId, rowId, columnId, value) =>
      commit((d) => {
        const r = findTable(d, monthIndex, tableId)?.rows.find((x) => x.id === rowId);
        if (r) r.cells[columnId] = value;
      }),

    setNote: (monthIndex, tableId, rowId, columnId, note) =>
      commit((d) => {
        const r = findTable(d, monthIndex, tableId)?.rows.find((x) => x.id === rowId);
        if (!r) return;
        if (!r.notes) r.notes = {};
        if (note) r.notes[columnId] = note;
        else delete r.notes[columnId];
      }),

    addChart: (monthIndex, linkedTableIds = []) => {
      const newId = id();
      commit((d) => {
        const month = currentProject(d)?.months[monthIndex];
        if (!month) return;
        const c = makeChart(linkedTableIds, "bar");
        const slot = nextWidgetSlot([...month.tables, ...month.charts], c.layout);
        c.layout.x = slot.x;
        c.layout.y = slot.y;
        c.id = newId;
        month.charts.push(c);
      });
      return newId;
    },

    removeChart: (monthIndex, chartId) =>
      commit((d) => {
        const month = currentProject(d)?.months[monthIndex];
        if (month) month.charts = month.charts.filter((c) => c.id !== chartId);
      }),

    updateChart: (monthIndex, chartId, patch) =>
      commit((d) => {
        const c = currentProject(d)?.months[monthIndex]?.charts.find((x) => x.id === chartId);
        if (c) Object.assign(c, patch);
      }),

    undo: () => {
      const { past, doc, future } = get();
      if (!past.length) return;
      const prev = past[past.length - 1];
      set({ doc: prev, past: past.slice(0, -1), future: [doc, ...future].slice(0, HISTORY_LIMIT) });
    },

    redo: () => {
      const { past, doc, future } = get();
      if (!future.length) return;
      const next = future[0];
      set({ doc: next, past: [...past, doc].slice(-HISTORY_LIMIT), future: future.slice(1) });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  };
});

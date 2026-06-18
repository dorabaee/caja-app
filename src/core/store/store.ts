import { create } from "zustand";
import { type Draft, produce } from "immer";
import {
  type AppDoc,
  type Attachment,
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
  id,
  makeChart,
  makeColumn,
  makeRow,
  makeTableFromTemplate,
  newAppDoc,
  newProject,
  newTemplateProject,
  type TemplateKey,
} from "../model/defaults";

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
  duplicateTable(monthIndex: number, tableId: string): void;
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

  // rows
  addRow(monthIndex: number, tableId: string): void;
  addRowWithValues(monthIndex: number, tableId: string, values: Record<string, string>): string;
  removeRow(monthIndex: number, tableId: string, rowId: string): void;
  duplicateRow(monthIndex: number, tableId: string, rowId: string): void;
  setCell(monthIndex: number, tableId: string, rowId: string, columnId: string, value: string): void;
  setNote(monthIndex: number, tableId: string, rowId: string, columnId: string, note: string): void;
  addAttachment(monthIndex: number, tableId: string, rowId: string, attachment: Attachment): void;
  removeAttachment(monthIndex: number, tableId: string, rowId: string, attachmentId: string): void;

  // charts
  addChart(monthIndex: number, linkedTableId: string | null): string;
  removeChart(monthIndex: number, chartId: string): void;
  updateChart(
    monthIndex: number,
    chartId: string,
    patch: Partial<{ type: ChartType; title: string; linkedTableId: string | null; xColumnId: string | null; valueColumnId: string | null }>,
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
        const count = month.tables.length + month.charts.length;
        const t = makeTableFromTemplate(template, {
          x: 24 + (count % 3) * 432,
          y: 24 + Math.floor(count / 3) * 460,
        });
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
        month.charts.forEach((c) => {
          if (c.linkedTableId === tableId) c.linkedTableId = null;
        });
      }),

    duplicateTable: (monthIndex, tableId) =>
      commit((d) => {
        const month = currentProject(d)?.months[monthIndex];
        const src = month?.tables.find((t) => t.id === tableId);
        if (!month || !src) return;
        const clone: Table = JSON.parse(JSON.stringify(src));
        clone.id = id();
        clone.title = `${src.title} (copia)`;
        clone.columns = clone.columns.map((c) => ({ ...c, id: id() }));
        // remap cells to new column ids
        const idMap = new Map(src.columns.map((c, i) => [c.id, clone.columns[i].id]));
        clone.rows = clone.rows.map((r) => {
          const cells: Record<string, string> = {};
          for (const [oldId, val] of Object.entries(r.cells)) {
            const nid = idMap.get(oldId);
            if (nid) cells[nid] = val;
          }
          return { id: id(), cells, notes: {}, links: {} };
        });
        clone.layout = { ...src.layout, x: src.layout.x + 32, y: src.layout.y + 32 };
        month.tables.push(clone);
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

    addRow: (monthIndex, tableId) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (t) t.rows.push(makeRow(t.columns));
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

    addAttachment: (monthIndex, tableId, rowId, attachment) =>
      commit((d) => {
        const r = findTable(d, monthIndex, tableId)?.rows.find((x) => x.id === rowId);
        if (!r) return;
        if (!r.attachments) r.attachments = [];
        r.attachments.push(attachment);
      }),

    removeAttachment: (monthIndex, tableId, rowId, attachmentId) =>
      commit((d) => {
        const r = findTable(d, monthIndex, tableId)?.rows.find((x) => x.id === rowId);
        if (!r?.attachments) return;
        r.attachments = r.attachments.filter((a) => a.id !== attachmentId);
      }),

    addChart: (monthIndex, linkedTableId) => {
      const newId = id();
      commit((d) => {
        const month = currentProject(d)?.months[monthIndex];
        if (!month) return;
        const count = month.tables.length + month.charts.length;
        const c = makeChart(linkedTableId, "bar", {
          x: 24 + (count % 3) * 432,
          y: 24 + Math.floor(count / 3) * 460,
        });
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

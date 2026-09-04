import { create } from "zustand";
import { type Draft, produce } from "immer";
import {
  type AppDoc,
  type BankKey,
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
import { parseMoney } from "../format/money";
import { parseDateCell } from "../format/date";

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
  removeProjectCategory(projectId: string, name: string, group: "fiscal" | "noFiscal"): void;
  renameProjectCategory(projectId: string, oldName: string, group: "fiscal" | "noFiscal", newName: string): void;
  /** Reorder businesses to match the given id order (sidebar drag-reorder; persisted + undoable). */
  setProjectOrder(orderedIds: string[]): void;
  /** Add a bank the user named themselves; returns its id. */
  addCustomBank(projectId: string, name: string): string;
  /** Forget a custom bank, and untag any table still pointing at it. */
  removeCustomBank(projectId: string, bankId: string): void;

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
  /** Mark a table as fiscal (counts toward the month's Saldo final; shows a bank tag). */
  setTableFiscal(monthIndex: number, tableId: string, fiscal: boolean): void;
  /** Tag a fiscal table with the bank account it tracks, or null to clear it. */
  setTableBank(monthIndex: number, tableId: string, bank: BankKey | null): void;
  setWidgetLayout(monthIndex: number, widgetId: string, layout: Partial<WidgetLayout>): void;
  /** Shift several widgets by the same delta — one undo step for the whole group. */
  moveWidgets(monthIndex: number, widgetIds: string[], dx: number, dy: number): void;
  /** Delete several widgets (tables and/or charts) in one undoable step. */
  removeWidgets(monthIndex: number, widgetIds: string[]): void;
  /** Clone several widgets, offset slightly; returns the new ids. */
  duplicateWidgets(monthIndex: number, widgetIds: string[]): string[];
  /** Raise widgets above every other widget in the month (bring to front). */
  raiseWidgets(monthIndex: number, widgetIds: string[]): void;

  // columns
  addColumn(monthIndex: number, tableId: string, type: ColumnType): void;
  removeColumn(monthIndex: number, tableId: string, columnId: string): void;
  /** Delete several columns in one undoable step (the table edit mode's ✓). */
  removeColumns(monthIndex: number, tableId: string, columnIds: string[]): void;
  renameColumn(monthIndex: number, tableId: string, columnId: string, name: string): void;
  setColumnType(monthIndex: number, tableId: string, columnId: string, type: ColumnType): void;
  /** Set (or clear, with "") the row's own category — never touches its cells. */
  setRowCategory(monthIndex: number, tableId: string, rowId: string, category: string, group?: "fiscal" | "noFiscal"): void;
  /** Mark a column as the table's category column (clears the flag from others). */
  setColumnCategory(monthIndex: number, tableId: string, columnId: string | null): void;
  /** Reorder a table's columns to match the given id order (reorder mode's ✓). */
  setColumnOrder(monthIndex: number, tableId: string, orderedIds: string[]): void;
  /** Set a fixed px width for a column (drag-resize), or null to revert to flex. */
  setColumnWidth(monthIndex: number, tableId: string, columnId: string, width: number | null): void;

  // rows
  addRow(monthIndex: number, tableId: string): void;
  addRowWithValues(monthIndex: number, tableId: string, values: Record<string, string>): string;
  /** Permanently sort saved rows by one column. */
  sortRows(monthIndex: number, tableId: string, columnId: string, direction: "asc" | "desc"): void;
  removeRow(monthIndex: number, tableId: string, rowId: string): void;
  duplicateRow(monthIndex: number, tableId: string, rowId: string): void;
  /** Reorder a table's rows to match the given id order (row-reorder mode's ✓). */
  setRowOrder(monthIndex: number, tableId: string, orderedIds: string[]): void;
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

    removeProjectCategory: (projectId, name, group) =>
      commit((d) => {
        const p = d.projects.find((x) => x.id === projectId);
        if (!p) return;
        p.categories = (p.categories ?? []).filter((c) => !(c.name === name && c.group === group));
        for (const month of p.months ?? [])
          for (const table of month.tables ?? [])
            for (const row of table.rows ?? [])
              if (row.category === name && (row.categoryGroup ?? (table.fiscal ? "fiscal" : "noFiscal")) === group) {
                delete row.category;
                delete row.categoryGroup;
              }
      }),
    renameProjectCategory: (projectId, oldName, group, newName) =>
      commit((d) => {
        const p = d.projects.find((x) => x.id === projectId);
        if (!p || !newName.trim()) return;
        const duplicate = (p.categories ?? []).some((c) => c.group === group && c.name.toLowerCase() === newName.trim().toLowerCase() && c.name !== oldName);
        if (duplicate) return;
        const cat = (p.categories ?? []).find((c) => c.group === group && c.name === oldName);
        if (cat) cat.name = newName.trim();
        for (const month of p.months ?? []) for (const table of month.tables ?? []) for (const row of table.rows ?? [])
          if (row.category === oldName && (row.categoryGroup ?? (table.fiscal ? "fiscal" : "noFiscal")) === group) row.category = newName.trim();
      }),

    setProjectOrder: (orderedIds) =>
      commit((d) => {
        // Stable sort by the requested order; any id not listed sorts to the end.
        const rank = new Map(orderedIds.map((id, i) => [id, i] as const));
        d.projects.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
      }),

    addCustomBank: (projectId, name) => {
      const bankId = id();
      commit((d) => {
        const p = d.projects.find((x) => x.id === projectId);
        if (!p) return;
        p.banks = [...(p.banks ?? []), { id: bankId, name }];
      });
      return bankId;
    },

    removeCustomBank: (projectId, bankId) =>
      commit((d) => {
        const p = d.projects.find((x) => x.id === projectId);
        if (!p) return;
        p.banks = (p.banks ?? []).filter((b) => b.id !== bankId);
        // A table tagged with a bank that no longer exists would render no tag at all;
        // clear the reference so its fiscal state stays coherent.
        for (const month of p.months) {
          for (const t of month.tables) if (t.bank === bankId) delete t.bank;
        }
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
        const t = makeTableFromTemplate(template, undefined, monthIndex);
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

    setTableFiscal: (monthIndex, tableId, fiscal) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (!t) return;
        if (fiscal) t.fiscal = true;
        else {
          // Leaving fiscal drops what only a fiscal table can carry, so re-marking it
          // later starts clean rather than resurrecting a stale bank tag.
          delete t.fiscal;
          delete t.bank;
        }
      }),

    setTableBank: (monthIndex, tableId, bank) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (!t) return;
        if (bank) t.bank = bank;
        else delete t.bank;
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

    moveWidgets: (monthIndex, widgetIds, dx, dy) =>
      commit((d) => {
        const month = currentProject(d)?.months[monthIndex];
        if (!month || !widgetIds.length) return;
        const ids = new Set(widgetIds);
        for (const w of [...month.tables, ...month.charts]) {
          if (!ids.has(w.id)) continue;
          w.layout.x = Math.max(0, Math.round(w.layout.x + dx));
          w.layout.y = Math.max(0, Math.round(w.layout.y + dy));
        }
      }),

    removeWidgets: (monthIndex, widgetIds) =>
      commit((d) => {
        const month = currentProject(d)?.months[monthIndex];
        if (!month || !widgetIds.length) return;
        const ids = new Set(widgetIds);
        month.tables = month.tables.filter((t) => !ids.has(t.id));
        month.charts = month.charts.filter((c) => !ids.has(c.id));
        // A chart pointing at a table that just went away would render empty forever.
        for (const c of month.charts) c.linkedTableIds = c.linkedTableIds.filter((id) => !ids.has(id));
      }),

    duplicateWidgets: (monthIndex, widgetIds) => {
      const newIds: string[] = [];
      commit((d) => {
        const month = currentProject(d)?.months[monthIndex];
        if (!month || !widgetIds.length) return;
        const ids = new Set(widgetIds);
        const OFFSET = 24;
        for (const t of month.tables.filter((t) => ids.has(t.id))) {
          const clone = cloneTable(t);
          clone.layout = { ...t.layout, x: t.layout.x + OFFSET, y: t.layout.y + OFFSET };
          month.tables.push(clone);
          newIds.push(clone.id);
        }
        for (const c of month.charts.filter((c) => ids.has(c.id))) {
          const clone = { ...c, id: id(), layout: { ...c.layout, x: c.layout.x + OFFSET, y: c.layout.y + OFFSET } };
          month.charts.push(clone);
          newIds.push(clone.id);
        }
      });
      return newIds;
    },

    raiseWidgets: (monthIndex, widgetIds) =>
      commit((d) => {
        const month = currentProject(d)?.months[monthIndex];
        if (!month || !widgetIds.length) return;
        const all = [...month.tables, ...month.charts];
        const top = all.reduce((m, w) => Math.max(m, w.layout.z ?? 0), 0);
        const ids = new Set(widgetIds);
        let n = top;
        for (const w of all) if (ids.has(w.id)) w.layout.z = ++n;
      }),

    addColumn: (monthIndex, tableId, type) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (!t) return;
        const labels: Record<ColumnType, string> = {
          money: "Monto",
          text: "Texto",
          date: "Fecha",
          category: "Categoría",
        };
        // Only one column can be the category picker; adding a dedicated one takes the
        // job away from whichever column held it, so a row never has two pickers.
        if (type === "category") for (const c of t.columns) delete c.withCategory;
        const col = makeColumn(labels[type], type);
        t.columns.push(col);
        for (const r of t.rows) r.cells[col.id] = "";
      }),

    removeColumn: (monthIndex, tableId, columnId) => get().removeColumns(monthIndex, tableId, [columnId]),

    removeColumns: (monthIndex, tableId, columnIds) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (!t || !columnIds.length) return;
        const drop = new Set(columnIds);
        const kept = t.columns.filter((c) => !drop.has(c.id));
        // A table without columns has no cells to edit and no way back — always keep one.
        if (!kept.length) return;
        t.columns = kept;
        for (const r of t.rows) {
          for (const cid of drop) {
            delete r.cells[cid];
            if (r.notes) delete r.notes[cid];
            if (r.links) delete r.links[cid];
          }
        }
      }),

    renameColumn: (monthIndex, tableId, columnId, name) =>
      commit((d) => {
        const c = findTable(d, monthIndex, tableId)?.columns.find((x) => x.id === columnId);
        if (c) c.name = name;
      }),

    setColumnType: (monthIndex, tableId, columnId, type) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        const c = t?.columns.find((x) => x.id === columnId);
        if (!t || !c) return;
        c.type = type;
        // Only one column picks categories: becoming the dedicated one takes the job
        // from any merged column, and leaving "text" gives up the merged face.
        if (type === "category") for (const other of t.columns) delete other.withCategory;
        else if (type !== "text") delete c.withCategory;
      }),

    setRowCategory: (monthIndex, tableId, rowId, category, group) =>
      commit((d) => {
        const r = findTable(d, monthIndex, tableId)?.rows.find((x) => x.id === rowId);
        if (!r) return;
        if (category) {
          r.category = category;
          if (group) r.categoryGroup = group;
          else delete r.categoryGroup;
        } else {
          delete r.category;
          delete r.categoryGroup;
        }
      }),

    setColumnCategory: (monthIndex, tableId, columnId) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (!t) return;
        for (const c of t.columns) {
          delete c.category; // the pre-v3 flag never comes back
          if (columnId && c.id === columnId && c.type === "text") c.withCategory = true;
          else delete c.withCategory;
        }
      }),

    setColumnOrder: (monthIndex, tableId, orderedIds) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (!t) return;
        const byId = new Map(t.columns.map((c) => [c.id, c]));
        const next = orderedIds
          .map((cid) => byId.get(cid))
          .filter((c): c is (typeof t.columns)[number] => !!c);
        // Cells are keyed by column id, so only the display order moves here — anything
        // the caller didn't mention keeps its place at the end rather than vanishing.
        for (const c of t.columns) if (!orderedIds.includes(c.id)) next.push(c);
        if (next.length === t.columns.length) t.columns = next;
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
        // Quick Add is an inbox: the entry the user just created belongs at the top.
        t.rows.unshift(row);
      });
      return newId;
    },

    sortRows: (monthIndex, tableId, columnId, direction) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        const col = t?.columns.find((c) => c.id === columnId);
        if (!t || !col) return;
        const multiplier = direction === "asc" ? 1 : -1;
        // Native sort is stable in supported browsers, preserving the user's ordering
        // when two rows have the same value or neither has one.
        t.rows.sort((a, b) => {
          const left = a.cells[col.id] ?? "";
          const right = b.cells[col.id] ?? "";
          if (!left && !right) return 0;
          if (!left) return 1;
          if (!right) return -1;
          if (col.type === "money") return (parseMoney(left) - parseMoney(right)) * multiplier;
          if (col.type === "date") {
            const aDate = parseDateCell(left)?.getTime() ?? 0;
            const bDate = parseDateCell(right)?.getTime() ?? 0;
            return (aDate - bDate) * multiplier;
          }
          return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }) * multiplier;
        });
      }),

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
          ...(src.category ? { category: src.category } : {}),
          notes: { ...(src.notes ?? {}) },
          links: { ...(src.links ?? {}) },
        });
      }),

    setRowOrder: (monthIndex, tableId, orderedIds) =>
      commit((d) => {
        const t = findTable(d, monthIndex, tableId);
        if (!t) return;
        const byId = new Map(t.rows.map((r) => [r.id, r]));
        const next = orderedIds.map((rid) => byId.get(rid)).filter((r): r is (typeof t.rows)[number] => !!r);
        // Anything the caller didn't mention (stale id, concurrent add) keeps its place
        // at the end rather than vanishing.
        for (const r of t.rows) if (!orderedIds.includes(r.id)) next.push(r);
        if (next.length === t.rows.length) t.rows = next;
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

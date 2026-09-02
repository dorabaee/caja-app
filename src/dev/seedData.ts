import {
  defaultCategories,
  id,
  makeColumn,
  makeRow,
  nextWidgetSlot,
  newProject,
} from "@core/model/defaults";
import type { Column, Project, Row, Table, WidgetLayout } from "@core/model/types";

/**
 * A month's worth of made-up but realistically shaped books, for testing against full
 * tables instead of empty ones. Every figure here is fictional — see `seed.local.ts` in
 * README for pointing the seed at your own numbers without committing them.
 */

export interface SeedRow {
  date: string; // yyyy-mm-dd
  /** One value per money column, in column order. */
  amounts: (number | null)[];
  description?: string;
  /** The row's category — set apart from the description, as the app stores it. */
  category?: string;
}

export interface SeedTable {
  title: string;
  kind: Table["kind"];
  moneyColumns: string[];
  rows: SeedRow[];
  fiscal?: boolean;
  bank?: string;
  initialBalance?: number;
  layout?: Partial<WidgetLayout>;
}

export interface SeedMonth {
  monthIndex: number;
  tables: SeedTable[];
}

export interface Seed {
  projectName: string;
  months: SeedMonth[];
}

/** June, filled the way a small business actually fills it. */
export const DEMO_SEED: Seed = {
  projectName: "Negocio de ejemplo",
  months: [
    {
      monthIndex: 5,
      tables: [
        {
          title: "Entrada de Dinero",
          kind: "income",
          moneyColumns: ["VENTAS", "TRANSFERENCIAS", "OTROS"],
          rows: [
            { date: "2026-06-02", amounts: [18400, 2600, 0], description: "Venta de mostrador" },
            { date: "2026-06-03", amounts: [15250, 0, 900], description: "Pedido mayoreo" },
            { date: "2026-06-05", amounts: [21300, 4100, 0], description: "Venta de mostrador" },
            { date: "2026-06-08", amounts: [16900, 0, 0], description: "Pedido mayoreo" },
            { date: "2026-06-12", amounts: [24700, 5800, 370], description: "Venta de mostrador" },
          ],
          layout: { w: 760, h: 420 },
        },
        {
          title: "Salida de Dinero",
          kind: "expense",
          moneyColumns: ["BANCOS", "NOMINAS", "PERSONAL", "MANTENIMIENTO", "EXTRAS"],
          rows: [
            {
              date: "2026-06-02",
              amounts: [3300, 1900, 9800, null, 870],
              description: "Cubeta y trapeador",
              category: "Material e insumos",
            },
            {
              date: "2026-06-03",
              amounts: [3025, 1900, 3015, null, 1500],
              description: "Licencia del programa contable",
              category: "Gastos de oficina",
            },
            {
              date: "2026-06-05",
              amounts: [3760, 4500, 8920, null, 70],
              description: "Comida del personal",
              category: "Gastos no facturados",
            },
            { date: "2026-06-08", amounts: [13595, 400, 10055, null, null] },
            { date: "2026-06-12", amounts: [7070, 250, 12370, null, null] },
          ],
          layout: { w: 1120, h: 420 },
        },
        {
          title: "Banco Fiscal",
          kind: "ledger",
          moneyColumns: ["Depósito", "Importe del gasto"],
          fiscal: true,
          initialBalance: 12000,
          rows: [
            {
              date: "2026-06-02",
              amounts: [18400, 3300],
              description: "Gasolina de la camioneta",
              category: "Gasolina",
            },
            {
              date: "2026-06-05",
              amounts: [21300, 3760],
              description: "Gasolina personal",
              category: "Gasolina",
            },
            {
              date: "2026-06-12",
              amounts: [24700, 7070],
              description: "Recibo de luz",
              category: "Servicios",
            },
          ],
          layout: { w: 820, h: 400 },
        },
      ],
    },
  ],
};

function buildTable(seed: SeedTable, placed: Table[]): Table {
  const date = makeColumn("Fecha", "date");
  const money = seed.moneyColumns.map((name) =>
    makeColumn(
      name,
      "money",
      seed.kind === "ledger"
        ? { role: /gasto|retiro|salida/i.test(name) ? "withdrawal" : "deposit" }
        : undefined,
    ),
  );
  const desc = makeColumn("Descripción", "text", { withCategory: true });
  const columns: Column[] = [date, ...money, desc];

  const rows: Row[] = seed.rows.map((r) => {
    const values: Record<string, string> = { [date.id]: r.date };
    money.forEach((col, i) => {
      const amount = r.amounts[i];
      values[col.id] = amount == null ? "" : String(amount);
    });
    if (r.description) values[desc.id] = r.description;
    const row = makeRow(columns, values);
    if (r.category) row.category = r.category;
    return row;
  });

  const layout: WidgetLayout = { x: 24, y: 24, w: 560, h: 420, ...seed.layout };
  const slot = nextWidgetSlot(placed, layout);
  return {
    id: id(),
    title: seed.title,
    kind: seed.kind,
    columns,
    rows,
    layout: { ...layout, x: slot.x, y: slot.y },
    ...(seed.fiscal ? { fiscal: true } : {}),
    ...(seed.bank ? { bank: seed.bank } : {}),
    ...(seed.initialBalance != null ? { initialBalance: seed.initialBalance } : {}),
  };
}

/** Turn a seed into a real project the store can load. */
export function buildSeedProject(seed: Seed): Project {
  const project = newProject(seed.projectName);
  project.categories = defaultCategories();
  project.initialBalance = 12000;
  for (const month of seed.months) {
    const placed: Table[] = [];
    for (const t of month.tables) placed.push(buildTable(t, placed));
    project.months[month.monthIndex].tables = placed;
  }
  return project;
}

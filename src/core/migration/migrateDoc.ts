import { DEFAULT_CATEGORIES } from "../model/defaults";
import { CURRENT_SCHEMA_VERSION, type AppDoc, type Category, type Project, type Table } from "../model/types";

/** Default titles that v2 renames, when a table still carries the old wording verbatim. */
const V2_TITLE_RENAMES: Record<string, string> = {
  "Libro de cuenta bancaria": "Banco Fiscal",
  Gastos: "Contabilidad Personal",
};

/**
 * v1 → v2, run once per document (gated on `schemaVersion`, unlike the always-on passes
 * below) because each step would otherwise fight the user: a rename would undo their own
 * retitling on the next boot, and re-seeding the default categories would resurrect ones
 * they deleted.
 */
function migrateV2(doc: AppDoc): void {
  for (const project of doc.projects ?? []) {
    // Categories: string[] → Category[], then top up with any missing defaults.
    const legacy = (project.categories ?? []) as unknown as (string | Category)[];
    const categories: Category[] = legacy.map((c) => (typeof c === "string" ? { name: c } : c));
    const have = new Set(categories.map((c) => c.name.toLowerCase()));
    for (const def of DEFAULT_CATEGORIES) {
      if (!have.has(def.name.toLowerCase())) categories.push({ ...def });
    }
    project.categories = categories;

    for (const month of project.months ?? []) {
      for (const table of month.tables ?? []) {
        const renamed = V2_TITLE_RENAMES[table.title];
        if (renamed) table.title = renamed;
        // The ledger *was* the fiscal table before "fiscal" was a flag any table can carry.
        if (table.kind === "ledger") table.fiscal = true;
      }
    }
  }
}

/**
 * v2 → v3: the category used to BE the description — picking one overwrote the text you
 * had typed, so "Gasolina de la camioneta" and "Gasolina personal" could not both be
 * filed under "Gasolina". The category now lives on the row.
 *
 * The text is left exactly where it is (nothing disappears from a user's table); rows
 * whose text names a known category simply gain that category alongside it, and the
 * column is re-flagged `withCategory` so it shows both faces.
 */
function migrateV3(project: Project): void {
  const known = new Map(
    (project.categories ?? []).map((c) => [c.name.trim().toLowerCase(), c.name]),
  );
  for (const month of project.months ?? []) {
    for (const table of month.tables ?? []) {
      for (const col of table.columns ?? []) {
        if (!col.category) continue;
        delete col.category;
        if (col.type !== "text") continue;
        col.withCategory = true;
        for (const row of table.rows ?? []) {
          if (row.category) continue;
          const match = known.get((row.cells?.[col.id] ?? "").trim().toLowerCase());
          if (match) row.category = match;
        }
      }
    }
  }
}

/** A category column is what makes the per-row tag appear; ledgers predate having one. */
function backfillCategoryColumn(table: Table): void {
  if (table.kind !== "ledger") return;
  if (table.columns.some((c) => c.withCategory || c.type === "category")) return;
  const text = table.columns.find((c) => c.type === "text");
  if (text) text.withCategory = true;
}

/**
 * Bring a persisted/legacy doc up to the current shape. Runs on every boot before the
 * store loads, so every pass here must be idempotent — except the versioned ones, which
 * are gated on `schemaVersion` precisely because they aren't.
 *
 * - Charts: `linkedTableId: string|null` → `linkedTableIds: string[]` (#9).
 * - v2: default-title renames, `fiscal` on ledgers, grouped + seeded categories.
 * - v3: the category moves off the description cell and onto the row itself.
 * - Ledgers: backfill the category column so per-row tags render.
 */
export function migrateDoc(doc: AppDoc): AppDoc {
  const from = Number(doc.schemaVersion) || 1;
  if (from < 2) migrateV2(doc);

  for (const project of doc.projects ?? []) {
    // Idempotent in practice (it only reads the legacy flag, which it then clears), but
    // gated anyway so it never re-derives a category a user has since cleared by hand.
    if (from < 3) migrateV3(project);
    for (const month of project.months ?? []) {
      for (const table of month.tables ?? []) {
        backfillCategoryColumn(table);
      }
      for (const chart of month.charts ?? []) {
        const legacy = chart as unknown as { linkedTableId?: string | null };
        if (!Array.isArray(chart.linkedTableIds)) {
          chart.linkedTableIds = legacy.linkedTableId ? [legacy.linkedTableId] : [];
        }
        if ("linkedTableId" in legacy) delete legacy.linkedTableId;
      }
    }
  }

  doc.schemaVersion = CURRENT_SCHEMA_VERSION;
  return doc;
}

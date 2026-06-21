import type { AppDoc } from "../model/types";

/**
 * Bring a persisted/legacy doc up to the current shape. Idempotent and defensive
 * (runs on every boot before the store loads).
 *
 * - Charts: `linkedTableId: string|null` → `linkedTableIds: string[]` (#9).
 */
export function migrateDoc(doc: AppDoc): AppDoc {
  for (const project of doc.projects ?? []) {
    for (const month of project.months ?? []) {
      for (const chart of month.charts ?? []) {
        const legacy = chart as unknown as { linkedTableId?: string | null };
        if (!Array.isArray(chart.linkedTableIds)) {
          chart.linkedTableIds = legacy.linkedTableId ? [legacy.linkedTableId] : [];
        }
        if ("linkedTableId" in legacy) delete legacy.linkedTableId;
      }
    }
  }
  return doc;
}

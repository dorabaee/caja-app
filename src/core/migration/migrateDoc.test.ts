import { describe, expect, it } from "vitest";
import { migrateDoc } from "@core/migration/migrateDoc";
import { newAppDoc, newProject } from "@core/model/defaults";
import type { AppDoc } from "@core/model/types";

function docWithChart(chart: Record<string, unknown>): AppDoc {
  const project = newProject("P");
  project.months[0].charts = [chart as never];
  return { ...newAppDoc(), projects: [project] };
}

describe("migrateDoc — chart linkedTableId → linkedTableIds (#9)", () => {
  it("wraps a legacy single linkedTableId into an array", () => {
    const doc = migrateDoc(docWithChart({ id: "c", type: "bar", title: "G", linkedTableId: "t1" }));
    const chart = doc.projects[0].months[0].charts[0];
    expect(chart.linkedTableIds).toEqual(["t1"]);
    expect("linkedTableId" in chart).toBe(false);
  });

  it("turns a null/absent link into an empty array", () => {
    const doc = migrateDoc(docWithChart({ id: "c", type: "bar", title: "G", linkedTableId: null }));
    expect(doc.projects[0].months[0].charts[0].linkedTableIds).toEqual([]);
  });

  it("leaves an already-migrated chart untouched", () => {
    const doc = migrateDoc(docWithChart({ id: "c", type: "bar", title: "G", linkedTableIds: ["t1", "t2"] }));
    expect(doc.projects[0].months[0].charts[0].linkedTableIds).toEqual(["t1", "t2"]);
  });
});

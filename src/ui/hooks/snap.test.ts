import { describe, expect, it } from "vitest";
import { snapPosition } from "@ui/hooks/useCanvasGestures";

const box = { w: 200, h: 100 };
const neighbour = { id: "n", layout: { x: 300, y: 200, w: 200, h: 100 } };

describe("snapPosition", () => {
  it("snaps a near-aligned left edge onto its neighbour's", () => {
    const r = snapPosition(296, 500, box, [neighbour]);
    expect(r.x).toBe(300);
    expect(r.guides).toContainEqual({ axis: "v", at: 300 });
  });

  it("snaps to a neighbour's right edge too", () => {
    // left edge at 497 is 3px from the neighbour's right edge (500).
    const r = snapPosition(497, 500, box, [neighbour]);
    expect(r.x).toBe(500);
  });

  it("aligns centres", () => {
    // Centres match when x = 400 − 100 = 300... nudge in from 302.
    const r = snapPosition(302, 500, box, [neighbour]);
    expect(r.x).toBe(300);
  });

  it("leaves a far-away edge to the grid instead", () => {
    const r = snapPosition(137, 62, box, [neighbour]);
    expect(r.x % 24).toBe(0);
    expect(r.y % 24).toBe(0);
    expect(r.guides).toEqual([]);
  });

  it("never returns a negative position", () => {
    const r = snapPosition(-40, -12, box, []);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
  });

  it("snaps both axes at once when both are close", () => {
    const r = snapPosition(303, 197, box, [neighbour]);
    expect([r.x, r.y]).toEqual([300, 200]);
    expect(r.guides).toHaveLength(2);
  });
});

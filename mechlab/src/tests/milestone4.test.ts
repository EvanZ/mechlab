import { describe, expect, it } from "vitest";
import { brachistochroneSystem } from "../systems/variational/brachistochrone";

describe("Milestone 4 brachistochrone solver", () => {
  it("returns a valid curve with fixed endpoints", () => {
    const params = {
      x0: 0,
      y0: 0,
      x1: 2,
      y1: 1,
      g: 9.81,
      segments: 24,
      iterations: 60,
      learningRate: 0.04,
      smoothness: 0.001
    };

    const result = brachistochroneSystem.solve(params);

    expect(result.points.length).toBe(params.segments + 1);
    expect(result.points[0].x).toBeCloseTo(params.x0, 12);
    expect(result.points[0].y).toBeCloseTo(params.y0, 12);

    const last = result.points[result.points.length - 1];
    expect(last.x).toBeCloseTo(params.x1, 12);
    expect(last.y).toBeCloseTo(params.y1, 12);

    for (let i = 1; i < result.points.length - 1; i += 1) {
      expect(result.points[i].y).toBeGreaterThan(params.y0);
    }
  });

  it("improves travel time over the straight-line path", () => {
    const result = brachistochroneSystem.solve({
      x0: 0,
      y0: 0,
      x1: 2,
      y1: 1,
      g: 9.81,
      segments: 30,
      iterations: 90,
      learningRate: 0.04,
      smoothness: 0.001
    });

    const descentTime = result.meta.descentTime;
    const straightLineTime = result.meta.straightLineTime;

    expect(Number.isFinite(descentTime)).toBe(true);
    expect(Number.isFinite(straightLineTime)).toBe(true);
    expect(descentTime).toBeLessThan(straightLineTime);
    expect(result.meta.improvementPct).toBeGreaterThan(0);
    expect(result.series?.iteration.length ?? 0).toBeGreaterThan(0);
    expect(result.series?.time.length ?? 0).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import {
  buildQhoInitialState,
  qho1dSystem,
  qhoObservablesFromState
} from "../systems/ode/qho1d";

describe("qho1d system", () => {
  it("builds a normalized initial superposition", () => {
    const params = {
      m: 1,
      omega: 1,
      hbar: 1,
      gridPoints: 120,
      xMin: -7,
      xMax: 7,
      c0: 1,
      c1: 0.65,
      c2: 0.35,
      phi1: Math.PI / 3,
      phi2: Math.PI / 7
    };

    const y0 = buildQhoInitialState(params);
    const obs = qhoObservablesFromState(y0, params);

    expect(obs.norm).toBeCloseTo(1, 6);
  });

  it("keeps the ground state centered with low drift", () => {
    const params = {
      m: 1,
      omega: 1,
      hbar: 1,
      gridPoints: 128,
      xMin: -8,
      xMax: 8,
      c0: 1,
      c1: 0,
      c2: 0,
      phi1: 0,
      phi2: 0
    };

    const y0 = buildQhoInitialState(params);
    const { y } = integrateRk4(qho1dSystem.rhs, {
      t0: 0,
      y0,
      dt: 0.0015,
      steps: 2400,
      params
    });

    const obsSeries = y.map((state) => qhoObservablesFromState(state, params));
    const xMaxAbs = Math.max(...obsSeries.map((obs) => Math.abs(obs.xMean)));
    const normDrift = Math.max(...obsSeries.map((obs) => obs.norm)) - Math.min(...obsSeries.map((obs) => obs.norm));
    const spreadDrift =
      Math.max(...obsSeries.map((obs) => obs.spread)) - Math.min(...obsSeries.map((obs) => obs.spread));

    const energies = y.map((state) => qho1dSystem.energy?.(state, params) ?? 0);
    const energyDrift = Math.max(...energies) - Math.min(...energies);

    expect(xMaxAbs).toBeLessThan(0.05);
    expect(normDrift).toBeLessThan(0.015);
    expect(spreadDrift).toBeLessThan(0.03);
    expect(energyDrift).toBeLessThan(0.03);
  });

  it("superposition of n=0 and n=1 produces centroid oscillation", () => {
    const params = {
      m: 1,
      omega: 1,
      hbar: 1,
      gridPoints: 112,
      xMin: -7,
      xMax: 7,
      c0: 1,
      c1: 0.85,
      c2: 0,
      phi1: 0,
      phi2: 0
    };

    const y0 = buildQhoInitialState(params);
    const { y } = integrateRk4(qho1dSystem.rhs, {
      t0: 0,
      y0,
      dt: 0.002,
      steps: 3500,
      params
    });

    const xSeries = y.map((state) => qhoObservablesFromState(state, params).xMean);
    const xSpan = Math.max(...xSeries) - Math.min(...xSeries);
    const hasPositive = xSeries.some((value) => value > 0.02);
    const hasNegative = xSeries.some((value) => value < -0.02);

    expect(xSpan).toBeGreaterThan(0.25);
    expect(hasPositive).toBe(true);
    expect(hasNegative).toBe(true);
  });
});

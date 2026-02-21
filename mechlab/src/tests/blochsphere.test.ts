import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import {
  blochSphereObservablesFromState,
  blochSphereSystem,
  buildBlochSphereInitialState
} from "../systems/ode/blochsphere";

describe("blochsphere system", () => {
  it("builds a normalized qubit from theta0/phi0", () => {
    const params = {
      hbar: 1,
      omegaX: 0.8,
      omegaY: 0.3,
      omegaZ: 1.2,
      theta0: 1.05,
      phi0: -0.6
    };

    const y0 = buildBlochSphereInitialState(params);
    const obs = blochSphereObservablesFromState(y0, params);

    expect(y0.length).toBe(4);
    expect(obs.norm).toBeCloseTo(1, 8);
    expect(obs.radius).toBeCloseTo(1, 8);
  });

  it("z-axis field keeps sz nearly constant while precessing on equator", () => {
    const params = {
      hbar: 1,
      omegaX: 0,
      omegaY: 0,
      omegaZ: 1.7,
      theta0: Math.PI / 2,
      phi0: 0
    };

    const y0 = buildBlochSphereInitialState(params);
    const { y } = integrateRk4(blochSphereSystem.rhs, {
      t0: 0,
      y0,
      dt: 0.01,
      steps: 1200,
      params
    });

    const obsSeries = y.map((state) => blochSphereObservablesFromState(state, params));
    const szSpan = Math.max(...obsSeries.map((obs) => obs.sz)) - Math.min(...obsSeries.map((obs) => obs.sz));
    const radiusDrift =
      Math.max(...obsSeries.map((obs) => obs.radius)) - Math.min(...obsSeries.map((obs) => obs.radius));

    const sxSeries = obsSeries.map((obs) => obs.sx);
    const sySeries = obsSeries.map((obs) => obs.sy);

    expect(szSpan).toBeLessThan(0.03);
    expect(radiusDrift).toBeLessThan(0.02);
    expect(Math.max(...sxSeries)).toBeGreaterThan(0.95);
    expect(Math.min(...sxSeries)).toBeLessThan(-0.95);
    expect(Math.max(...sySeries)).toBeGreaterThan(0.95);
    expect(Math.min(...sySeries)).toBeLessThan(-0.95);
  });

  it("x-drive from |0> produces large Rabi population transfer", () => {
    const params = {
      hbar: 1,
      omegaX: 2,
      omegaY: 0,
      omegaZ: 0,
      theta0: 0,
      phi0: 0
    };

    const y0 = buildBlochSphereInitialState(params);
    const { y } = integrateRk4(blochSphereSystem.rhs, {
      t0: 0,
      y0,
      dt: 0.01,
      steps: 1400,
      params
    });

    const obsSeries = y.map((state) => blochSphereObservablesFromState(state, params));
    const p1Series = obsSeries.map((obs) => obs.p1);

    const p1Min = Math.min(...p1Series);
    const p1Max = Math.max(...p1Series);
    const normDrift = Math.max(...obsSeries.map((obs) => obs.norm)) - Math.min(...obsSeries.map((obs) => obs.norm));

    expect(p1Min).toBeLessThan(0.02);
    expect(p1Max).toBeGreaterThan(0.95);
    expect(normDrift).toBeLessThan(0.02);
  });
});

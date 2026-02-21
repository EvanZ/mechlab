import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import {
  buildDoubleSlitInitialState,
  doubleSlitObservablesFromState,
  doubleSlitSystem
} from "../systems/ode/doubleslit";

describe("double-slit system", () => {
  it("builds a normalized initial two-slit state", () => {
    const params = {
      m: 1,
      hbar: 1,
      gridPoints: 181,
      xMin: -12,
      xMax: 12,
      slitSeparation: 2.8,
      slitWidth: 0.35,
      slitPhase: 0,
      slitAmpRatio: 1,
      carrierK: 0,
      absorberStrength: 0,
      absorberFraction: 0.12
    };

    const y0 = buildDoubleSlitInitialState(params);
    const obs = doubleSlitObservablesFromState(y0, params);

    expect(obs.norm).toBeCloseTo(1, 6);
  });

  it("approximately conserves norm without absorber", () => {
    const params = {
      m: 1,
      hbar: 1,
      gridPoints: 181,
      xMin: -12,
      xMax: 12,
      slitSeparation: 3,
      slitWidth: 0.35,
      slitPhase: 0,
      slitAmpRatio: 1,
      carrierK: 0,
      absorberStrength: 0,
      absorberFraction: 0.12
    };

    const y0 = buildDoubleSlitInitialState(params);

    const { y } = integrateRk4(doubleSlitSystem.rhs, {
      t0: 0,
      y0,
      dt: 0.0018,
      steps: 2200,
      params
    });

    const norms = y.map((state) => doubleSlitObservablesFromState(state, params).norm);
    const drift = Math.max(...norms) - Math.min(...norms);

    expect(drift).toBeLessThan(0.018);
  });

  it("pi phase shift suppresses center fringe compared with in-phase slits", () => {
    const base = {
      m: 1,
      hbar: 1,
      gridPoints: 201,
      xMin: -12,
      xMax: 12,
      slitSeparation: 3,
      slitWidth: 0.35,
      slitAmpRatio: 1,
      carrierK: 0,
      absorberStrength: 0,
      absorberFraction: 0.12
    };

    const inPhaseParams = { ...base, slitPhase: 0 };
    const outPhaseParams = { ...base, slitPhase: Math.PI };

    const inPhase = integrateRk4(doubleSlitSystem.rhs, {
      t0: 0,
      y0: buildDoubleSlitInitialState(inPhaseParams),
      dt: 0.0018,
      steps: 2600,
      params: inPhaseParams
    });

    const outPhase = integrateRk4(doubleSlitSystem.rhs, {
      t0: 0,
      y0: buildDoubleSlitInitialState(outPhaseParams),
      dt: 0.0018,
      steps: 2600,
      params: outPhaseParams
    });

    const inCenter = doubleSlitObservablesFromState(
      inPhase.y[inPhase.y.length - 1],
      inPhaseParams
    ).centerDensity;
    const outCenter = doubleSlitObservablesFromState(
      outPhase.y[outPhase.y.length - 1],
      outPhaseParams
    ).centerDensity;

    expect(inCenter).toBeGreaterThan(outCenter * 6);
  });
});

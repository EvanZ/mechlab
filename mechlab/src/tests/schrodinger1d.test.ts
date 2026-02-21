import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import {
  buildSchrodingerInitialState,
  schrodinger1dSystem,
  schrodingerObservablesFromState
} from "../systems/ode/schrodinger1d";

describe("schrodinger1d system", () => {
  it("builds a normalized initial wavepacket", () => {
    const params = {
      m: 1,
      gridPoints: 96,
      xMin: -10,
      xMax: 10,
      packetX0: -4.5,
      packetSigma: 0.8,
      packetK0: 3,
      barrierCenter: 0,
      barrierWidth: 0.35,
      barrierHeight: 4,
      absorberStrength: 0,
      absorberFraction: 0.14
    };

    const y0 = buildSchrodingerInitialState(params);
    const obs = schrodingerObservablesFromState(y0, params);

    expect(obs.norm).toBeCloseTo(1, 6);
  });

  it("approximately conserves norm without absorber", () => {
    const params = {
      m: 1,
      gridPoints: 96,
      xMin: -10,
      xMax: 10,
      packetX0: -4.5,
      packetSigma: 0.8,
      packetK0: 2.8,
      barrierCenter: 0,
      barrierWidth: 0.35,
      barrierHeight: 0,
      absorberStrength: 0,
      absorberFraction: 0.14
    };

    const y0 = buildSchrodingerInitialState(params);
    const result = integrateRk4(schrodinger1dSystem.rhs, {
      t0: 0,
      y0,
      dt: 0.0015,
      steps: 900,
      params
    });

    const norms = result.y.map((state) => schrodingerObservablesFromState(state, params).norm);
    const drift = Math.max(...norms) - Math.min(...norms);

    expect(drift).toBeLessThan(0.015);
  });

  it("higher barrier tends to produce higher reflection probability", () => {
    const base = {
      m: 1,
      gridPoints: 96,
      xMin: -10,
      xMax: 10,
      packetX0: -4.8,
      packetSigma: 0.8,
      packetK0: 3,
      barrierCenter: 0,
      barrierWidth: 0.35,
      absorberStrength: 0.8,
      absorberFraction: 0.14
    };

    const lowParams = { ...base, barrierHeight: 1.4 };
    const highParams = { ...base, barrierHeight: 7.5 };

    const low = integrateRk4(schrodinger1dSystem.rhs, {
      t0: 0,
      y0: buildSchrodingerInitialState(lowParams),
      dt: 0.002,
      steps: 1250,
      params: lowParams
    });

    const high = integrateRk4(schrodinger1dSystem.rhs, {
      t0: 0,
      y0: buildSchrodingerInitialState(highParams),
      dt: 0.002,
      steps: 1250,
      params: highParams
    });

    const lowR = schrodingerObservablesFromState(low.y[low.y.length - 1], lowParams).reflection;
    const highR = schrodingerObservablesFromState(high.y[high.y.length - 1], highParams).reflection;

    expect(highR).toBeGreaterThan(lowR);
  });
});

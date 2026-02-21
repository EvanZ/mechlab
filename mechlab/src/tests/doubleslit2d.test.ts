import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import {
  buildDoubleSlit2dInitialState,
  doubleSlit2dObservablesFromState,
  doubleSlit2dSystem
} from "../systems/ode/doubleslit2d";

describe("double-slit2d system", () => {
  it("builds a normalized 2D initial beam", () => {
    const params = {
      m: 1,
      hbar: 1,
      gridX: 32,
      gridY: 40,
      xMin: -7,
      xMax: 7,
      yMin: -6,
      yMax: 6,
      packetX0: 0,
      packetY0: -4.2,
      packetSigmaX: 0.8,
      packetSigmaY: 0.65,
      packetKx: 0,
      packetKy: 7.5,
      barrierY: -1,
      barrierThickness: 0.2,
      slitSeparation: 2.4,
      slitWidth: 0.5,
      barrierHeight: 220,
      rightSlitOpen: 1,
      detectorY: 3.8,
      absorberStrength: 0,
      absorberFraction: 0.12
    };

    const y0 = buildDoubleSlit2dInitialState(params);
    const obs = doubleSlit2dObservablesFromState(y0, params);

    expect(obs.norm).toBeCloseTo(1, 6);
  });

  it("approximately conserves norm without absorber", () => {
    const params = {
      m: 1,
      hbar: 1,
      gridX: 30,
      gridY: 38,
      xMin: -7,
      xMax: 7,
      yMin: -6,
      yMax: 6,
      packetX0: 0,
      packetY0: -4.2,
      packetSigmaX: 0.8,
      packetSigmaY: 0.65,
      packetKx: 0,
      packetKy: 7.5,
      barrierY: -1,
      barrierThickness: 0.2,
      slitSeparation: 2.4,
      slitWidth: 0.5,
      barrierHeight: 220,
      rightSlitOpen: 1,
      detectorY: 3.8,
      absorberStrength: 0,
      absorberFraction: 0.12
    };

    const y0 = buildDoubleSlit2dInitialState(params);

    const { y } = integrateRk4(doubleSlit2dSystem.rhs, {
      t0: 0,
      y0,
      dt: 0.0035,
      steps: 200,
      params
    });

    const norms = y.map((state) => doubleSlit2dObservablesFromState(state, params).norm);
    const drift = Math.max(...norms) - Math.min(...norms);

    expect(drift).toBeLessThan(0.02);
  });

  it("opening vs closing right slit materially changes transmitted probability", () => {
    const base = {
      m: 1,
      hbar: 1,
      gridX: 34,
      gridY: 42,
      xMin: -7,
      xMax: 7,
      yMin: -6,
      yMax: 6,
      packetX0: 0,
      packetY0: -4.4,
      packetSigmaX: 0.8,
      packetSigmaY: 0.65,
      packetKx: 0,
      packetKy: 8,
      barrierY: -1,
      barrierThickness: 0.2,
      slitSeparation: 2.5,
      slitWidth: 0.5,
      barrierHeight: 240,
      detectorY: 4,
      absorberStrength: 0.9,
      absorberFraction: 0.12
    };

    const twoParams = { ...base, rightSlitOpen: 1 };
    const singleParams = { ...base, rightSlitOpen: 0 };

    const two = integrateRk4(doubleSlit2dSystem.rhs, {
      t0: 0,
      y0: buildDoubleSlit2dInitialState(twoParams),
      dt: 0.003,
      steps: 420,
      params: twoParams
    });

    const single = integrateRk4(doubleSlit2dSystem.rhs, {
      t0: 0,
      y0: buildDoubleSlit2dInitialState(singleParams),
      dt: 0.003,
      steps: 420,
      params: singleParams
    });

    const twoT = doubleSlit2dObservablesFromState(two.y[two.y.length - 1], twoParams).transmittedProb;
    const singleT = doubleSlit2dObservablesFromState(
      single.y[single.y.length - 1],
      singleParams
    ).transmittedProb;

    expect(Math.abs(twoT - singleT)).toBeGreaterThan(0.003);
  });
});

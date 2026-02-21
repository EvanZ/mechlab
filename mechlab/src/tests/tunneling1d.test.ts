import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import {
  buildTunnelingInitialState,
  computeTunnelingScan,
  tunneling1dSystem,
  tunnelingObservablesFromState,
  tunnelingTransmissionForEnergy
} from "../systems/ode/tunneling1d";

describe("tunneling1d system", () => {
  it("builds a normalized initial wavepacket", () => {
    const params = {
      m: 1,
      hbar: 1,
      gridPoints: 140,
      xMin: -12,
      xMax: 12,
      packetX0: -6,
      packetSigma: 0.8,
      packetK0: 3,
      barrierHeight: 6,
      barrierWidth: 0.7,
      wellWidth: 2.2,
      doubleBarrier: 1,
      absorberStrength: 0,
      absorberFraction: 0.12,
      scanEmin: 0.1,
      scanEmax: 8,
      scanPoints: 120
    };

    const y0 = buildTunnelingInitialState(params);
    const obs = tunnelingObservablesFromState(y0, params);

    expect(obs.norm).toBeCloseTo(1, 6);
  });

  it("approximately conserves norm without absorber", () => {
    const params = {
      m: 1,
      hbar: 1,
      gridPoints: 128,
      xMin: -12,
      xMax: 12,
      packetX0: -6,
      packetSigma: 0.8,
      packetK0: 2.9,
      barrierHeight: 5,
      barrierWidth: 0.6,
      wellWidth: 2.2,
      doubleBarrier: 1,
      absorberStrength: 0,
      absorberFraction: 0.12,
      scanEmin: 0.1,
      scanEmax: 7,
      scanPoints: 120
    };

    const y0 = buildTunnelingInitialState(params);
    const result = integrateRk4(tunneling1dSystem.rhs, {
      t0: 0,
      y0,
      dt: 0.0018,
      steps: 2400,
      params
    });

    const norms = result.y.map((state) => tunnelingObservablesFromState(state, params).norm);
    const drift = Math.max(...norms) - Math.min(...norms);

    expect(drift).toBeLessThan(0.02);
  });

  it("double barrier shows a stronger peak transmission than single barrier", () => {
    const base = {
      m: 1,
      hbar: 1,
      barrierHeight: 5,
      barrierWidth: 0.6,
      wellWidth: 2.2,
      scanEmin: 0.12,
      scanEmax: 7,
      scanPoints: 220
    };

    const singleScan = computeTunnelingScan({ ...base, doubleBarrier: 0 });
    const doubleScan = computeTunnelingScan({ ...base, doubleBarrier: 1 });

    const singlePeak = Math.max(...singleScan.transmission);
    const doublePeak = Math.max(...doubleScan.transmission);

    expect(doublePeak).toBeGreaterThan(singlePeak + 0.08);
  });

  it("packet-energy marker transmission stays in physical range", () => {
    const params = {
      m: 1,
      hbar: 1,
      packetK0: 1.7,
      barrierHeight: 5,
      barrierWidth: 0.6,
      wellWidth: 2.2,
      doubleBarrier: 1
    };

    const E = (params.hbar * params.hbar * params.packetK0 * params.packetK0) / (2 * params.m);
    const T = tunnelingTransmissionForEnergy(E, params);

    expect(T).toBeGreaterThanOrEqual(0);
    expect(T).toBeLessThanOrEqual(1.2);
  });
});

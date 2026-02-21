import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import {
  applyTwoQubitGate,
  buildBellPhiPlusState,
  buildTwoQubitInitialState,
  twoQubitObservablesFromState,
  twoQubitSystem
} from "../systems/ode/twoqubit";

describe("twoqubit system", () => {
  it("builds a normalized separable state from Bloch angles", () => {
    const params = {
      hbar: 1,
      omega1x: 0,
      omega1y: 0,
      omega1z: 0,
      omega2x: 0,
      omega2y: 0,
      omega2z: 0,
      jzz: 0,
      theta1: 0.9,
      phi1: -0.4,
      theta2: 1.2,
      phi2: 0.7
    };

    const y0 = buildTwoQubitInitialState(params);
    const obs = twoQubitObservablesFromState(y0, params);

    expect(y0.length).toBe(8);
    expect(obs.norm).toBeCloseTo(1, 8);
    expect(obs.concurrence).toBeLessThan(1e-6);
  });

  it("H1 then CNOT creates near-maximally entangled Bell state from |00>", () => {
    const product00 = buildTwoQubitInitialState({
      hbar: 1,
      omega1x: 0,
      omega1y: 0,
      omega1z: 0,
      omega2x: 0,
      omega2y: 0,
      omega2z: 0,
      jzz: 0,
      theta1: 0,
      phi1: 0,
      theta2: 0,
      phi2: 0
    });

    const hThenCnot = applyTwoQubitGate(applyTwoQubitGate(product00, "h1"), "cnot12");
    const obs = twoQubitObservablesFromState(hThenCnot, {});

    expect(obs.concurrence).toBeGreaterThan(0.999);
    expect(obs.entropy).toBeGreaterThan(0.999);
    expect(obs.p00).toBeCloseTo(0.5, 6);
    expect(obs.p11).toBeCloseTo(0.5, 6);
    expect(obs.p01).toBeLessThan(1e-6);
    expect(obs.p10).toBeLessThan(1e-6);
  });

  it("ZZ coupling entangles |++> over time", () => {
    const params = {
      hbar: 1,
      omega1x: 0,
      omega1y: 0,
      omega1z: 0,
      omega2x: 0,
      omega2y: 0,
      omega2z: 0,
      jzz: 1.8,
      theta1: Math.PI / 2,
      phi1: 0,
      theta2: Math.PI / 2,
      phi2: 0
    };

    const y0 = buildTwoQubitInitialState(params);
    const { y } = integrateRk4(twoQubitSystem.rhs, {
      t0: 0,
      y0,
      dt: 0.01,
      steps: 900,
      params
    });

    const concSeries = y.map((state) => twoQubitObservablesFromState(state, params).concurrence);
    const normDrift =
      Math.max(...y.map((state) => twoQubitObservablesFromState(state, params).norm)) -
      Math.min(...y.map((state) => twoQubitObservablesFromState(state, params).norm));

    expect(Math.max(...concSeries)).toBeGreaterThan(0.9);
    expect(normDrift).toBeLessThan(0.02);
  });

  it("explicit Bell helper returns a maximally entangled state", () => {
    const bell = buildBellPhiPlusState();
    const obs = twoQubitObservablesFromState(bell, {});

    expect(obs.concurrence).toBeCloseTo(1, 8);
    expect(obs.entropy).toBeCloseTo(1, 8);
    expect(obs.norm).toBeCloseTo(1, 8);
  });
});

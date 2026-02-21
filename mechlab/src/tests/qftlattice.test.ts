import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import {
  buildQftLatticeInitialState,
  qftLatticeEnergyFromState,
  qftLatticeFromParams,
  qftLatticeSystem
} from "../systems/ode/qftlattice";

describe("qft lattice system", () => {
  it("builds finite state vector with expected length", () => {
    const params = {
      gridPoints: 80,
      xMin: -8,
      xMax: 8,
      mass: 1,
      lambda: 0.08,
      damping: 0,
      periodic: 1,
      packetCenter: -2,
      packetWidth: 1,
      packetAmp: 0.7,
      packetK: 1.3,
      packetPiScale: 0
    };

    const cfg = qftLatticeFromParams(params);
    const y0 = buildQftLatticeInitialState(params);

    expect(y0.length).toBe(2 * cfg.n);
    expect(y0.every((value) => Number.isFinite(value))).toBe(true);
  });

  it("stays at exact rest for zero field initial condition", () => {
    const params = {
      gridPoints: 64,
      xMin: -8,
      xMax: 8,
      mass: 1,
      lambda: 0.2,
      damping: 0,
      periodic: 1,
      packetCenter: 0,
      packetWidth: 1,
      packetAmp: 0,
      packetK: 0,
      packetPiScale: 0
    };

    const y0 = new Array<number>(2 * 64).fill(0);
    const rhs = qftLatticeSystem.rhs(0, y0, params);

    expect(rhs.every((value) => Math.abs(value) < 1e-12)).toBe(true);
  });

  it("approximately conserves energy when damping and self-interaction are zero", () => {
    const params = {
      gridPoints: 72,
      xMin: -9,
      xMax: 9,
      mass: 1,
      lambda: 0,
      damping: 0,
      periodic: 1,
      packetCenter: -2,
      packetWidth: 1,
      packetAmp: 0.5,
      packetK: 1.6,
      packetPiScale: 0
    };

    const y0 = buildQftLatticeInitialState(params);
    const { y } = integrateRk4(qftLatticeSystem.rhs, {
      t0: 0,
      y0,
      dt: 0.006,
      steps: 1400,
      params
    });

    const energies = y.map((state) => qftLatticeEnergyFromState(state, params));
    const drift = Math.max(...energies) - Math.min(...energies);

    expect(drift).toBeLessThan(0.03);
  });
});

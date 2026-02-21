import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import { cartPoleSystem } from "../systems/ode/cartpole";
import { doublePendulumSystem } from "../systems/ode/doublependulum";

describe("Milestone 3 system sanity checks", () => {
  it("cart-pole stays at rest in exact upright equilibrium with zero input", () => {
    const rhs = cartPoleSystem.rhs(0, [0, 0, 0, 0], {
      mCart: 1,
      mPole: 0.15,
      l: 0.7,
      g: 9.81,
      u: 0
    });

    expect(rhs[0]).toBeCloseTo(0, 12);
    expect(rhs[1]).toBeCloseTo(0, 12);
    expect(rhs[2]).toBeCloseTo(0, 12);
    expect(rhs[3]).toBeCloseTo(0, 12);
  });

  it("cart-pole upright is locally unstable without control", () => {
    const rhs = cartPoleSystem.rhs(0, [0, 0, 0.05, 0], {
      mCart: 1,
      mPole: 0.15,
      l: 0.7,
      g: 9.81,
      u: 0
    });

    expect(rhs[3]).toBeGreaterThan(0);
  });

  it("double pendulum remains at rest from zero-angle equilibrium", () => {
    const rhs = doublePendulumSystem.rhs(0, [0, 0, 0, 0], {
      m1: 1,
      m2: 1,
      l1: 1,
      l2: 1,
      g: 9.81
    });

    expect(rhs[0]).toBeCloseTo(0, 12);
    expect(rhs[1]).toBeCloseTo(0, 12);
    expect(rhs[2]).toBeCloseTo(0, 12);
    expect(rhs[3]).toBeCloseTo(0, 12);
  });

  it("double pendulum approximately conserves energy for small oscillations", () => {
    const params = {
      m1: 1,
      m2: 1,
      l1: 1,
      l2: 1,
      g: 9.81
    };

    const { y } = integrateRk4(doublePendulumSystem.rhs, {
      t0: 0,
      y0: [0.2, 0, 0.2, 0],
      dt: 0.002,
      steps: 4000,
      params
    });

    const energies = y.map((state) => doublePendulumSystem.energy?.(state, params) ?? 0);
    const drift = Math.max(...energies) - Math.min(...energies);

    expect(drift).toBeLessThan(2e-2);
  });
});

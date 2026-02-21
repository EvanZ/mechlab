import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import { chargedParticleSystem } from "../systems/ode/chargedparticle";

describe("charged particle system", () => {
  it("matches analytic motion in a uniform electric field", () => {
    const params = {
      q: 2,
      m: 4,
      ex0: 3,
      ey0: -2,
      sourceStrength: 0,
      coreRadius: 0.2
    };
    const y0 = [0.2, -0.1, 1.1, -0.4];
    const dt = 0.01;
    const steps = 300;

    const result = integrateRk4(chargedParticleSystem.rhs, {
      t0: 0,
      y0,
      dt,
      steps,
      params
    });

    const final = result.y[result.y.length - 1];
    const tFinal = dt * steps;
    const ax = (params.q / params.m) * params.ex0;
    const ay = (params.q / params.m) * params.ey0;

    const expectedX = y0[0] + y0[2] * tFinal + 0.5 * ax * tFinal * tFinal;
    const expectedY = y0[1] + y0[3] * tFinal + 0.5 * ay * tFinal * tFinal;
    const expectedVx = y0[2] + ax * tFinal;
    const expectedVy = y0[3] + ay * tFinal;

    expect(final[0]).toBeCloseTo(expectedX, 4);
    expect(final[1]).toBeCloseTo(expectedY, 4);
    expect(final[2]).toBeCloseTo(expectedVx, 4);
    expect(final[3]).toBeCloseTo(expectedVy, 4);
  });

  it("positive point source pushes positive charge outward", () => {
    const rhs = chargedParticleSystem.rhs(0, [1, 0, 0, 0], {
      q: 1,
      m: 1,
      ex0: 0,
      ey0: 0,
      sourceStrength: 2,
      coreRadius: 0.1
    });

    expect(rhs[2]).toBeGreaterThan(0);
    expect(Math.abs(rhs[3])).toBeLessThan(1e-10);
  });

  it("reversing charge flips acceleration direction in same field", () => {
    const common = {
      m: 2,
      ex0: 0.4,
      ey0: -0.3,
      sourceStrength: 1.1,
      coreRadius: 0.15
    };
    const state = [0.7, -0.2, 0, 0];

    const pos = chargedParticleSystem.rhs(0, state, { ...common, q: 1 });
    const neg = chargedParticleSystem.rhs(0, state, { ...common, q: -1 });

    expect(pos[2]).toBeCloseTo(-neg[2], 10);
    expect(pos[3]).toBeCloseTo(-neg[3], 10);
  });
});

import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import { orbitSystem } from "../systems/ode/orbit";
import { projectileSystem } from "../systems/ode/projectile";

describe("Milestone 2 system sanity checks", () => {
  it("projectile trajectory matches analytic parabola", () => {
    const dt = 0.01;
    const steps = 200;
    const y0 = [0, 0, 5, 10];
    const params = { g: 9.81 };

    const { t, y } = integrateRk4(projectileSystem.rhs, {
      t0: 0,
      y0,
      dt,
      steps,
      params
    });

    const finalState = y[y.length - 1];
    const finalT = t[t.length - 1];

    const expectedX = y0[0] + y0[2] * finalT;
    const expectedY = y0[1] + y0[3] * finalT - 0.5 * params.g * finalT * finalT;

    expect(finalState[0]).toBeCloseTo(expectedX, 4);
    expect(finalState[1]).toBeCloseTo(expectedY, 4);
  });

  it("orbit conserves energy and angular momentum over short horizon", () => {
    const dt = 0.01;
    const steps = 3000;
    const params = { mu: 1 };
    const y0 = [1, 0, 0, 1];

    const { y } = integrateRk4(orbitSystem.rhs, {
      t0: 0,
      y0,
      dt,
      steps,
      params
    });

    const energies = y.map((state) => orbitSystem.energy?.(state, params) ?? 0);
    const angularMomentum = y.map((state) => state[0] * state[3] - state[1] * state[2]);

    const eDrift = Math.max(...energies) - Math.min(...energies);
    const lDrift = Math.max(...angularMomentum) - Math.min(...angularMomentum);

    expect(eDrift).toBeLessThan(1e-3);
    expect(lDrift).toBeLessThan(1e-3);
  });
});

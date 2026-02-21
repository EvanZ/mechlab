import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import { potential1dSystem } from "../systems/ode/potential1d";
import {
  defaultPotentialExpression,
  setActivePotentialExpression
} from "../systems/ode/potentialExpression";

describe("potential1d system", () => {
  it("reproduces harmonic motion for V(x)=0.5*x^2 with m=1", () => {
    setActivePotentialExpression("0.5 * x^2");

    const dt = 0.005;
    const steps = 1200;
    const y0 = [1, 0];
    const params = { m: 1, gradStep: 1e-4 };

    const { t, y } = integrateRk4(potential1dSystem.rhs, {
      t0: 0,
      y0,
      dt,
      steps,
      params
    });

    const tFinal = t[t.length - 1];
    const final = y[y.length - 1];

    expect(final[0]).toBeCloseTo(Math.cos(tFinal), 2);
    expect(final[1]).toBeCloseTo(-Math.sin(tFinal), 2);

    setActivePotentialExpression(defaultPotentialExpression);
  });

  it("computes finite derived values for an anharmonic potential", () => {
    setActivePotentialExpression("0.5 * x^2 + 0.1 * x^4");

    const derived = potential1dSystem.derived?.([0.8, -0.2], { m: 2, gradStep: 1e-4 });
    expect(derived).toBeDefined();
    expect(Number.isFinite(derived?.potential ?? Number.NaN)).toBe(true);
    expect(Number.isFinite(derived?.force ?? Number.NaN)).toBe(true);

    setActivePotentialExpression(defaultPotentialExpression);
  });

  it("rejects expressions with unsupported variables", () => {
    expect(() => setActivePotentialExpression("x + y")).toThrow(/only use variable x/i);

    setActivePotentialExpression(defaultPotentialExpression);
  });
});

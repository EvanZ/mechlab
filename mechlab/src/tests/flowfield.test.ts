import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import { flowFieldSystem, flowFieldVelocity } from "../systems/ode/flowfield";

describe("flowfield system", () => {
  it("uniform flow advances tracer linearly", () => {
    const params = {
      uniformU: 1,
      uniformV: -0.2,
      sourceStrength: 0,
      vortexStrength: 0,
      coreRadius: 0.1
    };

    const dt = 0.02;
    const steps = 250;

    const result = integrateRk4(flowFieldSystem.rhs, {
      t0: 0,
      y0: [-1, 0.5],
      dt,
      steps,
      params
    });

    const tFinal = dt * steps;
    const final = result.y[result.y.length - 1];

    expect(final[0]).toBeCloseTo(-1 + params.uniformU * tFinal, 5);
    expect(final[1]).toBeCloseTo(0.5 + params.uniformV * tFinal, 5);
  });

  it("source flow points outward from origin", () => {
    const params = {
      uniformU: 0,
      uniformV: 0,
      sourceStrength: 2,
      vortexStrength: 0,
      coreRadius: 0.1
    };

    const nearPositiveX = flowFieldVelocity(1, 0, params);
    const nearPositiveY = flowFieldVelocity(0, 1, params);

    expect(nearPositiveX.u).toBeGreaterThan(0);
    expect(Math.abs(nearPositiveX.v)).toBeLessThan(1e-8);

    expect(nearPositiveY.v).toBeGreaterThan(0);
    expect(Math.abs(nearPositiveY.u)).toBeLessThan(1e-8);
  });

  it("vortex rotates tracer around origin", () => {
    const params = {
      uniformU: 0,
      uniformV: 0,
      sourceStrength: 0,
      vortexStrength: 4,
      coreRadius: 0.05
    };

    const sample = flowFieldVelocity(1, 0, params);
    expect(sample.v).toBeGreaterThan(0);
    expect(Math.abs(sample.u)).toBeLessThan(1e-8);
  });
});

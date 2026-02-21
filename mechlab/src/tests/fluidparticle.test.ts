import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import { fluidParticleSystem } from "../systems/ode/fluidparticle";

describe("fluid particle system", () => {
  it("sinks when particle is denser than fluid", () => {
    const params = {
      g: 9.81,
      mu: 0.001,
      rhoFluid: 1000,
      rhoParticle: 2000,
      radius: 0.01,
      cd: 0.47
    };

    const result = integrateRk4(fluidParticleSystem.rhs, {
      t0: 0,
      y0: [0, 0, 0, 0],
      dt: 0.01,
      steps: 200,
      params
    });

    const finalVy = result.y[result.y.length - 1][3];
    expect(finalVy).toBeLessThan(0);
  });

  it("rises when particle is less dense than fluid", () => {
    const params = {
      g: 9.81,
      mu: 0.001,
      rhoFluid: 1000,
      rhoParticle: 900,
      radius: 0.01,
      cd: 0.47
    };

    const result = integrateRk4(fluidParticleSystem.rhs, {
      t0: 0,
      y0: [0, 0, 0, 0],
      dt: 0.01,
      steps: 200,
      params
    });

    const finalVy = result.y[result.y.length - 1][3];
    expect(finalVy).toBeGreaterThan(0);
  });

  it("higher viscosity reduces terminal speed magnitude", () => {
    const common = {
      g: 9.81,
      rhoFluid: 1000,
      rhoParticle: 1800,
      radius: 0.01,
      cd: 0.47
    };

    const lowViscosity = integrateRk4(fluidParticleSystem.rhs, {
      t0: 0,
      y0: [0, 0, 0, 0],
      dt: 0.01,
      steps: 800,
      params: { ...common, mu: 0.001 }
    });

    const highViscosity = integrateRk4(fluidParticleSystem.rhs, {
      t0: 0,
      y0: [0, 0, 0, 0],
      dt: 0.01,
      steps: 800,
      params: { ...common, mu: 0.2 }
    });

    const vyLow = Math.abs(lowViscosity.y[lowViscosity.y.length - 1][3]);
    const vyHigh = Math.abs(highViscosity.y[highViscosity.y.length - 1][3]);

    expect(vyHigh).toBeLessThan(vyLow);
  });
});

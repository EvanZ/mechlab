import { describe, expect, it } from "vitest";
import { integrateRk4, integrateVelocityVerlet } from "../compute/integrators";

describe("integrateRk4", () => {
  it("tracks exponential growth for y' = y", () => {
    const result = integrateRk4(
      (_t, y) => [y[0]],
      {
        t0: 0,
        y0: [1],
        dt: 0.1,
        steps: 10,
        params: {}
      }
    );

    const yFinal = result.y[result.y.length - 1][0];
    expect(yFinal).toBeCloseTo(Math.E, 3);
  });

  it("keeps harmonic oscillator amplitude bounded over short horizon", () => {
    const result = integrateRk4(
      (_t, y) => [y[1], -y[0]],
      {
        t0: 0,
        y0: [1, 0],
        dt: 0.01,
        steps: 2000,
        params: {}
      }
    );

    const radius = result.y.map((state) => Math.hypot(state[0], state[1]));
    const maxRadius = Math.max(...radius);
    const minRadius = Math.min(...radius);

    expect(maxRadius - minRadius).toBeLessThan(0.02);
  });

  it("keeps harmonic oscillator energy bounded with velocity Verlet", () => {
    const result = integrateVelocityVerlet(
      (_t, y) => [y[1], -y[0]],
      {
        t0: 0,
        y0: [1, 0],
        dt: 0.05,
        steps: 3000,
        params: {}
      }
    );

    const energy = result.y.map((state) => 0.5 * (state[0] * state[0] + state[1] * state[1]));
    const drift = Math.max(...energy) - Math.min(...energy);

    expect(drift).toBeLessThan(0.02);
  });

  it("rejects odd-dimensional states for velocity Verlet", () => {
    expect(() =>
      integrateVelocityVerlet(
        (_t, y) => y,
        {
          t0: 0,
          y0: [1, 2, 3],
          dt: 0.01,
          steps: 10,
          params: {}
        }
      )
    ).toThrow();
  });
});

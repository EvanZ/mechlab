import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import {
  defaultHillProfile,
  setActiveHillProfile
} from "../systems/ode/hillProfile";
import { skiJumpSystem } from "../systems/ode/skijump";

describe("ski-jump system", () => {
  it("higher friction yields lower speed on the same slope", () => {
    setActiveHillProfile([
      { x: 0, y: 5 },
      { x: 200, y: -55 }
    ]);

    const common = {
      g: 9.81,
      m: 75
    };

    const lowFriction = integrateRk4(skiJumpSystem.rhs, {
      t0: 0,
      y0: [0, 0],
      dt: 0.01,
      steps: 500,
      params: { ...common, muK: 0.02 }
    });

    const highFriction = integrateRk4(skiJumpSystem.rhs, {
      t0: 0,
      y0: [0, 0],
      dt: 0.01,
      steps: 500,
      params: { ...common, muK: 0.2 }
    });

    const vLow = lowFriction.y[lowFriction.y.length - 1][1];
    const vHigh = highFriction.y[highFriction.y.length - 1][1];

    expect(vLow).toBeGreaterThan(0);
    expect(vHigh).toBeGreaterThan(0);
    expect(vHigh).toBeLessThan(vLow);

    setActiveHillProfile(defaultHillProfile);
  });

  it("flat track with friction decelerates skier", () => {
    setActiveHillProfile([
      { x: 0, y: 2 },
      { x: 200, y: 2 }
    ]);

    const result = integrateRk4(skiJumpSystem.rhs, {
      t0: 0,
      y0: [0, 5],
      dt: 0.01,
      steps: 250,
      params: {
        g: 9.81,
        m: 75,
        muK: 0.1
      }
    });

    const finalSpeed = result.y[result.y.length - 1][1];

    expect(finalSpeed).toBeLessThan(5);
    expect(finalSpeed).toBeGreaterThan(0);

    setActiveHillProfile(defaultHillProfile);
  });
});

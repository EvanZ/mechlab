import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import {
  defaultMuscleCurve,
  setActiveMuscleCurve
} from "../systems/ode/muscleCurve";
import { muscleActivationSystem } from "../systems/ode/muscleactivation";

describe("muscle activation system", () => {
  it("activation state converges toward neural drive u", () => {
    setActiveMuscleCurve(defaultMuscleCurve);

    const rhs = muscleActivationSystem.rhs(0, [1, 0, 0.2], {
      m: 0.8,
      fMax: 14,
      kPassive: 22,
      lSlack: 1,
      damping: 2.4,
      load: 0,
      u: 0.8,
      tau: 0.05,
      lFloor: 0.5
    });

    expect(rhs[2]).toBeGreaterThan(0);
  });

  it("higher activation yields stronger shortening acceleration at same length", () => {
    setActiveMuscleCurve(defaultMuscleCurve);

    const params = {
      m: 0.8,
      fMax: 14,
      kPassive: 22,
      lSlack: 1,
      damping: 2.4,
      load: 0,
      u: 0.7,
      tau: 0.07,
      lFloor: 0.5
    };

    const lowA = muscleActivationSystem.rhs(0, [1.05, 0, 0.15], params);
    const highA = muscleActivationSystem.rhs(0, [1.05, 0, 0.9], params);

    expect(highA[1]).toBeLessThan(lowA[1]);
  });

  it("drawn curve directly changes active force output", () => {
    const state = [1.0, 0, 0.7];
    const params = {
      m: 0.8,
      fMax: 14,
      kPassive: 22,
      lSlack: 1,
      damping: 2.4,
      load: 0,
      u: 0.7,
      tau: 0.07,
      lFloor: 0.5
    };

    setActiveMuscleCurve([
      { l: 0.5, f: 0.2 },
      { l: 1.0, f: 0.95 },
      { l: 1.6, f: 0.3 }
    ]);
    const strongForce =
      muscleActivationSystem.derived?.(state, params).activeForce ?? Number.NaN;

    setActiveMuscleCurve([
      { l: 0.5, f: 0.2 },
      { l: 1.0, f: 0.25 },
      { l: 1.6, f: 0.2 }
    ]);
    const weakForce =
      muscleActivationSystem.derived?.(state, params).activeForce ?? Number.NaN;

    expect(strongForce).toBeGreaterThan(weakForce);

    setActiveMuscleCurve(defaultMuscleCurve);
  });

  it("high activation shortens muscle over time against low load", () => {
    setActiveMuscleCurve(defaultMuscleCurve);

    const result = integrateRk4(muscleActivationSystem.rhs, {
      t0: 0,
      y0: [1.1, 0, 0.1],
      dt: 0.005,
      steps: 700,
      params: {
        m: 0.8,
        fMax: 14,
        kPassive: 22,
        lSlack: 1,
        damping: 2.4,
        load: 0.4,
        u: 0.9,
        tau: 0.06,
        lFloor: 0.5
      }
    });

    const finalLength = result.y[result.y.length - 1][0];
    expect(finalLength).toBeLessThan(1.1);

    setActiveMuscleCurve(defaultMuscleCurve);
  });
});

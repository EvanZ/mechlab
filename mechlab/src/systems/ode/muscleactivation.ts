import type { OdeSystem } from "../types";
import {
  defaultMuscleCurve,
  evaluateActiveMuscleForceScale,
  setActiveMuscleCurve
} from "./muscleCurve";

setActiveMuscleCurve(defaultMuscleCurve);

function clampPositive(value: number, minimum: number): number {
  return Math.max(minimum, value);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export const muscleActivationSystem: OdeSystem = {
  id: "muscleactivation",
  name: "Active Muscle-Spring",
  mode: "ode",
  state: {
    names: ["l", "v", "a"],
    y0: [1.05, 0, 0.05]
  },
  simulationDefaults: {
    dt: 0.005,
    duration: 6
  },
  supportedIntegrators: ["rk4"],
  params: {
    m: 0.8,
    fMax: 14,
    kPassive: 22,
    lSlack: 1.0,
    damping: 2.4,
    load: 0,
    u: 0.65,
    tau: 0.07,
    lFloor: 0.5
  },
  rhs: (_t, y, p) => {
    const [l, v, a] = y;

    const m = clampPositive(p.m, 1e-8);
    const fMax = clampPositive(p.fMax, 0);
    const kPassive = clampPositive(p.kPassive, 0);
    const lSlack = p.lSlack;
    const damping = clampPositive(p.damping, 0);
    const load = p.load;
    const u = clamp01(p.u);
    const tau = clampPositive(p.tau, 1e-5);
    const lFloor = Math.max(0.2, p.lFloor);

    const aClamped = clamp01(a);
    const curveScale = evaluateActiveMuscleForceScale(l);

    const activeForce = aClamped * fMax * curveScale;
    const passiveStretch = Math.max(0, l - lSlack);
    const passiveForce = kPassive * passiveStretch;
    const dampingForce = damping * v;
    const netForce = load - activeForce - passiveForce - dampingForce;
    const vDot = netForce / m;
    const aDot = (u - aClamped) / tau;

    if (l <= lFloor && v < 0 && vDot < 0) {
      return [0, 0, aDot];
    }

    return [v, vDot, aDot];
  },
  energy: (y, p) => {
    const [l, v] = y;
    const m = clampPositive(p.m, 1e-8);
    const kPassive = clampPositive(p.kPassive, 0);
    const lSlack = p.lSlack;
    const load = p.load;

    const passiveStretch = Math.max(0, l - lSlack);
    const kinetic = 0.5 * m * v * v;
    const passiveElastic = 0.5 * kPassive * passiveStretch * passiveStretch;
    const loadPotential = -load * l;

    return kinetic + passiveElastic + loadPotential;
  },
  derived: (y, p) => {
    const [l, v, a] = y;
    const fMax = clampPositive(p.fMax, 0);
    const kPassive = clampPositive(p.kPassive, 0);
    const lSlack = p.lSlack;
    const damping = clampPositive(p.damping, 0);
    const load = p.load;
    const u = clamp01(p.u);

    const aClamped = clamp01(a);
    const curveScale = evaluateActiveMuscleForceScale(l);
    const activeForce = aClamped * fMax * curveScale;
    const passiveForce = kPassive * Math.max(0, l - lSlack);
    const dampingForce = damping * v;
    const netForce = load - activeForce - passiveForce - dampingForce;

    return {
      activationError: u - aClamped,
      curveScale,
      activeForce,
      passiveForce,
      dampingForce,
      netForce
    };
  },
  presets: [
    {
      name: "Moderate Activation",
      y0: [1.05, 0, 0.05],
      params: {
        u: 0.6,
        load: 0
      }
    },
    {
      name: "Strong Activation",
      y0: [1.1, 0, 0.1],
      params: {
        u: 0.9,
        load: 0
      }
    },
    {
      name: "Loaded Contraction",
      y0: [1.1, 0, 0.1],
      params: {
        u: 0.75,
        load: 3.5
      }
    }
  ],
  plotSpec: [
    {
      id: "length-time",
      title: "Length vs Time",
      xLabel: "t",
      yLabel: "l",
      x: { kind: "time" },
      y: { kind: "state", index: 0 }
    },
    {
      id: "activation-time",
      title: "Activation vs Time",
      xLabel: "t",
      yLabel: "a",
      x: { kind: "time" },
      y: { kind: "state", index: 2 }
    },
    {
      id: "phase",
      title: "Length-Velocity Phase",
      xLabel: "l",
      yLabel: "v",
      x: { kind: "state", index: 0 },
      y: { kind: "state", index: 1 }
    },
    {
      id: "force-time",
      title: "Force Components vs Time (Active)",
      xLabel: "t",
      yLabel: "F_active",
      x: { kind: "time" },
      y: { kind: "derived", key: "activeForce" }
    },
    {
      id: "curve-track",
      title: "Visited Length-Tension Points",
      xLabel: "l",
      yLabel: "f_l(l)",
      x: { kind: "state", index: 0 },
      y: { kind: "derived", key: "curveScale" }
    },
    {
      id: "energy",
      title: "Mechanical Energy vs Time",
      xLabel: "t",
      yLabel: "E",
      x: { kind: "time" },
      y: { kind: "energy" }
    }
  ],
  vizSpec: {
    type: "muscleactivation"
  }
};

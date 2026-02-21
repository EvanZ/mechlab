import type { OdeSystem } from "../types";
import {
  defaultHillProfile,
  evaluateHillSlope,
  evaluateHillY,
  getActiveHillRange,
  setActiveHillProfile
} from "./hillProfile";

setActiveHillProfile(defaultHillProfile);

function clampPositive(value: number, minimum: number): number {
  return Math.max(minimum, value);
}

export const skiJumpSystem: OdeSystem = {
  id: "skijump",
  name: "Ski Jump With Friction",
  mode: "ode",
  state: {
    names: ["x", "v_t"],
    y0: [0, 0]
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 14
  },
  supportedIntegrators: ["rk4"],
  params: {
    g: 9.81,
    m: 75,
    muK: 0.08
  },
  rhs: (_t, y, p) => {
    const [x, vTangent] = y;
    const g = clampPositive(p.g, 1e-9);
    const muK = Math.max(0, p.muK);
    const range = getActiveHillRange();

    if ((x <= range.xMin && vTangent < 0) || (x >= range.xMax && vTangent > 0)) {
      return [0, 0];
    }

    const slope = evaluateHillSlope(x);
    const tangentNorm = Math.sqrt(1 + slope * slope);
    const xDot = vTangent / tangentNorm;

    const gravityTangential = (-g * slope) / tangentNorm;
    const frictionTangential = (muK * g * Math.sign(vTangent)) / tangentNorm;
    const vDot = gravityTangential - frictionTangential;

    return [xDot, vDot];
  },
  energy: (y, p) => {
    const [x, vTangent] = y;
    const mass = clampPositive(p.m, 1e-9);
    const g = clampPositive(p.g, 1e-9);
    const height = evaluateHillY(x);
    const kinetic = 0.5 * mass * vTangent * vTangent;
    const potential = mass * g * height;

    return kinetic + potential;
  },
  derived: (y, p) => {
    const [x, vTangent] = y;
    const mass = clampPositive(p.m, 1e-9);
    const g = clampPositive(p.g, 1e-9);
    const muK = Math.max(0, p.muK);

    const slope = evaluateHillSlope(x);
    const tangentNorm = Math.sqrt(1 + slope * slope);
    const yCoord = evaluateHillY(x);
    const normalLoad = (mass * g) / tangentNorm;
    const frictionForce = muK * normalLoad;
    const tangentialAccel =
      (-g * slope) / tangentNorm - (muK * g * Math.sign(vTangent)) / tangentNorm;

    return {
      y: yCoord,
      slope,
      normalLoad,
      frictionForce,
      tangentialAccel
    };
  },
  presets: [
    {
      name: "Icy Track",
      y0: [0, 0],
      params: {
        muK: 0.03
      }
    },
    {
      name: "Packed Snow",
      y0: [0, 0],
      params: {
        muK: 0.08
      }
    },
    {
      name: "Slushy Snow",
      y0: [0, 0],
      params: {
        muK: 0.17
      }
    }
  ],
  plotSpec: [
    {
      id: "profile",
      title: "Hill Profile (x, y)",
      xLabel: "x",
      yLabel: "y",
      x: { kind: "state", index: 0 },
      y: { kind: "derived", key: "y" }
    },
    {
      id: "speed-time",
      title: "Tangential Speed vs Time",
      xLabel: "t",
      yLabel: "v_t",
      x: { kind: "time" },
      y: { kind: "state", index: 1 }
    },
    {
      id: "height-time",
      title: "Height vs Time",
      xLabel: "t",
      yLabel: "y",
      x: { kind: "time" },
      y: { kind: "derived", key: "y" }
    },
    {
      id: "energy-time",
      title: "Mechanical Energy vs Time",
      xLabel: "t",
      yLabel: "E",
      x: { kind: "time" },
      y: { kind: "energy" }
    },
    {
      id: "slope-x",
      title: "Local Slope dy/dx vs x",
      xLabel: "x",
      yLabel: "dy/dx",
      x: { kind: "state", index: 0 },
      y: { kind: "derived", key: "slope" }
    }
  ],
  vizSpec: {
    type: "skijump"
  }
};

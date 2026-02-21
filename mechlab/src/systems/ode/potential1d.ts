import type { OdeSystem } from "../types";
import {
  defaultPotentialExpression,
  evaluateActivePotential,
  evaluateActivePotentialGradient,
  setActivePotentialExpression
} from "./potentialExpression";

function safeMass(rawMass: number): number {
  return Math.max(1e-8, rawMass);
}

function safeGradientStep(rawStep: number): number {
  return Math.max(1e-6, rawStep);
}

setActivePotentialExpression(defaultPotentialExpression);

export const potential1dSystem: OdeSystem = {
  id: "potential1d",
  name: "1D Potential V(x)",
  mode: "ode",
  state: {
    names: ["x", "v"],
    y0: [1.0, 0.0]
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 20
  },
  supportedIntegrators: ["rk4", "verlet"],
  params: {
    m: 1,
    gradStep: 0.001
  },
  rhs: (_t, y, p) => {
    const [x, v] = y;
    const mass = safeMass(p.m);
    const gradStep = safeGradientStep(p.gradStep);
    const dVdx = evaluateActivePotentialGradient(x, gradStep);

    return [v, -dVdx / mass];
  },
  energy: (y, p) => {
    const [x, v] = y;
    const mass = safeMass(p.m);
    const potential = evaluateActivePotential(x);
    const kinetic = 0.5 * mass * v * v;

    return kinetic + potential;
  },
  derived: (y, p) => {
    const [x, v] = y;
    const mass = safeMass(p.m);
    const gradStep = safeGradientStep(p.gradStep);
    const potential = evaluateActivePotential(x);
    const dVdx = evaluateActivePotentialGradient(x, gradStep);

    return {
      potential,
      force: -dVdx,
      kinetic: 0.5 * mass * v * v
    };
  },
  presets: [
    {
      name: "Harmonic Well",
      y0: [1, 0],
      expression: "0.5 * x^2"
    },
    {
      name: "Double Well",
      y0: [0.25, 0],
      expression: "0.25 * x^4 - 0.5 * x^2"
    },
    {
      name: "Anharmonic Spring",
      y0: [1.1, 0],
      expression: "0.5 * x^2 + 0.08 * x^4"
    },
    {
      name: "Tilted Well",
      y0: [0.1, 0],
      expression: "0.25 * x^4 - 0.45 * x^2 + 0.12 * x"
    }
  ],
  plotSpec: [
    {
      id: "x-time",
      title: "Position vs Time",
      xLabel: "t",
      yLabel: "x",
      x: { kind: "time" },
      y: { kind: "state", index: 0 }
    },
    {
      id: "phase",
      title: "Phase Portrait",
      xLabel: "x",
      yLabel: "v",
      x: { kind: "state", index: 0 },
      y: { kind: "state", index: 1 }
    },
    {
      id: "energy",
      title: "Energy vs Time",
      xLabel: "t",
      yLabel: "E",
      x: { kind: "time" },
      y: { kind: "energy" }
    },
    {
      id: "potential-track",
      title: "Visited Potential Points V(x)",
      xLabel: "x",
      yLabel: "V(x)",
      x: { kind: "state", index: 0 },
      y: { kind: "derived", key: "potential" }
    },
    {
      id: "force-time",
      title: "Force vs Time",
      xLabel: "t",
      yLabel: "F(x)",
      x: { kind: "time" },
      y: { kind: "derived", key: "force" }
    }
  ],
  vizSpec: {
    type: "potential1d"
  }
};

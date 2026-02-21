import type { OdeSystem } from "../types";

export const pendulumSystem: OdeSystem = {
  id: "pendulum",
  name: "Pendulum",
  mode: "ode",
  state: {
    names: ["theta", "omega"],
    y0: [1.0, 0.0]
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 20
  },
  supportedIntegrators: ["rk4", "verlet"],
  params: {
    g: 9.81,
    l: 1.0
  },
  rhs: (_t, y, p) => {
    const [theta, omega] = y;
    const g = p.g;
    const l = p.l;

    return [omega, -(g / l) * Math.sin(theta)];
  },
  energy: (y, p) => {
    const [theta, omega] = y;
    const g = p.g;
    const l = p.l;

    return 0.5 * l * l * omega * omega + g * l * (1 - Math.cos(theta));
  },
  derived: (y, p) => {
    const [theta] = y;
    const l = p.l;

    return {
      bobX: l * Math.sin(theta),
      bobY: l * Math.cos(theta)
    };
  },
  presets: [
    {
      name: "Small Angle",
      y0: [0.2, 0.0]
    },
    {
      name: "Large Swing",
      y0: [1.6, 0.0]
    },
    {
      name: "Rotating",
      y0: [0.2, 6.5]
    }
  ],
  plotSpec: [
    {
      id: "theta-time",
      title: "Angle vs Time",
      xLabel: "t",
      yLabel: "theta",
      x: { kind: "time" },
      y: { kind: "state", index: 0 }
    },
    {
      id: "phase",
      title: "Phase Portrait",
      xLabel: "theta",
      yLabel: "omega",
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
    }
  ],
  vizSpec: {
    type: "pendulum"
  }
};

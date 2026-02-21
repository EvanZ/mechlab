import type { OdeSystem } from "../types";

export const oscillatorSystem: OdeSystem = {
  id: "oscillator",
  name: "Harmonic Oscillator",
  mode: "ode",
  state: {
    names: ["x", "v"],
    y0: [1, 0]
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 20
  },
  supportedIntegrators: ["rk4", "verlet"],
  params: {
    m: 1,
    k: 1
  },
  rhs: (_t, y, p) => {
    const [x, v] = y;
    return [v, -(p.k / p.m) * x];
  },
  energy: (y, p) => {
    const [x, v] = y;
    return 0.5 * p.m * v * v + 0.5 * p.k * x * x;
  },
  presets: [
    {
      name: "Unit Amplitude",
      y0: [1, 0]
    },
    {
      name: "Offset Velocity",
      y0: [0.3, 1.4]
    },
    {
      name: "Stiff Spring",
      y0: [1, 0],
      params: { k: 4 }
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
    }
  ],
  vizSpec: {
    type: "oscillator"
  }
};

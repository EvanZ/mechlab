import type { OdeSystem } from "../types";

export const orbitSystem: OdeSystem = {
  id: "orbit",
  name: "Orbiting Satellite",
  mode: "ode",
  state: {
    names: ["x", "y", "vx", "vy"],
    y0: [1, 0, 0, 1]
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 40
  },
  supportedIntegrators: ["rk4", "verlet"],
  params: {
    mu: 1
  },
  rhs: (_t, y, p) => {
    const [x, yPos, vx, vy] = y;
    const r2 = x * x + yPos * yPos;
    const r = Math.sqrt(r2);
    const invR3 = r === 0 ? 0 : 1 / (r2 * r);

    return [vx, vy, -p.mu * x * invR3, -p.mu * yPos * invR3];
  },
  energy: (y, p) => {
    const [x, yPos, vx, vy] = y;
    const r = Math.hypot(x, yPos);

    if (r === 0) {
      return Number.POSITIVE_INFINITY;
    }

    return 0.5 * (vx * vx + vy * vy) - p.mu / r;
  },
  presets: [
    {
      name: "Circular Orbit",
      y0: [1, 0, 0, 1]
    },
    {
      name: "Elliptical Orbit",
      y0: [1, 0, 0, 0.85]
    },
    {
      name: "High-Energy Flyby",
      y0: [1, 0, 0, 1.3]
    }
  ],
  plotSpec: [
    {
      id: "trajectory",
      title: "Orbit Trajectory (x, y)",
      xLabel: "x",
      yLabel: "y",
      x: { kind: "state", index: 0 },
      y: { kind: "state", index: 1 }
    },
    {
      id: "radius-time",
      title: "Radius vs Time",
      xLabel: "t",
      yLabel: "r",
      x: { kind: "time" },
      y: { kind: "derived", key: "radius" }
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
  derived: (y) => {
    const [x, yPos] = y;
    return {
      radius: Math.hypot(x, yPos)
    };
  },
  vizSpec: {
    type: "orbit"
  }
};

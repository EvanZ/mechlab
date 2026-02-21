import type { OdeSystem } from "../types";

export const projectileSystem: OdeSystem = {
  id: "projectile",
  name: "Projectile",
  mode: "ode",
  state: {
    names: ["x", "y", "vx", "vy"],
    y0: [0, 0, 5, 10]
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 3
  },
  params: {
    g: 9.81
  },
  rhs: (_t, y, p) => {
    const [, , vx, vy] = y;
    return [vx, vy, 0, -p.g];
  },
  presets: [
    {
      name: "45 Degrees",
      y0: [0, 0, 8, 8]
    },
    {
      name: "High Arc",
      y0: [0, 0, 5, 12]
    },
    {
      name: "Low Arc",
      y0: [0, 0, 10, 4]
    }
  ],
  plotSpec: [
    {
      id: "trajectory",
      title: "Trajectory (x, y)",
      xLabel: "x",
      yLabel: "y",
      x: { kind: "state", index: 0 },
      y: { kind: "state", index: 1 }
    },
    {
      id: "height-time",
      title: "Height vs Time",
      xLabel: "t",
      yLabel: "y",
      x: { kind: "time" },
      y: { kind: "state", index: 1 }
    },
    {
      id: "vy-time",
      title: "Vertical Velocity vs Time",
      xLabel: "t",
      yLabel: "vy",
      x: { kind: "time" },
      y: { kind: "state", index: 3 }
    }
  ],
  vizSpec: {
    type: "projectile"
  }
};

import type { OdeSystem } from "../types";

export function electricFieldAt(
  x: number,
  y: number,
  p: Record<string, number>
): { ex: number; ey: number } {
  const ex0 = p.ex0;
  const ey0 = p.ey0;
  const sourceStrength = p.sourceStrength;
  const coreRadius = Math.max(1e-4, p.coreRadius);

  const r2 = x * x + y * y + coreRadius * coreRadius;
  const r = Math.sqrt(r2);
  const invR3 = r === 0 ? 0 : 1 / (r2 * r);

  const exSource = sourceStrength * x * invR3;
  const eySource = sourceStrength * y * invR3;

  return {
    ex: ex0 + exSource,
    ey: ey0 + eySource
  };
}

function chargeToMass(p: Record<string, number>): number {
  const m = Math.max(1e-8, p.m);
  return p.q / m;
}

export const chargedParticleSystem: OdeSystem = {
  id: "chargedparticle",
  name: "Charged Particle In E-Field",
  mode: "ode",
  state: {
    names: ["x", "y", "vx", "vy"],
    y0: [-1.3, 0.2, 1.0, 0]
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 14
  },
  supportedIntegrators: ["rk4", "verlet"],
  params: {
    q: 1,
    m: 1,
    ex0: 0.8,
    ey0: 0,
    sourceStrength: 0,
    coreRadius: 0.18
  },
  rhs: (_t, y, p) => {
    const [x, yPos, vx, vy] = y;
    const { ex, ey } = electricFieldAt(x, yPos, p);
    const qOverM = chargeToMass(p);
    const ax = qOverM * ex;
    const ay = qOverM * ey;

    return [vx, vy, ax, ay];
  },
  energy: (y, p) => {
    const [x, yPos, vx, vy] = y;
    const m = Math.max(1e-8, p.m);
    const q = p.q;
    const ex0 = p.ex0;
    const ey0 = p.ey0;
    const sourceStrength = p.sourceStrength;
    const coreRadius = Math.max(1e-4, p.coreRadius);

    const r = Math.sqrt(x * x + yPos * yPos + coreRadius * coreRadius);
    const phi = -(ex0 * x + ey0 * yPos) + sourceStrength / r;
    const kinetic = 0.5 * m * (vx * vx + vy * vy);

    return kinetic + q * phi;
  },
  derived: (y, p) => {
    const [x, yPos, vx, vy] = y;
    const { ex, ey } = electricFieldAt(x, yPos, p);
    const qOverM = chargeToMass(p);
    const ax = qOverM * ex;
    const ay = qOverM * ey;
    const fieldMag = Math.hypot(ex, ey);
    const speed = Math.hypot(vx, vy);
    const r = Math.sqrt(x * x + yPos * yPos + Math.max(1e-4, p.coreRadius) ** 2);
    const phi = -(p.ex0 * x + p.ey0 * yPos) + p.sourceStrength / r;

    return {
      ex,
      ey,
      fieldMag,
      speed,
      ax,
      ay,
      phi
    };
  },
  presets: [
    {
      name: "Uniform Field",
      y0: [-1.4, 0, 0.6, 0],
      params: {
        q: 1,
        m: 1,
        ex0: 1.0,
        ey0: 0,
        sourceStrength: 0
      }
    },
    {
      name: "Opposite Charge",
      y0: [-1.4, 0, 0.6, 0],
      params: {
        q: -1,
        m: 1,
        ex0: 1.0,
        ey0: 0,
        sourceStrength: 0
      }
    },
    {
      name: "Point Source Deflection",
      y0: [-1.6, 0.2, 1.1, 0],
      params: {
        q: 1,
        m: 1,
        ex0: 0,
        ey0: 0,
        sourceStrength: 1.8,
        coreRadius: 0.15
      }
    },
    {
      name: "Source + Drift",
      y0: [-1.6, -0.3, 1.0, 0.35],
      params: {
        q: 1,
        m: 1,
        ex0: 0.35,
        ey0: 0.15,
        sourceStrength: 1.2,
        coreRadius: 0.2
      }
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
      id: "speed-time",
      title: "Speed vs Time",
      xLabel: "t",
      yLabel: "|v|",
      x: { kind: "time" },
      y: { kind: "derived", key: "speed" }
    },
    {
      id: "velocity-phase",
      title: "Velocity Space (vx, vy)",
      xLabel: "vx",
      yLabel: "vy",
      x: { kind: "state", index: 2 },
      y: { kind: "state", index: 3 }
    },
    {
      id: "field-time",
      title: "Field Magnitude vs Time",
      xLabel: "t",
      yLabel: "|E|",
      x: { kind: "time" },
      y: { kind: "derived", key: "fieldMag" }
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
    type: "chargedparticle"
  }
};

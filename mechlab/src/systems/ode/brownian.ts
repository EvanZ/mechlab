import type { OdeSystem } from "../types";

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export interface BrownianConfig {
  x0: number;
  y0: number;
  D: number;
  driftX: number;
  driftY: number;
  trapK: number;
  seed: number;
}

function brownianConfigFromParams(p: Record<string, number>): BrownianConfig {
  return {
    x0: finiteOr(p.x0, 0),
    y0: finiteOr(p.y0, 0),
    D: Math.max(0, finiteOr(p.D, 0.22)),
    driftX: finiteOr(p.driftX, 0),
    driftY: finiteOr(p.driftY, 0),
    trapK: Math.max(0, finiteOr(p.trapK, 0)),
    seed: Math.round(finiteOr(p.seed, 7))
  };
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;

  return () => {
    t += 0x6d2b79f5;
    let z = Math.imul(t ^ (t >>> 15), 1 | t);
    z ^= z + Math.imul(z ^ (z >>> 7), 61 | z);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianSampler(random: () => number): () => number {
  let spare: number | null = null;

  return () => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }

    let u = 0;
    let v = 0;

    while (u <= 1e-12) {
      u = random();
    }

    v = random();

    const mag = Math.sqrt(-2 * Math.log(u));
    const z0 = mag * Math.cos(2 * Math.PI * v);
    const z1 = mag * Math.sin(2 * Math.PI * v);

    spare = z1;
    return z0;
  };
}

export function buildBrownianInitialState(p: Record<string, number>): number[] {
  const cfg = brownianConfigFromParams(p);
  return [cfg.x0, cfg.y0, 0];
}

export interface BrownianSimulationOptions {
  t0: number;
  y0: number[];
  dt: number;
  steps: number;
  params: Record<string, number>;
}

export interface BrownianSimulationResult {
  t: number[];
  y: number[][];
}

export function simulateBrownianTrajectory(
  options: BrownianSimulationOptions
): BrownianSimulationResult {
  const cfg = brownianConfigFromParams(options.params);

  const xInit = Number.isFinite(options.y0[0]) ? options.y0[0] : cfg.x0;
  const yInit = Number.isFinite(options.y0[1]) ? options.y0[1] : cfg.y0;
  const timeInit = Number.isFinite(options.y0[2]) ? options.y0[2] : options.t0;

  const t = new Array<number>(options.steps + 1);
  const y = new Array<number[]>(options.steps + 1);

  t[0] = options.t0;
  y[0] = [xInit, yInit, timeInit];

  const rng = mulberry32(cfg.seed);
  const normal = gaussianSampler(rng);
  const dtSafe = Math.max(1e-9, options.dt);
  const noiseScale = Math.sqrt(2 * cfg.D * dtSafe);

  let x = xInit;
  let yPos = yInit;
  let timeState = timeInit;

  for (let i = 0; i < options.steps; i += 1) {
    const driftX = cfg.driftX - cfg.trapK * x;
    const driftY = cfg.driftY - cfg.trapK * yPos;

    x += driftX * dtSafe + noiseScale * normal();
    yPos += driftY * dtSafe + noiseScale * normal();
    timeState += dtSafe;

    t[i + 1] = options.t0 + (i + 1) * dtSafe;
    y[i + 1] = [x, yPos, timeState];
  }

  return { t, y };
}

function derivedFromState(y: number[], p: Record<string, number>): Record<string, number> {
  const [x, yPos, tState] = y;
  const cfg = brownianConfigFromParams(p);

  const r2 = x * x + yPos * yPos;

  return {
    radius: Math.sqrt(Math.max(0, r2)),
    r2,
    msdTheory: 4 * cfg.D * Math.max(0, tState),
    driftMag: Math.hypot(cfg.driftX, cfg.driftY),
    timeState: tState
  };
}

const defaultParams = {
  x0: 0,
  y0: 0,
  D: 0.22,
  driftX: 0,
  driftY: 0,
  trapK: 0,
  seed: 7
};

export const brownianSystem: OdeSystem = {
  id: "brownian",
  name: "Brownian Motion (Classical 2D)",
  mode: "ode",
  state: {
    names: [],
    y0: buildBrownianInitialState(defaultParams)
  },
  simulationDefaults: {
    dt: 0.02,
    duration: 24
  },
  supportedIntegrators: ["rk4"],
  params: { ...defaultParams },
  rhs: (_t, y, p) => {
    const [x, yPos] = y;
    const cfg = brownianConfigFromParams(p);

    return [cfg.driftX - cfg.trapK * x, cfg.driftY - cfg.trapK * yPos, 1];
  },
  derived: (y, p) => derivedFromState(y, p),
  presets: [
    {
      name: "Pure Diffusion",
      y0: buildBrownianInitialState(defaultParams)
    },
    {
      name: "Low Diffusion",
      y0: buildBrownianInitialState({
        ...defaultParams,
        D: 0.08
      }),
      params: {
        D: 0.08
      }
    },
    {
      name: "High Diffusion",
      y0: buildBrownianInitialState({
        ...defaultParams,
        D: 0.55
      }),
      params: {
        D: 0.55
      }
    },
    {
      name: "Flow Drift",
      y0: buildBrownianInitialState({
        ...defaultParams,
        driftX: 0.22,
        driftY: 0.08
      }),
      params: {
        driftX: 0.22,
        driftY: 0.08
      }
    },
    {
      name: "Weak Harmonic Trap",
      y0: buildBrownianInitialState({
        ...defaultParams,
        D: 0.25,
        trapK: 0.08
      }),
      params: {
        D: 0.25,
        trapK: 0.08
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
      id: "r2-time",
      title: "Squared Displacement r^2 vs Time",
      xLabel: "t",
      yLabel: "r^2",
      x: { kind: "time" },
      y: { kind: "derived", key: "r2" }
    },
    {
      id: "radius-time",
      title: "Displacement Radius r vs Time",
      xLabel: "t",
      yLabel: "r",
      x: { kind: "time" },
      y: { kind: "derived", key: "radius" }
    },
    {
      id: "msd-theory-time",
      title: "Free-Diffusion MSD Theory 4Dt",
      xLabel: "t",
      yLabel: "4Dt",
      x: { kind: "time" },
      y: { kind: "derived", key: "msdTheory" }
    }
  ],
  vizSpec: {
    type: "brownian"
  }
};

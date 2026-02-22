import type { OdeSystem } from "../types";

export interface Wave2dConfig {
  nx: number;
  ny: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  dx: number;
  dy: number;
  cWave: number;
  damping: number;
  edgeDamping: number;
  periodic: number;
  dropX0: number;
  dropY0: number;
  dropSigma: number;
  dropAmp: number;
  dropV0: number;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeGrid(value: number, fallback: number): number {
  return clamp(Math.round(finiteOr(value, fallback)), 20, 96);
}

function sanitizeBaseParams(p: Record<string, number>): Omit<Wave2dConfig, "nx" | "ny" | "dx" | "dy"> {
  const xMin = finiteOr(p.xMin, -6);
  const rawXMax = finiteOr(p.xMax, 6);
  const xMax = rawXMax > xMin + 1e-6 ? rawXMax : xMin + 1;

  const yMin = finiteOr(p.yMin, -6);
  const rawYMax = finiteOr(p.yMax, 6);
  const yMax = rawYMax > yMin + 1e-6 ? rawYMax : yMin + 1;

  return {
    xMin,
    xMax,
    yMin,
    yMax,
    cWave: Math.max(1e-6, finiteOr(p.cWave, 2.2)),
    damping: Math.max(0, finiteOr(p.damping, 0.02)),
    edgeDamping: Math.max(0, finiteOr(p.edgeDamping, 0.3)),
    periodic: clamp(finiteOr(p.periodic, 0), 0, 1),
    dropX0: finiteOr(p.dropX0, 0),
    dropY0: finiteOr(p.dropY0, 0),
    dropSigma: Math.max(0.05, finiteOr(p.dropSigma, 0.36)),
    dropAmp: finiteOr(p.dropAmp, 1),
    dropV0: finiteOr(p.dropV0, 0)
  };
}

export function wave2dFromParams(p: Record<string, number>, stateLength?: number): Wave2dConfig {
  const base = sanitizeBaseParams(p);

  let nx = sanitizeGrid(p.gridX, 48);
  let ny = sanitizeGrid(p.gridY, 48);

  const halfLength = stateLength && stateLength % 2 === 0 ? stateLength / 2 : NaN;
  if (Number.isFinite(halfLength) && halfLength >= 100) {
    const total = Math.round(halfLength);
    const ratioHint = (base.xMax - base.xMin) / Math.max(1e-6, base.yMax - base.yMin);
    const guess = Math.max(1, Math.round(Math.sqrt(total * ratioHint)));

    let foundNx = 0;

    for (let delta = 0; delta <= total; delta += 1) {
      const lower = guess - delta;
      if (lower >= 1 && total % lower === 0) {
        foundNx = lower;
        break;
      }

      const upper = guess + delta;
      if (upper >= 1 && total % upper === 0) {
        foundNx = upper;
        break;
      }
    }

    if (foundNx > 0) {
      nx = foundNx;
      ny = Math.max(1, total / foundNx);
    }
  }

  const dx = (base.xMax - base.xMin) / Math.max(1, nx - 1);
  const dy = (base.yMax - base.yMin) / Math.max(1, ny - 1);

  return {
    ...base,
    nx,
    ny,
    dx,
    dy
  };
}

function flattenIndex(i: number, j: number, cfg: Wave2dConfig): number {
  return j * cfg.nx + i;
}

function splitState(y: number[], cfg: Wave2dConfig): { eta: number[]; vel: number[] } {
  const nCells = cfg.nx * cfg.ny;
  const expected = 2 * nCells;

  if (y.length !== expected) {
    throw new Error(`Wave2D state length mismatch: expected ${expected}, got ${y.length}.`);
  }

  return {
    eta: y.slice(0, nCells),
    vel: y.slice(nCells)
  };
}

function wrapIndex(index: number, size: number): number {
  return ((index % size) + size) % size;
}

function etaAt(eta: number[], i: number, j: number, cfg: Wave2dConfig): number {
  if (cfg.periodic >= 0.5) {
    const ii = wrapIndex(i, cfg.nx);
    const jj = wrapIndex(j, cfg.ny);
    return eta[flattenIndex(ii, jj, cfg)] ?? 0;
  }

  if (i < 0 || i >= cfg.nx || j < 0 || j >= cfg.ny) {
    return 0;
  }

  return eta[flattenIndex(i, j, cfg)] ?? 0;
}

function laplacian(eta: number[], i: number, j: number, cfg: Wave2dConfig): number {
  const center = etaAt(eta, i, j, cfg);
  const left = etaAt(eta, i - 1, j, cfg);
  const right = etaAt(eta, i + 1, j, cfg);
  const down = etaAt(eta, i, j - 1, cfg);
  const up = etaAt(eta, i, j + 1, cfg);

  const dxx = (left - 2 * center + right) / (cfg.dx * cfg.dx);
  const dyy = (down - 2 * center + up) / (cfg.dy * cfg.dy);

  return dxx + dyy;
}

function edgeDampingWeight(i: number, j: number, cfg: Wave2dConfig): number {
  if (cfg.periodic >= 0.5 || cfg.edgeDamping <= 0) {
    return 0;
  }

  const fx = Math.min(i / Math.max(1, cfg.nx - 1), (cfg.nx - 1 - i) / Math.max(1, cfg.nx - 1));
  const fy = Math.min(j / Math.max(1, cfg.ny - 1), (cfg.ny - 1 - j) / Math.max(1, cfg.ny - 1));
  const distanceToEdge = Math.min(fx, fy);

  const edgeBand = 0.22;
  if (distanceToEdge >= edgeBand) {
    return 0;
  }

  const ratio = (edgeBand - distanceToEdge) / edgeBand;
  return ratio * ratio;
}

function xAt(i: number, cfg: Wave2dConfig): number {
  return cfg.xMin + i * cfg.dx;
}

function yAt(j: number, cfg: Wave2dConfig): number {
  return cfg.yMin + j * cfg.dy;
}

function nearestIndex(value: number, min: number, step: number, size: number): number {
  const raw = Math.round((value - min) / step);
  return clamp(raw, 0, size - 1);
}

export function buildWave2dInitialState(p: Record<string, number>): number[] {
  const cfg = wave2dFromParams(p);
  const nCells = cfg.nx * cfg.ny;

  const eta = new Array<number>(nCells);
  const vel = new Array<number>(nCells);

  const sigma2 = cfg.dropSigma * cfg.dropSigma;

  for (let j = 0; j < cfg.ny; j += 1) {
    const y = yAt(j, cfg);

    for (let i = 0; i < cfg.nx; i += 1) {
      const x = xAt(i, cfg);
      const idx = flattenIndex(i, j, cfg);

      const dx = x - cfg.dropX0;
      const dy = y - cfg.dropY0;
      const r2 = dx * dx + dy * dy;
      const envelope = Math.exp(-0.5 * r2 / sigma2);

      eta[idx] = cfg.dropAmp * envelope;
      vel[idx] = cfg.dropV0 * envelope;
    }
  }

  return [...eta, ...vel];
}

export interface Wave2dObservables {
  centerEta: number;
  peakAbsEta: number;
  meanAbsEta: number;
  rmsRadius: number;
  rmsSpeed: number;
}

export function wave2dObservablesFromState(y: number[], p: Record<string, number>): Wave2dObservables {
  const cfg = wave2dFromParams(p, y.length);
  const { eta, vel } = splitState(y, cfg);

  const centerI = nearestIndex(cfg.dropX0, cfg.xMin, cfg.dx, cfg.nx);
  const centerJ = nearestIndex(cfg.dropY0, cfg.yMin, cfg.dy, cfg.ny);

  const centerEta = eta[flattenIndex(centerI, centerJ, cfg)] ?? 0;

  let peakAbsEta = 0;
  let sumAbs = 0;
  let sumWeight = 0;
  let sumWR2 = 0;
  let sumVel2 = 0;

  for (let j = 0; j < cfg.ny; j += 1) {
    const yPos = yAt(j, cfg);

    for (let i = 0; i < cfg.nx; i += 1) {
      const xPos = xAt(i, cfg);
      const idx = flattenIndex(i, j, cfg);
      const h = eta[idx] ?? 0;
      const v = vel[idx] ?? 0;
      const absH = Math.abs(h);

      peakAbsEta = Math.max(peakAbsEta, absH);
      sumAbs += absH;
      sumVel2 += v * v;

      const dx = xPos - cfg.dropX0;
      const dy = yPos - cfg.dropY0;
      const r2 = dx * dx + dy * dy;

      sumWeight += absH;
      sumWR2 += absH * r2;
    }
  }

  const nCells = cfg.nx * cfg.ny;

  return {
    centerEta,
    peakAbsEta,
    meanAbsEta: nCells > 0 ? sumAbs / nCells : 0,
    rmsRadius: sumWeight > 1e-10 ? Math.sqrt(sumWR2 / sumWeight) : 0,
    rmsSpeed: nCells > 0 ? Math.sqrt(sumVel2 / nCells) : 0
  };
}

function wave2dEnergyFromState(y: number[], p: Record<string, number>): number {
  const cfg = wave2dFromParams(p, y.length);
  const { eta, vel } = splitState(y, cfg);

  let total = 0;

  for (let j = 0; j < cfg.ny; j += 1) {
    for (let i = 0; i < cfg.nx; i += 1) {
      const idx = flattenIndex(i, j, cfg);
      const v = vel[idx] ?? 0;

      const hx = (etaAt(eta, i + 1, j, cfg) - etaAt(eta, i - 1, j, cfg)) / (2 * cfg.dx);
      const hy = (etaAt(eta, i, j + 1, cfg) - etaAt(eta, i, j - 1, cfg)) / (2 * cfg.dy);

      const kinetic = 0.5 * v * v;
      const potential = 0.5 * cfg.cWave * cfg.cWave * (hx * hx + hy * hy);

      total += (kinetic + potential) * cfg.dx * cfg.dy;
    }
  }

  return total;
}

const defaultParams = {
  gridX: 48,
  gridY: 48,
  xMin: -6,
  xMax: 6,
  yMin: -6,
  yMax: 6,
  cWave: 2.2,
  damping: 0.02,
  edgeDamping: 0.3,
  periodic: 0,
  dropX0: 0,
  dropY0: 0,
  dropSigma: 0.36,
  dropAmp: 1,
  dropV0: 0
};

export const wave2dSystem: OdeSystem = {
  id: "wave2d",
  name: "2D Water Ripple (Classical Wave)",
  mode: "ode",
  state: {
    names: [],
    y0: buildWave2dInitialState(defaultParams)
  },
  simulationDefaults: {
    dt: 0.015,
    duration: 8
  },
  supportedIntegrators: ["rk4", "verlet"],
  params: { ...defaultParams },
  rhs: (_t, y, p) => {
    const cfg = wave2dFromParams(p, y.length);
    const { eta, vel } = splitState(y, cfg);

    const dEta = new Array<number>(cfg.nx * cfg.ny);
    const dVel = new Array<number>(cfg.nx * cfg.ny);

    for (let j = 0; j < cfg.ny; j += 1) {
      for (let i = 0; i < cfg.nx; i += 1) {
        const idx = flattenIndex(i, j, cfg);
        const lap = laplacian(eta, i, j, cfg);
        const localDamping = cfg.damping + cfg.edgeDamping * edgeDampingWeight(i, j, cfg);

        dEta[idx] = vel[idx] ?? 0;
        dVel[idx] = cfg.cWave * cfg.cWave * lap - localDamping * (vel[idx] ?? 0);
      }
    }

    return [...dEta, ...dVel];
  },
  energy: (y, p) => wave2dEnergyFromState(y, p),
  derived: (y, p) => {
    const obs = wave2dObservablesFromState(y, p);

    return {
      centerEta: obs.centerEta,
      peakAbsEta: obs.peakAbsEta,
      meanAbsEta: obs.meanAbsEta,
      rmsRadius: obs.rmsRadius,
      rmsSpeed: obs.rmsSpeed
    };
  },
  presets: [
    {
      name: "Single Stone (Calm Lake)",
      y0: buildWave2dInitialState({
        ...defaultParams,
        dropSigma: 0.36,
        dropAmp: 1,
        dropV0: 0,
        damping: 0.02,
        edgeDamping: 0.3
      })
    },
    {
      name: "Hard Drop (Velocity Kick)",
      y0: buildWave2dInitialState({
        ...defaultParams,
        dropAmp: 0,
        dropV0: -4.5,
        dropSigma: 0.3
      }),
      params: {
        dropAmp: 0,
        dropV0: -4.5,
        dropSigma: 0.3
      }
    },
    {
      name: "Wide Splash",
      y0: buildWave2dInitialState({
        ...defaultParams,
        dropAmp: 1,
        dropSigma: 0.72,
        damping: 0.015
      }),
      params: {
        dropAmp: 1,
        dropSigma: 0.72,
        damping: 0.015
      }
    },
    {
      name: "Reflective Tank",
      y0: buildWave2dInitialState({
        ...defaultParams,
        edgeDamping: 0,
        damping: 0.005
      }),
      params: {
        edgeDamping: 0,
        damping: 0.005
      }
    }
  ],
  plotSpec: [
    {
      id: "center-time",
      title: "Surface Height at Drop Point",
      xLabel: "t",
      yLabel: "h_center",
      x: { kind: "time" },
      y: { kind: "derived", key: "centerEta" }
    },
    {
      id: "peak-time",
      title: "Peak |h| vs Time",
      xLabel: "t",
      yLabel: "max |h|",
      x: { kind: "time" },
      y: { kind: "derived", key: "peakAbsEta" }
    },
    {
      id: "radius-time",
      title: "RMS Wavefront Radius",
      xLabel: "t",
      yLabel: "r_rms",
      x: { kind: "time" },
      y: { kind: "derived", key: "rmsRadius" }
    },
    {
      id: "speed-time",
      title: "RMS Surface Speed",
      xLabel: "t",
      yLabel: "v_rms",
      x: { kind: "time" },
      y: { kind: "derived", key: "rmsSpeed" }
    },
    {
      id: "energy-time",
      title: "Wave Energy vs Time",
      xLabel: "t",
      yLabel: "E",
      x: { kind: "time" },
      y: { kind: "energy" }
    }
  ],
  vizSpec: {
    type: "wave2d"
  }
};

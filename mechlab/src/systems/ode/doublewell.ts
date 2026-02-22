import type { OdeSystem } from "../types";

export interface DoubleWellGridConfig {
  n: number;
  xMin: number;
  xMax: number;
  dx: number;
  m: number;
  hbar: number;
  wellSeparation: number;
  barrierHeight: number;
  tilt: number;
  packetSigma: number;
  packetK0: number;
  startInRight: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeBaseParams(p: Record<string, number>): Omit<DoubleWellGridConfig, "n" | "dx"> {
  const xMin = finiteOr(p.xMin, -8);
  const rawXMax = finiteOr(p.xMax, 8);
  const xMax = rawXMax > xMin + 1e-6 ? rawXMax : xMin + 1;

  return {
    xMin,
    xMax,
    m: Math.max(1e-8, finiteOr(p.m, 1)),
    hbar: Math.max(1e-8, finiteOr(p.hbar, 1)),
    wellSeparation: Math.max(0.6, finiteOr(p.wellSeparation, 4)),
    barrierHeight: Math.max(0.02, finiteOr(p.barrierHeight, 3.2)),
    tilt: finiteOr(p.tilt, 0),
    packetSigma: Math.max(0.06, finiteOr(p.packetSigma, 0.55)),
    packetK0: finiteOr(p.packetK0, 0),
    startInRight: clamp(finiteOr(p.startInRight, 0), 0, 1)
  };
}

function sanitizeGridPoints(value: number): number {
  return clamp(Math.round(finiteOr(value, 192)), 64, 384);
}

export function doubleWellGridFromParams(
  p: Record<string, number>,
  stateLength?: number
): DoubleWellGridConfig {
  const base = sanitizeBaseParams(p);
  const nFromState = stateLength && stateLength % 2 === 0 ? stateLength / 2 : NaN;
  const n = Number.isInteger(nFromState) && nFromState >= 3 ? nFromState : sanitizeGridPoints(p.gridPoints);
  const dx = (base.xMax - base.xMin) / Math.max(1, n - 1);

  return {
    ...base,
    n,
    dx
  };
}

export function doubleWellXAt(i: number, cfg: DoubleWellGridConfig): number {
  return cfg.xMin + i * cfg.dx;
}

export function doubleWellPotentialAtX(
  x: number,
  cfg: Pick<DoubleWellGridConfig, "wellSeparation" | "barrierHeight" | "tilt">
): number {
  const halfSep = 0.5 * Math.max(0.6, cfg.wellSeparation);
  const u = (x * x) / (halfSep * halfSep) - 1;
  return cfg.barrierHeight * u * u + cfg.tilt * x;
}

export function buildDoubleWellInitialState(p: Record<string, number>): number[] {
  const cfg = doubleWellGridFromParams(p);
  const re = new Array<number>(cfg.n);
  const im = new Array<number>(cfg.n);

  const halfSep = 0.5 * cfg.wellSeparation;
  const center = cfg.startInRight >= 0.5 ? halfSep : -halfSep;

  let normIntegral = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = doubleWellXAt(i, cfg);
    const envelope = Math.exp(-((x - center) ** 2) / (4 * cfg.packetSigma * cfg.packetSigma));
    const phase = cfg.packetK0 * x;

    re[i] = envelope * Math.cos(phase);
    im[i] = envelope * Math.sin(phase);
    normIntegral += (re[i] * re[i] + im[i] * im[i]) * cfg.dx;
  }

  const scale = normIntegral > 0 ? 1 / Math.sqrt(normIntegral) : 1;
  const y = new Array<number>(2 * cfg.n);

  for (let i = 0; i < cfg.n; i += 1) {
    y[i] = re[i] * scale;
    y[cfg.n + i] = im[i] * scale;
  }

  return y;
}

function splitState(y: number[], cfg: DoubleWellGridConfig): { re: number[]; im: number[] } {
  const expectedLength = 2 * cfg.n;
  if (y.length !== expectedLength) {
    throw new Error(`Double-well state length mismatch: expected ${expectedLength}, got ${y.length}.`);
  }

  return {
    re: y.slice(0, cfg.n),
    im: y.slice(cfg.n)
  };
}

function laplacian(arr: number[], i: number, cfg: DoubleWellGridConfig): number {
  const invDx2 = 1 / (cfg.dx * cfg.dx);
  const center = arr[i];
  const left = i > 0 ? arr[i - 1] : 0;
  const right = i + 1 < cfg.n ? arr[i + 1] : 0;
  return (left - 2 * center + right) * invDx2;
}

function firstDerivative(arr: number[], i: number, cfg: DoubleWellGridConfig): number {
  if (cfg.n < 2) {
    return 0;
  }

  if (i === 0) {
    return (arr[1] - arr[0]) / cfg.dx;
  }

  if (i === cfg.n - 1) {
    return (arr[cfg.n - 1] - arr[cfg.n - 2]) / cfg.dx;
  }

  return (arr[i + 1] - arr[i - 1]) / (2 * cfg.dx);
}

export interface DoubleWellObservables {
  norm: number;
  leftProb: number;
  rightProb: number;
  imbalance: number;
  xMean: number;
  peakDensity: number;
}

export function doubleWellObservablesFromState(
  y: number[],
  p: Record<string, number>
): DoubleWellObservables {
  const cfg = doubleWellGridFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);

  let norm = 0;
  let leftProb = 0;
  let rightProb = 0;
  let xMeanNumer = 0;
  let peakDensity = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = doubleWellXAt(i, cfg);
    const density = re[i] * re[i] + im[i] * im[i];
    const prob = density * cfg.dx;

    norm += prob;
    xMeanNumer += x * prob;
    peakDensity = Math.max(peakDensity, density);

    if (x < 0) {
      leftProb += prob;
    } else {
      rightProb += prob;
    }
  }

  const normSafe = norm > 1e-12 ? norm : 1;
  const left = leftProb / normSafe;
  const right = rightProb / normSafe;

  return {
    norm,
    leftProb: left,
    rightProb: right,
    imbalance: left - right,
    xMean: xMeanNumer / normSafe,
    peakDensity
  };
}

function doubleWellEnergyFromState(y: number[], p: Record<string, number>): number {
  const cfg = doubleWellGridFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);

  let kinetic = 0;
  let potential = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = doubleWellXAt(i, cfg);
    const dRdx = firstDerivative(re, i, cfg);
    const dIdx = firstDerivative(im, i, cfg);
    const density = re[i] * re[i] + im[i] * im[i];
    const v = doubleWellPotentialAtX(x, cfg);

    kinetic += 0.5 * ((cfg.hbar * cfg.hbar) / cfg.m) * (dRdx * dRdx + dIdx * dIdx) * cfg.dx;
    potential += v * density * cfg.dx;
  }

  return kinetic + potential;
}

const defaultParams = {
  m: 1,
  hbar: 1,
  gridPoints: 192,
  xMin: -8,
  xMax: 8,
  wellSeparation: 4,
  barrierHeight: 3.2,
  tilt: 0,
  packetSigma: 0.55,
  packetK0: 0,
  startInRight: 0
};

export const doubleWellSystem: OdeSystem = {
  id: "doublewell",
  name: "Quantum Double-Well Tunneling",
  mode: "ode",
  state: {
    names: [],
    y0: buildDoubleWellInitialState(defaultParams)
  },
  simulationDefaults: {
    dt: 0.002,
    duration: 24
  },
  supportedIntegrators: ["rk4"],
  params: defaultParams,
  rhs: (_t, y, p) => {
    const cfg = doubleWellGridFromParams(p, y.length);
    const { re, im } = splitState(y, cfg);
    const dRe = new Array<number>(cfg.n);
    const dIm = new Array<number>(cfg.n);

    for (let i = 0; i < cfg.n; i += 1) {
      const x = doubleWellXAt(i, cfg);
      const v = doubleWellPotentialAtX(x, cfg);
      const lapRe = laplacian(re, i, cfg);
      const lapIm = laplacian(im, i, cfg);

      dRe[i] = -(cfg.hbar / (2 * cfg.m)) * lapIm + (v / cfg.hbar) * im[i];
      dIm[i] = +(cfg.hbar / (2 * cfg.m)) * lapRe - (v / cfg.hbar) * re[i];
    }

    return [...dRe, ...dIm];
  },
  energy: (y, p) => doubleWellEnergyFromState(y, p),
  derived: (y, p) => {
    const cfg = doubleWellGridFromParams(p, y.length);
    const obs = doubleWellObservablesFromState(y, p);
    const halfSep = 0.5 * cfg.wellSeparation;

    return {
      norm: obs.norm,
      leftProb: obs.leftProb,
      rightProb: obs.rightProb,
      imbalance: obs.imbalance,
      xMean: obs.xMean,
      peakDensity: obs.peakDensity,
      wellLeft: -halfSep,
      wellRight: halfSep,
      barrierValue: doubleWellPotentialAtX(0, cfg)
    };
  },
  presets: [
    {
      name: "Symmetric L -> R Tunneling",
      y0: buildDoubleWellInitialState(defaultParams)
    },
    {
      name: "High Barrier (Slow)",
      y0: buildDoubleWellInitialState({
        ...defaultParams,
        barrierHeight: 5.2
      }),
      params: {
        barrierHeight: 5.2
      }
    },
    {
      name: "Low Barrier (Fast)",
      y0: buildDoubleWellInitialState({
        ...defaultParams,
        barrierHeight: 2.0
      }),
      params: {
        barrierHeight: 2.0
      }
    },
    {
      name: "Tilted Wells (Biased)",
      y0: buildDoubleWellInitialState({
        ...defaultParams,
        tilt: 0.22
      }),
      params: {
        tilt: 0.22
      }
    },
    {
      name: "Start In Right Well",
      y0: buildDoubleWellInitialState({
        ...defaultParams,
        startInRight: 1
      }),
      params: {
        startInRight: 1
      }
    }
  ],
  plotSpec: [
    {
      id: "leftprob-time",
      title: "Left-Well Probability vs Time",
      xLabel: "t",
      yLabel: "P_L",
      x: { kind: "time" },
      y: { kind: "derived", key: "leftProb" }
    },
    {
      id: "rightprob-time",
      title: "Right-Well Probability vs Time",
      xLabel: "t",
      yLabel: "P_R",
      x: { kind: "time" },
      y: { kind: "derived", key: "rightProb" }
    },
    {
      id: "imbalance-time",
      title: "Population Imbalance vs Time",
      xLabel: "t",
      yLabel: "P_L - P_R",
      x: { kind: "time" },
      y: { kind: "derived", key: "imbalance" }
    },
    {
      id: "xmean-time",
      title: "Mean Position <x> vs Time",
      xLabel: "t",
      yLabel: "<x>",
      x: { kind: "time" },
      y: { kind: "derived", key: "xMean" }
    },
    {
      id: "norm-time",
      title: "Norm vs Time",
      xLabel: "t",
      yLabel: "||psi||^2",
      x: { kind: "time" },
      y: { kind: "derived", key: "norm" }
    },
    {
      id: "energy-time",
      title: "Energy vs Time",
      xLabel: "t",
      yLabel: "E",
      x: { kind: "time" },
      y: { kind: "energy" }
    }
  ],
  vizSpec: {
    type: "doublewell"
  }
};

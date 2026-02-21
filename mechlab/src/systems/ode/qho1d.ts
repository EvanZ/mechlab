import type { OdeSystem } from "../types";

export interface QhoGridConfig {
  n: number;
  xMin: number;
  xMax: number;
  dx: number;
  m: number;
  omega: number;
  hbar: number;
  c0: number;
  c1: number;
  c2: number;
  phi1: number;
  phi2: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeGridPoints(value: number): number {
  return clamp(Math.round(finiteOr(value, 192)), 64, 512);
}

function sanitizeBaseParams(p: Record<string, number>): Omit<QhoGridConfig, "n" | "dx"> {
  const xMin = finiteOr(p.xMin, -8);
  const rawXMax = finiteOr(p.xMax, 8);
  const xMax = rawXMax > xMin + 1e-6 ? rawXMax : xMin + 1;

  return {
    xMin,
    xMax,
    m: Math.max(1e-8, finiteOr(p.m, 1)),
    omega: Math.max(1e-8, finiteOr(p.omega, 1)),
    hbar: Math.max(1e-8, finiteOr(p.hbar, 1)),
    c0: Math.max(0, finiteOr(p.c0, 1)),
    c1: Math.max(0, finiteOr(p.c1, 0.8)),
    c2: Math.max(0, finiteOr(p.c2, 0)),
    phi1: finiteOr(p.phi1, 0),
    phi2: finiteOr(p.phi2, 0)
  };
}

export function qhoGridFromParams(p: Record<string, number>, stateLength?: number): QhoGridConfig {
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

export function qhoXAt(i: number, cfg: QhoGridConfig): number {
  return cfg.xMin + i * cfg.dx;
}

export function qhoPotentialAtX(x: number, cfg: Pick<QhoGridConfig, "m" | "omega">): number {
  return 0.5 * cfg.m * cfg.omega * cfg.omega * x * x;
}

function splitState(y: number[], cfg: QhoGridConfig): { re: number[]; im: number[] } {
  if (y.length !== 2 * cfg.n) {
    throw new Error(`QHO state length mismatch: expected ${2 * cfg.n}, got ${y.length}.`);
  }

  return {
    re: y.slice(0, cfg.n),
    im: y.slice(cfg.n)
  };
}

function laplacian(arr: number[], i: number, cfg: QhoGridConfig): number {
  const invDx2 = 1 / (cfg.dx * cfg.dx);
  const center = arr[i];
  const left = i > 0 ? arr[i - 1] : 0;
  const right = i + 1 < cfg.n ? arr[i + 1] : 0;
  return (left - 2 * center + right) * invDx2;
}

function firstDerivative(arr: number[], i: number, cfg: QhoGridConfig): number {
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

function qhoPhi0(x: number, cfg: Pick<QhoGridConfig, "m" | "omega" | "hbar">): number {
  const alpha = (cfg.m * cfg.omega) / cfg.hbar;
  const norm = Math.pow(alpha / Math.PI, 0.25);
  return norm * Math.exp(-0.5 * alpha * x * x);
}

function qhoPhi1(x: number, cfg: Pick<QhoGridConfig, "m" | "omega" | "hbar">): number {
  const alpha = (cfg.m * cfg.omega) / cfg.hbar;
  return Math.sqrt(2 * alpha) * x * qhoPhi0(x, cfg);
}

function qhoPhi2(x: number, cfg: Pick<QhoGridConfig, "m" | "omega" | "hbar">): number {
  const alpha = (cfg.m * cfg.omega) / cfg.hbar;
  return ((2 * alpha * x * x - 1) / Math.SQRT2) * qhoPhi0(x, cfg);
}

function normalizedCoefficients(cfg: Pick<QhoGridConfig, "c0" | "c1" | "c2">): {
  a0: number;
  a1: number;
  a2: number;
} {
  const raw0 = Math.max(0, cfg.c0);
  const raw1 = Math.max(0, cfg.c1);
  const raw2 = Math.max(0, cfg.c2);
  const magnitude = Math.hypot(raw0, raw1, raw2);

  if (magnitude <= 1e-12) {
    return { a0: 1, a1: 0, a2: 0 };
  }

  return {
    a0: raw0 / magnitude,
    a1: raw1 / magnitude,
    a2: raw2 / magnitude
  };
}

export function buildQhoInitialState(p: Record<string, number>): number[] {
  const cfg = qhoGridFromParams(p);
  const { a0, a1, a2 } = normalizedCoefficients(cfg);
  const re = new Array<number>(cfg.n);
  const im = new Array<number>(cfg.n);

  let normIntegral = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = qhoXAt(i, cfg);
    const phi0 = qhoPhi0(x, cfg);
    const phi1 = qhoPhi1(x, cfg);
    const phi2 = qhoPhi2(x, cfg);

    re[i] = a0 * phi0 + a1 * Math.cos(cfg.phi1) * phi1 + a2 * Math.cos(cfg.phi2) * phi2;
    im[i] = a1 * Math.sin(cfg.phi1) * phi1 + a2 * Math.sin(cfg.phi2) * phi2;

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

export interface QhoObservables {
  norm: number;
  xMean: number;
  pMean: number;
  spread: number;
  peakDensity: number;
}

export function qhoObservablesFromState(y: number[], p: Record<string, number>): QhoObservables {
  const cfg = qhoGridFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);

  let norm = 0;
  let xMeanNumer = 0;
  let x2MeanNumer = 0;
  let pMeanNumer = 0;
  let peakDensity = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = qhoXAt(i, cfg);
    const density = re[i] * re[i] + im[i] * im[i];
    const prob = density * cfg.dx;
    const dRdx = firstDerivative(re, i, cfg);
    const dIdx = firstDerivative(im, i, cfg);

    norm += prob;
    xMeanNumer += x * prob;
    x2MeanNumer += x * x * prob;
    pMeanNumer += cfg.hbar * (re[i] * dIdx - im[i] * dRdx) * cfg.dx;
    peakDensity = Math.max(peakDensity, density);
  }

  const normSafe = norm > 1e-12 ? norm : 1;
  const xMean = xMeanNumer / normSafe;
  const x2Mean = x2MeanNumer / normSafe;

  return {
    norm,
    xMean,
    pMean: pMeanNumer / normSafe,
    spread: Math.sqrt(Math.max(0, x2Mean - xMean * xMean)),
    peakDensity
  };
}

function qhoEnergyFromState(y: number[], p: Record<string, number>): number {
  const cfg = qhoGridFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);

  let kinetic = 0;
  let potential = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = qhoXAt(i, cfg);
    const dRdx = firstDerivative(re, i, cfg);
    const dIdx = firstDerivative(im, i, cfg);
    const density = re[i] * re[i] + im[i] * im[i];

    kinetic +=
      (cfg.hbar * cfg.hbar / (2 * cfg.m)) *
      (dRdx * dRdx + dIdx * dIdx) *
      cfg.dx;
    potential += qhoPotentialAtX(x, cfg) * density * cfg.dx;
  }

  return kinetic + potential;
}

const defaultQhoParams = {
  m: 1,
  omega: 1,
  hbar: 1,
  gridPoints: 192,
  xMin: -8,
  xMax: 8,
  c0: 1,
  c1: 0.8,
  c2: 0,
  phi1: 0,
  phi2: 0
};

export const qho1dSystem: OdeSystem = {
  id: "qho1d",
  name: "Quantum Harmonic Oscillator (1D)",
  mode: "ode",
  state: {
    names: [],
    y0: buildQhoInitialState(defaultQhoParams)
  },
  simulationDefaults: {
    dt: 0.0015,
    duration: 24
  },
  supportedIntegrators: ["rk4"],
  params: { ...defaultQhoParams },
  rhs: (_t, y, p) => {
    const cfg = qhoGridFromParams(p, y.length);
    const { re, im } = splitState(y, cfg);
    const dRe = new Array<number>(cfg.n);
    const dIm = new Array<number>(cfg.n);

    for (let i = 0; i < cfg.n; i += 1) {
      const x = qhoXAt(i, cfg);
      const v = qhoPotentialAtX(x, cfg);
      const lapRe = laplacian(re, i, cfg);
      const lapIm = laplacian(im, i, cfg);

      dRe[i] = -(cfg.hbar / (2 * cfg.m)) * lapIm + (v / cfg.hbar) * im[i];
      dIm[i] = +(cfg.hbar / (2 * cfg.m)) * lapRe - (v / cfg.hbar) * re[i];
    }

    return [...dRe, ...dIm];
  },
  energy: (y, p) => qhoEnergyFromState(y, p),
  derived: (y, p) => {
    const obs = qhoObservablesFromState(y, p);
    return {
      norm: obs.norm,
      xMean: obs.xMean,
      pMean: obs.pMean,
      spread: obs.spread,
      peakDensity: obs.peakDensity
    };
  },
  presets: [
    {
      name: "Ground State",
      y0: buildQhoInitialState({
        ...defaultQhoParams,
        c0: 1,
        c1: 0,
        c2: 0
      }),
      params: {
        c0: 1,
        c1: 0,
        c2: 0,
        phi1: 0,
        phi2: 0
      }
    },
    {
      name: "Dipole Oscillation",
      y0: buildQhoInitialState({
        ...defaultQhoParams,
        c0: 1,
        c1: 0.8,
        c2: 0,
        phi1: 0,
        phi2: 0
      }),
      params: {
        c0: 1,
        c1: 0.8,
        c2: 0,
        phi1: 0,
        phi2: 0
      }
    },
    {
      name: "Breathing Mix",
      y0: buildQhoInitialState({
        ...defaultQhoParams,
        c0: 1,
        c1: 0,
        c2: 0.75,
        phi1: 0,
        phi2: 0
      }),
      params: {
        c0: 1,
        c1: 0,
        c2: 0.75,
        phi1: 0,
        phi2: 0
      }
    },
    {
      name: "Phase-Shifted Superposition",
      y0: buildQhoInitialState({
        ...defaultQhoParams,
        c0: 1,
        c1: 0.8,
        c2: 0.3,
        phi1: Math.PI / 2,
        phi2: Math.PI / 4
      }),
      params: {
        c0: 1,
        c1: 0.8,
        c2: 0.3,
        phi1: Math.PI / 2,
        phi2: Math.PI / 4
      }
    }
  ],
  plotSpec: [
    {
      id: "xmean-time",
      title: "Mean Position <x> vs Time",
      xLabel: "t",
      yLabel: "<x>",
      x: { kind: "time" },
      y: { kind: "derived", key: "xMean" }
    },
    {
      id: "pmean-time",
      title: "Mean Momentum <p> vs Time",
      xLabel: "t",
      yLabel: "<p>",
      x: { kind: "time" },
      y: { kind: "derived", key: "pMean" }
    },
    {
      id: "x-p-phase",
      title: "Quantum Centroid Phase (<x>, <p>)",
      xLabel: "<x>",
      yLabel: "<p>",
      x: { kind: "derived", key: "xMean" },
      y: { kind: "derived", key: "pMean" }
    },
    {
      id: "spread-time",
      title: "Wavepacket Spread vs Time",
      xLabel: "t",
      yLabel: "sigma_x",
      x: { kind: "time" },
      y: { kind: "derived", key: "spread" }
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
      title: "Energy Expectation vs Time",
      xLabel: "t",
      yLabel: "<H>",
      x: { kind: "time" },
      y: { kind: "energy" }
    }
  ],
  vizSpec: {
    type: "qho1d"
  }
};

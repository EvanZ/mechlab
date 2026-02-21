import type { OdeSystem } from "../types";

export interface DoubleSlitGridConfig {
  n: number;
  xMin: number;
  xMax: number;
  dx: number;
  m: number;
  hbar: number;
  slitSeparation: number;
  slitWidth: number;
  slitPhase: number;
  slitAmpRatio: number;
  carrierK: number;
  absorberStrength: number;
  absorberFraction: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeGridPoints(value: number): number {
  return clamp(Math.round(finiteOr(value, 200)), 72, 512);
}

function sanitizeBaseParams(p: Record<string, number>): Omit<DoubleSlitGridConfig, "n" | "dx"> {
  const xMin = finiteOr(p.xMin, -14);
  const rawXMax = finiteOr(p.xMax, 14);
  const xMax = rawXMax > xMin + 1e-6 ? rawXMax : xMin + 1;

  return {
    xMin,
    xMax,
    m: Math.max(1e-8, finiteOr(p.m, 1)),
    hbar: Math.max(1e-8, finiteOr(p.hbar, 1)),
    slitSeparation: Math.max(0.1, finiteOr(p.slitSeparation, 3)),
    slitWidth: Math.max(0.05, finiteOr(p.slitWidth, 0.35)),
    slitPhase: finiteOr(p.slitPhase, 0),
    slitAmpRatio: Math.max(0, finiteOr(p.slitAmpRatio, 1)),
    carrierK: finiteOr(p.carrierK, 0),
    absorberStrength: Math.max(0, finiteOr(p.absorberStrength, 0.8)),
    absorberFraction: clamp(finiteOr(p.absorberFraction, 0.12), 0, 0.45)
  };
}

export function doubleSlitGridFromParams(
  p: Record<string, number>,
  stateLength?: number
): DoubleSlitGridConfig {
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

export function doubleSlitXAt(i: number, cfg: DoubleSlitGridConfig): number {
  return cfg.xMin + i * cfg.dx;
}

function splitState(y: number[], cfg: DoubleSlitGridConfig): { re: number[]; im: number[] } {
  if (y.length !== 2 * cfg.n) {
    throw new Error(`Double-slit state length mismatch: expected ${2 * cfg.n}, got ${y.length}.`);
  }

  return {
    re: y.slice(0, cfg.n),
    im: y.slice(cfg.n)
  };
}

function laplacian(arr: number[], i: number, cfg: DoubleSlitGridConfig): number {
  const invDx2 = 1 / (cfg.dx * cfg.dx);
  const center = arr[i];
  const left = i > 0 ? arr[i - 1] : 0;
  const right = i + 1 < cfg.n ? arr[i + 1] : 0;
  return (left - 2 * center + right) * invDx2;
}

function firstDerivative(arr: number[], i: number, cfg: DoubleSlitGridConfig): number {
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

function absorberAtX(
  x: number,
  cfg: Pick<DoubleSlitGridConfig, "xMin" | "xMax" | "absorberFraction" | "absorberStrength">
): number {
  const edgeWidth = cfg.absorberFraction * (cfg.xMax - cfg.xMin);
  if (edgeWidth <= 0 || cfg.absorberStrength <= 0) {
    return 0;
  }

  const d = Math.min(x - cfg.xMin, cfg.xMax - x);
  if (d >= edgeWidth) {
    return 0;
  }

  const ratio = (edgeWidth - d) / edgeWidth;
  return cfg.absorberStrength * ratio * ratio;
}

export function buildDoubleSlitInitialState(p: Record<string, number>): number[] {
  const cfg = doubleSlitGridFromParams(p);
  const re = new Array<number>(cfg.n);
  const im = new Array<number>(cfg.n);

  const leftCenter = -0.5 * cfg.slitSeparation;
  const rightCenter = 0.5 * cfg.slitSeparation;

  let normIntegral = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = doubleSlitXAt(i, cfg);
    const leftEnv = Math.exp(-((x - leftCenter) ** 2) / (4 * cfg.slitWidth * cfg.slitWidth));
    const rightEnv = Math.exp(-((x - rightCenter) ** 2) / (4 * cfg.slitWidth * cfg.slitWidth));

    const carrierCos = Math.cos(cfg.carrierK * x);
    const carrierSin = Math.sin(cfg.carrierK * x);

    const leftRe = leftEnv * carrierCos;
    const leftIm = leftEnv * carrierSin;

    const rightPhaseCos = Math.cos(cfg.slitPhase);
    const rightPhaseSin = Math.sin(cfg.slitPhase);

    const rightBaseRe = rightEnv * carrierCos;
    const rightBaseIm = rightEnv * carrierSin;

    const rightRe = cfg.slitAmpRatio * (rightBaseRe * rightPhaseCos - rightBaseIm * rightPhaseSin);
    const rightIm = cfg.slitAmpRatio * (rightBaseRe * rightPhaseSin + rightBaseIm * rightPhaseCos);

    re[i] = leftRe + rightRe;
    im[i] = leftIm + rightIm;

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

function centerIndex(cfg: DoubleSlitGridConfig): number {
  let bestIndex = 0;
  let bestAbsX = Number.POSITIVE_INFINITY;

  for (let i = 0; i < cfg.n; i += 1) {
    const absX = Math.abs(doubleSlitXAt(i, cfg));
    if (absX < bestAbsX) {
      bestAbsX = absX;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function fringeVisibility(density: number[], cfg: DoubleSlitGridConfig): number {
  const windowHalfWidth = Math.max(1.5, cfg.slitSeparation);
  let maxDensity = 0;
  let minDensity = Number.POSITIVE_INFINITY;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = doubleSlitXAt(i, cfg);
    if (Math.abs(x) > windowHalfWidth) {
      continue;
    }

    const value = density[i];
    maxDensity = Math.max(maxDensity, value);
    minDensity = Math.min(minDensity, value);
  }

  if (!Number.isFinite(minDensity)) {
    minDensity = 0;
  }

  return (maxDensity - minDensity) / Math.max(1e-10, maxDensity + minDensity);
}

export interface DoubleSlitObservables {
  norm: number;
  xMean: number;
  spread: number;
  centerDensity: number;
  visibility: number;
  leftProb: number;
  rightProb: number;
}

export function doubleSlitObservablesFromState(
  y: number[],
  p: Record<string, number>
): DoubleSlitObservables {
  const cfg = doubleSlitGridFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);
  const density = new Array<number>(cfg.n);

  let norm = 0;
  let xMeanNumer = 0;
  let x2MeanNumer = 0;
  let leftProb = 0;
  let rightProb = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = doubleSlitXAt(i, cfg);
    const rho = re[i] * re[i] + im[i] * im[i];
    density[i] = rho;

    const prob = rho * cfg.dx;
    norm += prob;
    xMeanNumer += x * prob;
    x2MeanNumer += x * x * prob;

    if (x < 0) {
      leftProb += prob;
    } else {
      rightProb += prob;
    }
  }

  const normSafe = norm > 1e-12 ? norm : 1;
  const xMean = xMeanNumer / normSafe;
  const x2Mean = x2MeanNumer / normSafe;

  const i0 = centerIndex(cfg);

  return {
    norm,
    xMean,
    spread: Math.sqrt(Math.max(0, x2Mean - xMean * xMean)),
    centerDensity: density[i0],
    visibility: fringeVisibility(density, cfg),
    leftProb: leftProb / normSafe,
    rightProb: rightProb / normSafe
  };
}

function doubleSlitEnergyFromState(y: number[], p: Record<string, number>): number {
  const cfg = doubleSlitGridFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);

  let kinetic = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const dRdx = firstDerivative(re, i, cfg);
    const dIdx = firstDerivative(im, i, cfg);

    kinetic +=
      (cfg.hbar * cfg.hbar / (2 * cfg.m)) *
      (dRdx * dRdx + dIdx * dIdx) *
      cfg.dx;
  }

  return kinetic;
}

const defaultParams = {
  m: 1,
  hbar: 1,
  gridPoints: 200,
  xMin: -14,
  xMax: 14,
  slitSeparation: 3,
  slitWidth: 0.35,
  slitPhase: 0,
  slitAmpRatio: 1,
  carrierK: 0,
  absorberStrength: 0.8,
  absorberFraction: 0.12
};

export const doubleSlitSystem: OdeSystem = {
  id: "doubleslit",
  name: "Double-Slit Interference",
  mode: "ode",
  state: {
    names: [],
    y0: buildDoubleSlitInitialState(defaultParams)
  },
  simulationDefaults: {
    dt: 0.0018,
    duration: 6
  },
  supportedIntegrators: ["rk4"],
  params: { ...defaultParams },
  rhs: (_t, y, p) => {
    const cfg = doubleSlitGridFromParams(p, y.length);
    const { re, im } = splitState(y, cfg);
    const dRe = new Array<number>(cfg.n);
    const dIm = new Array<number>(cfg.n);

    for (let i = 0; i < cfg.n; i += 1) {
      const x = doubleSlitXAt(i, cfg);
      const lapRe = laplacian(re, i, cfg);
      const lapIm = laplacian(im, i, cfg);
      const gamma = absorberAtX(x, cfg);

      dRe[i] = -(cfg.hbar / (2 * cfg.m)) * lapIm - gamma * re[i];
      dIm[i] = +(cfg.hbar / (2 * cfg.m)) * lapRe - gamma * im[i];
    }

    return [...dRe, ...dIm];
  },
  energy: (y, p) => doubleSlitEnergyFromState(y, p),
  derived: (y, p) => {
    const obs = doubleSlitObservablesFromState(y, p);
    return {
      norm: obs.norm,
      xMean: obs.xMean,
      spread: obs.spread,
      centerDensity: obs.centerDensity,
      visibility: obs.visibility,
      leftProb: obs.leftProb,
      rightProb: obs.rightProb
    };
  },
  presets: [
    {
      name: "In-Phase Slits",
      y0: buildDoubleSlitInitialState({
        ...defaultParams,
        slitPhase: 0,
        slitAmpRatio: 1
      }),
      params: {
        slitPhase: 0,
        slitAmpRatio: 1
      }
    },
    {
      name: "Out-of-Phase (pi)",
      y0: buildDoubleSlitInitialState({
        ...defaultParams,
        slitPhase: Math.PI,
        slitAmpRatio: 1
      }),
      params: {
        slitPhase: Math.PI,
        slitAmpRatio: 1
      }
    },
    {
      name: "Uneven Slits",
      y0: buildDoubleSlitInitialState({
        ...defaultParams,
        slitPhase: 0,
        slitAmpRatio: 0.55
      }),
      params: {
        slitPhase: 0,
        slitAmpRatio: 0.55
      }
    },
    {
      name: "Wider Slits",
      y0: buildDoubleSlitInitialState({
        ...defaultParams,
        slitWidth: 0.55,
        slitPhase: 0,
        slitAmpRatio: 1
      }),
      params: {
        slitWidth: 0.55,
        slitPhase: 0,
        slitAmpRatio: 1
      }
    }
  ],
  plotSpec: [
    {
      id: "center-time",
      title: "Center Intensity vs Time",
      xLabel: "t",
      yLabel: "|psi(0,t)|^2",
      x: { kind: "time" },
      y: { kind: "derived", key: "centerDensity" }
    },
    {
      id: "visibility-time",
      title: "Fringe Visibility vs Time",
      xLabel: "t",
      yLabel: "V",
      x: { kind: "time" },
      y: { kind: "derived", key: "visibility" }
    },
    {
      id: "spread-time",
      title: "Pattern Spread vs Time",
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
      title: "Kinetic Energy vs Time",
      xLabel: "t",
      yLabel: "<T>",
      x: { kind: "time" },
      y: { kind: "energy" }
    }
  ],
  vizSpec: {
    type: "doubleslit"
  }
};

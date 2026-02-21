import type { OdeSystem } from "../types";

export interface SchrodingerGridConfig {
  n: number;
  xMin: number;
  xMax: number;
  dx: number;
  m: number;
  barrierCenter: number;
  barrierWidth: number;
  barrierHeight: number;
  absorberStrength: number;
  absorberFraction: number;
  packetX0: number;
  packetSigma: number;
  packetK0: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeBaseParams(p: Record<string, number>): Omit<SchrodingerGridConfig, "n" | "dx"> {
  const xMin = finiteOr(p.xMin, -12);
  const rawXMax = finiteOr(p.xMax, 12);
  const xMax = rawXMax > xMin + 1e-6 ? rawXMax : xMin + 1;

  return {
    xMin,
    xMax,
    m: Math.max(1e-8, finiteOr(p.m, 1)),
    barrierCenter: finiteOr(p.barrierCenter, 0),
    barrierWidth: Math.max(0.05, finiteOr(p.barrierWidth, 0.35)),
    barrierHeight: finiteOr(p.barrierHeight, 4),
    absorberStrength: Math.max(0, finiteOr(p.absorberStrength, 0)),
    absorberFraction: clamp(finiteOr(p.absorberFraction, 0.14), 0, 0.45),
    packetX0: finiteOr(p.packetX0, -5),
    packetSigma: Math.max(0.05, finiteOr(p.packetSigma, 0.8)),
    packetK0: finiteOr(p.packetK0, 3)
  };
}

function sanitizeGridPoints(value: number): number {
  return clamp(Math.round(finiteOr(value, 128)), 48, 384);
}

export function schrodingerGridFromParams(
  p: Record<string, number>,
  stateLength?: number
): SchrodingerGridConfig {
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

export function schrodingerXAt(i: number, cfg: SchrodingerGridConfig): number {
  return cfg.xMin + i * cfg.dx;
}

export function schrodingerBarrierPotentialAtX(
  x: number,
  cfg: Pick<SchrodingerGridConfig, "barrierCenter" | "barrierWidth" | "barrierHeight">
): number {
  const z = (x - cfg.barrierCenter) / cfg.barrierWidth;
  return cfg.barrierHeight * Math.exp(-0.5 * z * z);
}

export function schrodingerAbsorberAtX(
  x: number,
  cfg: Pick<SchrodingerGridConfig, "xMin" | "xMax" | "absorberFraction" | "absorberStrength">
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

export function buildSchrodingerInitialState(p: Record<string, number>): number[] {
  const cfg = schrodingerGridFromParams(p);
  const re = new Array<number>(cfg.n);
  const im = new Array<number>(cfg.n);
  let normIntegral = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = schrodingerXAt(i, cfg);
    const envelope = Math.exp(-((x - cfg.packetX0) ** 2) / (4 * cfg.packetSigma * cfg.packetSigma));
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

function splitState(y: number[], cfg: SchrodingerGridConfig): { re: number[]; im: number[] } {
  if (y.length !== 2 * cfg.n) {
    throw new Error(`Schrodinger state length mismatch: expected ${2 * cfg.n}, got ${y.length}.`);
  }

  return {
    re: y.slice(0, cfg.n),
    im: y.slice(cfg.n)
  };
}

function laplacian(arr: number[], i: number, cfg: SchrodingerGridConfig): number {
  const invDx2 = 1 / (cfg.dx * cfg.dx);
  const center = arr[i];
  const left = i > 0 ? arr[i - 1] : 0;
  const right = i + 1 < cfg.n ? arr[i + 1] : 0;
  return (left - 2 * center + right) * invDx2;
}

function firstDerivative(arr: number[], i: number, cfg: SchrodingerGridConfig): number {
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

export interface SchrodingerObservables {
  norm: number;
  xMean: number;
  spread: number;
  reflection: number;
  transmission: number;
  peakDensity: number;
}

export function schrodingerObservablesFromState(
  y: number[],
  p: Record<string, number>
): SchrodingerObservables {
  const cfg = schrodingerGridFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);

  let norm = 0;
  let xMeanNumer = 0;
  let x2MeanNumer = 0;
  let reflection = 0;
  let transmission = 0;
  let peakDensity = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = schrodingerXAt(i, cfg);
    const density = re[i] * re[i] + im[i] * im[i];
    const prob = density * cfg.dx;

    norm += prob;
    xMeanNumer += x * prob;
    x2MeanNumer += x * x * prob;
    peakDensity = Math.max(peakDensity, density);

    if (x < cfg.barrierCenter) {
      reflection += prob;
    } else {
      transmission += prob;
    }
  }

  const normSafe = norm > 1e-12 ? norm : 1;
  const xMean = xMeanNumer / normSafe;
  const x2Mean = x2MeanNumer / normSafe;
  const spread = Math.sqrt(Math.max(0, x2Mean - xMean * xMean));

  return {
    norm,
    xMean,
    spread,
    reflection: reflection / normSafe,
    transmission: transmission / normSafe,
    peakDensity
  };
}

function schrodingerEnergyFromState(y: number[], p: Record<string, number>): number {
  const cfg = schrodingerGridFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);

  let kinetic = 0;
  let potential = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = schrodingerXAt(i, cfg);
    const dRdx = firstDerivative(re, i, cfg);
    const dIdx = firstDerivative(im, i, cfg);
    const density = re[i] * re[i] + im[i] * im[i];
    const v = schrodingerBarrierPotentialAtX(x, cfg);

    kinetic += 0.5 * (dRdx * dRdx + dIdx * dIdx) * cfg.dx / cfg.m;
    potential += v * density * cfg.dx;
  }

  return kinetic + potential;
}

export const schrodinger1dSystem: OdeSystem = {
  id: "schrodinger1d",
  name: "1D Schrodinger Wavepacket",
  mode: "ode",
  state: {
    names: [],
    y0: buildSchrodingerInitialState({
      m: 1,
      gridPoints: 128,
      xMin: -12,
      xMax: 12,
      packetX0: -5,
      packetSigma: 0.8,
      packetK0: 3,
      barrierCenter: 0,
      barrierWidth: 0.35,
      barrierHeight: 4,
      absorberStrength: 1.2,
      absorberFraction: 0.14
    })
  },
  simulationDefaults: {
    dt: 0.0025,
    duration: 5
  },
  supportedIntegrators: ["rk4"],
  params: {
    m: 1,
    gridPoints: 128,
    xMin: -12,
    xMax: 12,
    packetX0: -5,
    packetSigma: 0.8,
    packetK0: 3,
    barrierCenter: 0,
    barrierWidth: 0.35,
    barrierHeight: 4,
    absorberStrength: 1.2,
    absorberFraction: 0.14
  },
  rhs: (_t, y, p) => {
    const cfg = schrodingerGridFromParams(p, y.length);
    const { re, im } = splitState(y, cfg);
    const dRe = new Array<number>(cfg.n);
    const dIm = new Array<number>(cfg.n);

    for (let i = 0; i < cfg.n; i += 1) {
      const x = schrodingerXAt(i, cfg);
      const v = schrodingerBarrierPotentialAtX(x, cfg);
      const gamma = schrodingerAbsorberAtX(x, cfg);
      const lapRe = laplacian(re, i, cfg);
      const lapIm = laplacian(im, i, cfg);

      dRe[i] = -(0.5 / cfg.m) * lapIm + v * im[i] - gamma * re[i];
      dIm[i] = +(0.5 / cfg.m) * lapRe - v * re[i] - gamma * im[i];
    }

    return [...dRe, ...dIm];
  },
  energy: (y, p) => schrodingerEnergyFromState(y, p),
  derived: (y, p) => {
    const cfg = schrodingerGridFromParams(p, y.length);
    const obs = schrodingerObservablesFromState(y, p);
    const qL = cfg.barrierCenter - 0.5 * cfg.barrierWidth;
    const qR = cfg.barrierCenter + 0.5 * cfg.barrierWidth;

    return {
      norm: obs.norm,
      xMean: obs.xMean,
      spread: obs.spread,
      reflection: obs.reflection,
      transmission: obs.transmission,
      peakDensity: obs.peakDensity,
      barrierLeft: qL,
      barrierRight: qR
    };
  },
  presets: [
    {
      name: "Barrier Scattering",
      y0: buildSchrodingerInitialState({
        m: 1,
        gridPoints: 128,
        xMin: -12,
        xMax: 12,
        packetX0: -5,
        packetSigma: 0.8,
        packetK0: 3,
        barrierCenter: 0,
        barrierWidth: 0.35,
        barrierHeight: 4,
        absorberStrength: 1.2,
        absorberFraction: 0.14
      })
    },
    {
      name: "Mostly Transmission",
      y0: buildSchrodingerInitialState({
        m: 1,
        gridPoints: 128,
        xMin: -12,
        xMax: 12,
        packetX0: -5,
        packetSigma: 0.8,
        packetK0: 3,
        barrierCenter: 0,
        barrierWidth: 0.35,
        barrierHeight: 1.6,
        absorberStrength: 1.2,
        absorberFraction: 0.14
      }),
      params: {
        barrierHeight: 1.6
      }
    },
    {
      name: "High Reflection",
      y0: buildSchrodingerInitialState({
        m: 1,
        gridPoints: 128,
        xMin: -12,
        xMax: 12,
        packetX0: -5,
        packetSigma: 0.8,
        packetK0: 3,
        barrierCenter: 0,
        barrierWidth: 0.35,
        barrierHeight: 8,
        absorberStrength: 1.2,
        absorberFraction: 0.14
      }),
      params: {
        barrierHeight: 8
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
      id: "spread-time",
      title: "Packet Spread vs Time",
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
      id: "reflection-time",
      title: "Reflection Probability vs Time",
      xLabel: "t",
      yLabel: "R",
      x: { kind: "time" },
      y: { kind: "derived", key: "reflection" }
    },
    {
      id: "transmission-time",
      title: "Transmission Probability vs Time",
      xLabel: "t",
      yLabel: "T",
      x: { kind: "time" },
      y: { kind: "derived", key: "transmission" }
    }
  ],
  vizSpec: {
    type: "schrodinger1d"
  }
};

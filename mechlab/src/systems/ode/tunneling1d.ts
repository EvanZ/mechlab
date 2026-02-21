import type { OdeSystem } from "../types";

export interface TunnelingGridConfig {
  n: number;
  xMin: number;
  xMax: number;
  dx: number;
  m: number;
  hbar: number;
  packetX0: number;
  packetSigma: number;
  packetK0: number;
  barrierHeight: number;
  barrierWidth: number;
  wellWidth: number;
  doubleBarrier: number;
  absorberStrength: number;
  absorberFraction: number;
  scanEmin: number;
  scanEmax: number;
  scanPoints: number;
}

interface BarrierGeometry {
  segments: Array<{ x0: number; x1: number }>;
  threshold: number;
}

interface Complex {
  re: number;
  im: number;
}

type ComplexMat2 = [[Complex, Complex], [Complex, Complex]];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeGridPoints(value: number): number {
  return clamp(Math.round(finiteOr(value, 160)), 64, 420);
}

function sanitizeBaseParams(p: Record<string, number>): Omit<TunnelingGridConfig, "n" | "dx"> {
  const xMin = finiteOr(p.xMin, -14);
  const rawXMax = finiteOr(p.xMax, 14);
  const xMax = rawXMax > xMin + 1e-6 ? rawXMax : xMin + 1;

  const scanEmin = Math.max(1e-6, finiteOr(p.scanEmin, 0.1));
  const rawScanEmax = Math.max(scanEmin + 1e-6, finiteOr(p.scanEmax, 8));

  return {
    xMin,
    xMax,
    m: Math.max(1e-8, finiteOr(p.m, 1)),
    hbar: Math.max(1e-8, finiteOr(p.hbar, 1)),
    packetX0: finiteOr(p.packetX0, -7),
    packetSigma: Math.max(0.05, finiteOr(p.packetSigma, 0.85)),
    packetK0: finiteOr(p.packetK0, 3),
    barrierHeight: Math.max(0, finiteOr(p.barrierHeight, 6)),
    barrierWidth: Math.max(0.05, finiteOr(p.barrierWidth, 0.7)),
    wellWidth: Math.max(0.05, finiteOr(p.wellWidth, 2.3)),
    doubleBarrier: clamp(finiteOr(p.doubleBarrier, 1), 0, 1),
    absorberStrength: Math.max(0, finiteOr(p.absorberStrength, 1.2)),
    absorberFraction: clamp(finiteOr(p.absorberFraction, 0.12), 0, 0.45),
    scanEmin,
    scanEmax: rawScanEmax,
    scanPoints: clamp(Math.round(finiteOr(p.scanPoints, 140)), 40, 500)
  };
}

export function tunnelingGridFromParams(
  p: Record<string, number>,
  stateLength?: number
): TunnelingGridConfig {
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

export function tunnelingXAt(i: number, cfg: TunnelingGridConfig): number {
  return cfg.xMin + i * cfg.dx;
}

function tunnelingBarrierGeometry(
  cfg: Pick<TunnelingGridConfig, "barrierWidth" | "wellWidth" | "doubleBarrier">
): BarrierGeometry {
  if (cfg.doubleBarrier >= 0.5) {
    const leftInner = -0.5 * cfg.wellWidth;
    const rightInner = 0.5 * cfg.wellWidth;

    return {
      segments: [
        {
          x0: leftInner - cfg.barrierWidth,
          x1: leftInner
        },
        {
          x0: rightInner,
          x1: rightInner + cfg.barrierWidth
        }
      ],
      threshold: rightInner + cfg.barrierWidth
    };
  }

  return {
    segments: [
      {
        x0: -0.5 * cfg.barrierWidth,
        x1: 0.5 * cfg.barrierWidth
      }
    ],
    threshold: 0.5 * cfg.barrierWidth
  };
}

export function tunnelingPotentialAtX(
  x: number,
  cfg: Pick<TunnelingGridConfig, "barrierHeight" | "barrierWidth" | "wellWidth" | "doubleBarrier">
): number {
  const geometry = tunnelingBarrierGeometry(cfg);

  for (let i = 0; i < geometry.segments.length; i += 1) {
    const segment = geometry.segments[i];
    if (x >= segment.x0 && x <= segment.x1) {
      return cfg.barrierHeight;
    }
  }

  return 0;
}

export function tunnelingAbsorberAtX(
  x: number,
  cfg: Pick<TunnelingGridConfig, "xMin" | "xMax" | "absorberFraction" | "absorberStrength">
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

function splitState(y: number[], cfg: TunnelingGridConfig): { re: number[]; im: number[] } {
  const expectedLength = 2 * cfg.n;
  if (y.length !== expectedLength) {
    throw new Error(`Tunneling state length mismatch: expected ${expectedLength}, got ${y.length}.`);
  }

  return {
    re: y.slice(0, cfg.n),
    im: y.slice(cfg.n)
  };
}

function laplacian(arr: number[], i: number, cfg: TunnelingGridConfig): number {
  const invDx2 = 1 / (cfg.dx * cfg.dx);
  const center = arr[i];
  const left = i > 0 ? arr[i - 1] : 0;
  const right = i + 1 < cfg.n ? arr[i + 1] : 0;
  return (left - 2 * center + right) * invDx2;
}

function firstDerivative(arr: number[], i: number, cfg: TunnelingGridConfig): number {
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

export function buildTunnelingInitialState(p: Record<string, number>): number[] {
  const cfg = tunnelingGridFromParams(p);
  const re = new Array<number>(cfg.n);
  const im = new Array<number>(cfg.n);

  let normIntegral = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = tunnelingXAt(i, cfg);
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

export interface TunnelingObservables {
  norm: number;
  xMean: number;
  spread: number;
  transmission: number;
  reflection: number;
  barrierOccupancy: number;
  centerDensity: number;
}

export function tunnelingObservablesFromState(
  y: number[],
  p: Record<string, number>
): TunnelingObservables {
  const cfg = tunnelingGridFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);
  const geometry = tunnelingBarrierGeometry(cfg);

  const threshold = geometry.threshold;
  const leftBound = -threshold;
  const rightBound = threshold;

  let norm = 0;
  let xMeanNumer = 0;
  let x2MeanNumer = 0;
  let reflection = 0;
  let transmission = 0;
  let barrierOccupancy = 0;

  let centerIndex = 0;
  let centerDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = tunnelingXAt(i, cfg);
    const density = re[i] * re[i] + im[i] * im[i];
    const prob = density * cfg.dx;

    norm += prob;
    xMeanNumer += x * prob;
    x2MeanNumer += x * x * prob;

    if (x < leftBound) {
      reflection += prob;
    } else if (x > rightBound) {
      transmission += prob;
    } else {
      barrierOccupancy += prob;
    }

    const d = Math.abs(x);
    if (d < centerDistance) {
      centerDistance = d;
      centerIndex = i;
    }
  }

  const normSafe = norm > 1e-12 ? norm : 1;
  const xMean = xMeanNumer / normSafe;
  const x2Mean = x2MeanNumer / normSafe;
  const centerDensity = re[centerIndex] * re[centerIndex] + im[centerIndex] * im[centerIndex];

  return {
    norm,
    xMean,
    spread: Math.sqrt(Math.max(0, x2Mean - xMean * xMean)),
    transmission: transmission / normSafe,
    reflection: reflection / normSafe,
    barrierOccupancy: barrierOccupancy / normSafe,
    centerDensity
  };
}

function tunnelingEnergyFromState(y: number[], p: Record<string, number>): number {
  const cfg = tunnelingGridFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);

  let kinetic = 0;
  let potential = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const x = tunnelingXAt(i, cfg);
    const dRdx = firstDerivative(re, i, cfg);
    const dIdx = firstDerivative(im, i, cfg);
    const density = re[i] * re[i] + im[i] * im[i];
    const v = tunnelingPotentialAtX(x, cfg);

    kinetic += (cfg.hbar * cfg.hbar / (2 * cfg.m)) * (dRdx * dRdx + dIdx * dIdx) * cfg.dx;
    potential += v * density * cfg.dx;
  }

  return kinetic + potential;
}

function packetKineticEnergy(cfg: Pick<TunnelingGridConfig, "hbar" | "m" | "packetK0">): number {
  return (cfg.hbar * cfg.hbar * cfg.packetK0 * cfg.packetK0) / (2 * cfg.m);
}

function c(re = 0, im = 0): Complex {
  return { re, im };
}

function cAdd(a: Complex, b: Complex): Complex {
  return c(a.re + b.re, a.im + b.im);
}

function cSub(a: Complex, b: Complex): Complex {
  return c(a.re - b.re, a.im - b.im);
}

function cMul(a: Complex, b: Complex): Complex {
  return c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}

function cDiv(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im;
  if (denom <= 1e-20) {
    return c(0, 0);
  }

  return c((a.re * b.re + a.im * b.im) / denom, (a.im * b.re - a.re * b.im) / denom);
}

function cAbs2(a: Complex): number {
  return a.re * a.re + a.im * a.im;
}

function cScale(a: Complex, s: number): Complex {
  return c(a.re * s, a.im * s);
}

function cExp(z: Complex): Complex {
  const er = Math.exp(z.re);
  return c(er * Math.cos(z.im), er * Math.sin(z.im));
}

function cSqrtRealOrImag(value: number): Complex {
  if (value >= 0) {
    return c(Math.sqrt(value), 0);
  }

  return c(0, Math.sqrt(-value));
}

function identityMat2(): ComplexMat2 {
  return [
    [c(1, 0), c(0, 0)],
    [c(0, 0), c(1, 0)]
  ];
}

function matMul(a: ComplexMat2, b: ComplexMat2): ComplexMat2 {
  return [
    [
      cAdd(cMul(a[0][0], b[0][0]), cMul(a[0][1], b[1][0])),
      cAdd(cMul(a[0][0], b[0][1]), cMul(a[0][1], b[1][1]))
    ],
    [
      cAdd(cMul(a[1][0], b[0][0]), cMul(a[1][1], b[1][0])),
      cAdd(cMul(a[1][0], b[0][1]), cMul(a[1][1], b[1][1]))
    ]
  ];
}

function interfaceMatrix(kA: Complex, kB: Complex): ComplexMat2 {
  const ratio = cDiv(kB, kA);
  const one = c(1, 0);
  const a = cScale(cAdd(one, ratio), 0.5);
  const b = cScale(cSub(one, ratio), 0.5);
  return [
    [a, b],
    [b, a]
  ];
}

function propagationMatrix(k: Complex, width: number): ComplexMat2 {
  const phasePos = c(-k.im * width, k.re * width);
  const phaseNeg = c(+k.im * width, -k.re * width);

  return [
    [cExp(phasePos), c(0, 0)],
    [c(0, 0), cExp(phaseNeg)]
  ];
}

function kFromEnergy(E: number, V: number, m: number, hbar: number): Complex {
  const value = (2 * m * (E - V)) / (hbar * hbar);
  return cSqrtRealOrImag(value);
}

export function tunnelingTransmissionForEnergy(E: number, p: Record<string, number>): number {
  const cfg = tunnelingGridFromParams(p);
  if (!(E > 0)) {
    return 0;
  }

  const kLead = kFromEnergy(E, 0, cfg.m, cfg.hbar);
  if (cAbs2(kLead) <= 1e-16) {
    return 0;
  }

  const layerWidths = cfg.doubleBarrier >= 0.5 ? [cfg.barrierWidth, cfg.wellWidth, cfg.barrierWidth] : [cfg.barrierWidth];
  const layerPotentials =
    cfg.doubleBarrier >= 0.5 ? [cfg.barrierHeight, 0, cfg.barrierHeight] : [cfg.barrierHeight];

  let M = identityMat2();
  let kPrev = kLead;

  for (let i = 0; i < layerWidths.length; i += 1) {
    const kLayer = kFromEnergy(E, layerPotentials[i], cfg.m, cfg.hbar);

    M = matMul(M, interfaceMatrix(kPrev, kLayer));
    M = matMul(M, propagationMatrix(kLayer, layerWidths[i]));

    kPrev = kLayer;
  }

  M = matMul(M, interfaceMatrix(kPrev, kLead));

  const t = cDiv(c(1, 0), M[0][0]);
  const transmission = cAbs2(t);

  return clamp(transmission, 0, 1.2);
}

export function computeTunnelingScan(
  p: Record<string, number>
): { energy: number[]; transmission: number[] } {
  const cfg = tunnelingGridFromParams(p);

  const n = cfg.scanPoints;
  const energy: number[] = new Array(n);
  const transmission: number[] = new Array(n);

  for (let i = 0; i < n; i += 1) {
    const r = i / Math.max(1, n - 1);
    const E = cfg.scanEmin + r * (cfg.scanEmax - cfg.scanEmin);
    energy[i] = E;
    transmission[i] = tunnelingTransmissionForEnergy(E, p);
  }

  return { energy, transmission };
}

const defaultParams = {
  m: 1,
  hbar: 1,
  gridPoints: 176,
  xMin: -16,
  xMax: 16,
  packetX0: -8,
  packetSigma: 1.15,
  packetK0: 3.32,
  barrierHeight: 8,
  barrierWidth: 0.9,
  wellWidth: 3.2,
  doubleBarrier: 1,
  absorberStrength: 1.4,
  absorberFraction: 0.12,
  scanEmin: 0.08,
  scanEmax: 7.2,
  scanPoints: 220
};

export const tunneling1dSystem: OdeSystem = {
  id: "tunneling1d",
  name: "Quantum Tunneling (Resonant 1D)",
  mode: "ode",
  state: {
    names: [],
    y0: buildTunnelingInitialState(defaultParams)
  },
  simulationDefaults: {
    dt: 0.0018,
    duration: 8.5
  },
  supportedIntegrators: ["rk4"],
  params: { ...defaultParams },
  rhs: (_t, y, p) => {
    const cfg = tunnelingGridFromParams(p, y.length);
    const { re, im } = splitState(y, cfg);

    const dRe = new Array<number>(cfg.n);
    const dIm = new Array<number>(cfg.n);

    for (let i = 0; i < cfg.n; i += 1) {
      const x = tunnelingXAt(i, cfg);
      const v = tunnelingPotentialAtX(x, cfg);
      const gamma = tunnelingAbsorberAtX(x, cfg);
      const lapRe = laplacian(re, i, cfg);
      const lapIm = laplacian(im, i, cfg);

      dRe[i] = -(cfg.hbar / (2 * cfg.m)) * lapIm + (v / cfg.hbar) * im[i] - gamma * re[i];
      dIm[i] = +(cfg.hbar / (2 * cfg.m)) * lapRe - (v / cfg.hbar) * re[i] - gamma * im[i];
    }

    return [...dRe, ...dIm];
  },
  energy: (y, p) => tunnelingEnergyFromState(y, p),
  derived: (y, p) => {
    const obs = tunnelingObservablesFromState(y, p);
    const cfg = tunnelingGridFromParams(p, y.length);
    const geometry = tunnelingBarrierGeometry(cfg);

    return {
      norm: obs.norm,
      xMean: obs.xMean,
      spread: obs.spread,
      transmission: obs.transmission,
      reflection: obs.reflection,
      barrierOccupancy: obs.barrierOccupancy,
      centerDensity: obs.centerDensity,
      packetEnergy: packetKineticEnergy(cfg),
      barrierThreshold: geometry.threshold
    };
  },
  presets: [
    {
      name: "Strong Resonant Cavity",
      y0: buildTunnelingInitialState({
        ...defaultParams,
        doubleBarrier: 1,
        barrierHeight: 8,
        barrierWidth: 0.9,
        wellWidth: 3.2,
        packetK0: 3.32,
        packetSigma: 1.15,
        scanEmin: 0.08,
        scanEmax: 7.2
      }),
      params: {
        doubleBarrier: 1,
        barrierHeight: 8,
        barrierWidth: 0.9,
        wellWidth: 3.2,
        packetK0: 3.32,
        packetSigma: 1.15,
        scanEmin: 0.08,
        scanEmax: 7.2
      }
    },
    {
      name: "Single Barrier Control",
      y0: buildTunnelingInitialState({
        ...defaultParams,
        doubleBarrier: 0,
        barrierHeight: 8,
        barrierWidth: 1.1,
        packetK0: 3.32,
        packetSigma: 1.15
      }),
      params: {
        doubleBarrier: 0,
        barrierHeight: 8,
        barrierWidth: 1.1,
        packetK0: 3.32,
        packetSigma: 1.15
      }
    },
    {
      name: "Near Resonance Energy",
      y0: buildTunnelingInitialState({
        ...defaultParams,
        packetK0: 3.32,
        packetSigma: 1.2
      }),
      params: {
        doubleBarrier: 1,
        barrierHeight: 8,
        barrierWidth: 0.9,
        wellWidth: 3.2,
        packetK0: 3.32,
        packetSigma: 1.2
      }
    },
    {
      name: "Off-Resonance",
      y0: buildTunnelingInitialState({
        ...defaultParams,
        packetK0: 2.65,
        packetSigma: 1.15
      }),
      params: {
        doubleBarrier: 1,
        barrierHeight: 8,
        barrierWidth: 0.9,
        wellWidth: 3.2,
        packetK0: 2.65,
        packetSigma: 1.15
      }
    },
    {
      name: "Deep Sub-Barrier",
      y0: buildTunnelingInitialState({
        ...defaultParams,
        packetK0: 1.6,
        packetSigma: 1.05
      }),
      params: {
        doubleBarrier: 1,
        barrierHeight: 8,
        barrierWidth: 0.9,
        wellWidth: 3.2,
        packetK0: 1.6,
        packetSigma: 1.05
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
      id: "transmission-time",
      title: "Transmission Region Probability",
      xLabel: "t",
      yLabel: "P_trans",
      x: { kind: "time" },
      y: { kind: "derived", key: "transmission" }
    },
    {
      id: "reflection-time",
      title: "Reflection Region Probability",
      xLabel: "t",
      yLabel: "P_refl",
      x: { kind: "time" },
      y: { kind: "derived", key: "reflection" }
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
    type: "tunneling1d"
  }
};

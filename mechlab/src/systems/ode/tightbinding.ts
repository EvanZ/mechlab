import type { OdeSystem } from "../types";

export interface TightBindingConfig {
  n: number;
  hop: number;
  hbar: number;
  epsilon0: number;
  disorderW: number;
  disorderSeed: number;
  periodic: number;
  impuritySite: number;
  impurityStrength: number;
  packetCenter: number;
  packetWidth: number;
  packetK: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeSites(value: number): number {
  return clamp(Math.round(finiteOr(value, 96)), 16, 320);
}

function sanitizeBaseParams(p: Record<string, number>): Omit<TightBindingConfig, "n"> {
  return {
    hop: Math.max(1e-8, finiteOr(p.hop, 1)),
    hbar: Math.max(1e-8, finiteOr(p.hbar, 1)),
    epsilon0: finiteOr(p.epsilon0, 0),
    disorderW: Math.max(0, finiteOr(p.disorderW, 0)),
    disorderSeed: finiteOr(p.disorderSeed, 1),
    periodic: clamp(finiteOr(p.periodic, 0), 0, 1),
    impuritySite: finiteOr(p.impuritySite, -1),
    impurityStrength: finiteOr(p.impurityStrength, 0),
    packetCenter: finiteOr(p.packetCenter, 18),
    packetWidth: Math.max(0.15, finiteOr(p.packetWidth, 3)),
    packetK: finiteOr(p.packetK, 1)
  };
}

export function tightBindingFromParams(
  p: Record<string, number>,
  stateLength?: number
): TightBindingConfig {
  const base = sanitizeBaseParams(p);
  const nFromState = stateLength && stateLength % 2 === 0 ? stateLength / 2 : NaN;
  const n = Number.isInteger(nFromState) && nFromState >= 3 ? nFromState : sanitizeSites(p.sites);

  return {
    ...base,
    n
  };
}

function seededRandom(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 1;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function sanitizeImpuritySite(rawSite: number, n: number): number {
  if (!Number.isFinite(rawSite)) {
    return -1;
  }

  const rounded = Math.round(rawSite);
  if (rounded < 0 || rounded >= n) {
    return -1;
  }

  return rounded;
}

export function tightBindingOnsiteArray(p: Record<string, number>, stateLength?: number): number[] {
  const cfg = tightBindingFromParams(p, stateLength);
  const rand = seededRandom(cfg.disorderSeed);
  const onsite = new Array<number>(cfg.n);

  for (let i = 0; i < cfg.n; i += 1) {
    const disorder = (rand() - 0.5) * cfg.disorderW;
    onsite[i] = cfg.epsilon0 + disorder;
  }

  const impuritySite = sanitizeImpuritySite(cfg.impuritySite, cfg.n);
  if (impuritySite >= 0) {
    onsite[impuritySite] += cfg.impurityStrength;
  }

  return onsite;
}

function splitState(y: number[], cfg: TightBindingConfig): { re: number[]; im: number[] } {
  const expectedLength = 2 * cfg.n;
  if (y.length !== expectedLength) {
    throw new Error(`Tight-binding state length mismatch: expected ${expectedLength}, got ${y.length}.`);
  }

  return {
    re: y.slice(0, cfg.n),
    im: y.slice(cfg.n)
  };
}

function neighbor(arr: number[], index: number, delta: number, cfg: TightBindingConfig): number {
  const n = cfg.n;
  const next = index + delta;

  if (cfg.periodic >= 0.5) {
    const wrapped = ((next % n) + n) % n;
    return arr[wrapped];
  }

  if (next < 0 || next >= n) {
    return 0;
  }

  return arr[next];
}

export function buildTightBindingInitialState(p: Record<string, number>): number[] {
  const cfg = tightBindingFromParams(p);
  const re = new Array<number>(cfg.n);
  const im = new Array<number>(cfg.n);

  let norm = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const z = (i - cfg.packetCenter) / cfg.packetWidth;
    const envelope = Math.exp(-0.5 * z * z);
    const phase = cfg.packetK * (i - cfg.packetCenter);

    re[i] = envelope * Math.cos(phase);
    im[i] = envelope * Math.sin(phase);

    norm += re[i] * re[i] + im[i] * im[i];
  }

  const scale = norm > 0 ? 1 / Math.sqrt(norm) : 1;
  const y = new Array<number>(2 * cfg.n);

  for (let i = 0; i < cfg.n; i += 1) {
    y[i] = re[i] * scale;
    y[cfg.n + i] = im[i] * scale;
  }

  return y;
}

export interface TightBindingObservables {
  norm: number;
  meanSite: number;
  spread: number;
  ipr: number;
  leftProb: number;
  rightProb: number;
  centerProb: number;
}

export function tightBindingObservablesFromState(
  y: number[],
  p: Record<string, number>
): TightBindingObservables {
  const cfg = tightBindingFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);

  const mid = Math.floor(cfg.n / 2);
  let centerIndex = 0;
  let centerDistance = Number.POSITIVE_INFINITY;

  let norm = 0;
  let meanNumer = 0;
  let secondMomentNumer = 0;
  let iprNumer = 0;
  let leftProb = 0;
  let rightProb = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const pI = re[i] * re[i] + im[i] * im[i];
    norm += pI;
    meanNumer += i * pI;
    secondMomentNumer += i * i * pI;
    iprNumer += pI * pI;

    if (i < mid) {
      leftProb += pI;
    } else {
      rightProb += pI;
    }

    const d = Math.abs(i - (cfg.n - 1) / 2);
    if (d < centerDistance) {
      centerDistance = d;
      centerIndex = i;
    }
  }

  const normSafe = norm > 1e-12 ? norm : 1;
  const meanSite = meanNumer / normSafe;
  const secondMoment = secondMomentNumer / normSafe;

  return {
    norm,
    meanSite,
    spread: Math.sqrt(Math.max(0, secondMoment - meanSite * meanSite)),
    ipr: iprNumer / (normSafe * normSafe),
    leftProb: leftProb / normSafe,
    rightProb: rightProb / normSafe,
    centerProb: (re[centerIndex] * re[centerIndex] + im[centerIndex] * im[centerIndex]) / normSafe
  };
}

export function tightBindingEnergyFromState(y: number[], p: Record<string, number>): number {
  const cfg = tightBindingFromParams(p, y.length);
  const onsite = tightBindingOnsiteArray(p, y.length);
  const { re, im } = splitState(y, cfg);

  let onsiteEnergy = 0;
  let couplingEnergy = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const pI = re[i] * re[i] + im[i] * im[i];
    onsiteEnergy += onsite[i] * pI;
  }

  for (let i = 0; i < cfg.n - 1; i += 1) {
    const rePair = re[i] * re[i + 1] + im[i] * im[i + 1];
    couplingEnergy += -2 * cfg.hop * rePair;
  }

  if (cfg.periodic >= 0.5 && cfg.n > 1) {
    const last = cfg.n - 1;
    const rePair = re[last] * re[0] + im[last] * im[0];
    couplingEnergy += -2 * cfg.hop * rePair;
  }

  return onsiteEnergy + couplingEnergy;
}

const defaultParams = {
  sites: 96,
  hop: 1,
  hbar: 1,
  epsilon0: 0,
  disorderW: 0,
  disorderSeed: 2,
  periodic: 0,
  impuritySite: -1,
  impurityStrength: 0,
  packetCenter: 18,
  packetWidth: 3,
  packetK: 1
};

export const tightBindingSystem: OdeSystem = {
  id: "tightbinding",
  name: "Tight-Binding Chain Transport",
  mode: "ode",
  state: {
    names: [],
    y0: buildTightBindingInitialState(defaultParams)
  },
  simulationDefaults: {
    dt: 0.02,
    duration: 36
  },
  supportedIntegrators: ["rk4"],
  params: { ...defaultParams },
  rhs: (_t, y, p) => {
    const cfg = tightBindingFromParams(p, y.length);
    const onsite = tightBindingOnsiteArray(p, y.length);
    const { re, im } = splitState(y, cfg);

    const dRe = new Array<number>(cfg.n);
    const dIm = new Array<number>(cfg.n);

    for (let i = 0; i < cfg.n; i += 1) {
      const reL = neighbor(re, i, -1, cfg);
      const reR = neighbor(re, i, +1, cfg);
      const imL = neighbor(im, i, -1, cfg);
      const imR = neighbor(im, i, +1, cfg);

      const a = onsite[i] * re[i] - cfg.hop * (reL + reR);
      const b = onsite[i] * im[i] - cfg.hop * (imL + imR);

      dRe[i] = b / cfg.hbar;
      dIm[i] = -a / cfg.hbar;
    }

    return [...dRe, ...dIm];
  },
  energy: (y, p) => tightBindingEnergyFromState(y, p),
  derived: (y, p) => {
    const obs = tightBindingObservablesFromState(y, p);

    return {
      norm: obs.norm,
      meanSite: obs.meanSite,
      spread: obs.spread,
      ipr: obs.ipr,
      leftProb: obs.leftProb,
      rightProb: obs.rightProb,
      centerProb: obs.centerProb
    };
  },
  presets: [
    {
      name: "Ballistic Clean Chain",
      y0: buildTightBindingInitialState({
        ...defaultParams,
        disorderW: 0,
        periodic: 0,
        packetCenter: 18,
        packetWidth: 3,
        packetK: 1.05
      }),
      params: {
        disorderW: 0,
        periodic: 0,
        packetCenter: 18,
        packetWidth: 3,
        packetK: 1.05
      }
    },
    {
      name: "Weak Disorder Scattering",
      y0: buildTightBindingInitialState({
        ...defaultParams,
        disorderW: 1.1,
        disorderSeed: 7,
        periodic: 0,
        packetCenter: 18,
        packetWidth: 3,
        packetK: 1.05
      }),
      params: {
        disorderW: 1.1,
        disorderSeed: 7,
        periodic: 0,
        packetCenter: 18,
        packetWidth: 3,
        packetK: 1.05
      }
    },
    {
      name: "Anderson Localization",
      y0: buildTightBindingInitialState({
        ...defaultParams,
        disorderW: 4.2,
        disorderSeed: 11,
        periodic: 0,
        packetCenter: 46,
        packetWidth: 2.5,
        packetK: 0.9
      }),
      params: {
        disorderW: 4.2,
        disorderSeed: 11,
        periodic: 0,
        packetCenter: 46,
        packetWidth: 2.5,
        packetK: 0.9
      }
    },
    {
      name: "Ring Circulation",
      y0: buildTightBindingInitialState({
        ...defaultParams,
        disorderW: 0,
        periodic: 1,
        packetCenter: 20,
        packetWidth: 3,
        packetK: 1.25
      }),
      params: {
        disorderW: 0,
        periodic: 1,
        packetCenter: 20,
        packetWidth: 3,
        packetK: 1.25
      }
    }
  ],
  plotSpec: [
    {
      id: "mean-time",
      title: "Mean Site <n> vs Time",
      xLabel: "t",
      yLabel: "<n>",
      x: { kind: "time" },
      y: { kind: "derived", key: "meanSite" }
    },
    {
      id: "spread-time",
      title: "Spatial Spread vs Time",
      xLabel: "t",
      yLabel: "sigma_n",
      x: { kind: "time" },
      y: { kind: "derived", key: "spread" }
    },
    {
      id: "ipr-time",
      title: "Inverse Participation Ratio",
      xLabel: "t",
      yLabel: "IPR",
      x: { kind: "time" },
      y: { kind: "derived", key: "ipr" }
    },
    {
      id: "right-time",
      title: "Right-Half Probability",
      xLabel: "t",
      yLabel: "P_right",
      x: { kind: "time" },
      y: { kind: "derived", key: "rightProb" }
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
    type: "tightbinding"
  }
};

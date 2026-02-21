import type { OdeSystem } from "../types";

export interface QftLatticeConfig {
  n: number;
  xMin: number;
  xMax: number;
  dx: number;
  mass: number;
  lambda: number;
  damping: number;
  periodic: number;
  packetCenter: number;
  packetWidth: number;
  packetAmp: number;
  packetK: number;
  packetPiScale: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeGrid(value: number): number {
  return clamp(Math.round(finiteOr(value, 96)), 24, 256);
}

function sanitizeBaseParams(p: Record<string, number>): Omit<QftLatticeConfig, "n" | "dx"> {
  const xMin = finiteOr(p.xMin, -10);
  const rawXMax = finiteOr(p.xMax, 10);
  const xMax = rawXMax > xMin + 1e-6 ? rawXMax : xMin + 1;

  return {
    xMin,
    xMax,
    mass: Math.max(1e-8, finiteOr(p.mass, 1)),
    lambda: Math.max(0, finiteOr(p.lambda, 0.08)),
    damping: Math.max(0, finiteOr(p.damping, 0)),
    periodic: clamp(finiteOr(p.periodic, 1), 0, 1),
    packetCenter: finiteOr(p.packetCenter, -3),
    packetWidth: Math.max(0.08, finiteOr(p.packetWidth, 1.1)),
    packetAmp: finiteOr(p.packetAmp, 0.8),
    packetK: finiteOr(p.packetK, 1.4),
    packetPiScale: finiteOr(p.packetPiScale, 0)
  };
}

export function qftLatticeFromParams(p: Record<string, number>, stateLength?: number): QftLatticeConfig {
  const base = sanitizeBaseParams(p);

  const nFromState = stateLength && stateLength % 2 === 0 ? stateLength / 2 : NaN;
  const n = Number.isInteger(nFromState) && nFromState >= 3 ? nFromState : sanitizeGrid(p.gridPoints);
  const dx = (base.xMax - base.xMin) / Math.max(1, n - 1);

  return {
    ...base,
    n,
    dx
  };
}

export function qftLatticeXAt(i: number, cfg: QftLatticeConfig): number {
  return cfg.xMin + i * cfg.dx;
}

function splitState(y: number[], cfg: QftLatticeConfig): { phi: number[]; pi: number[] } {
  const expectedLength = 2 * cfg.n;
  if (y.length !== expectedLength) {
    throw new Error(`QFT lattice state length mismatch: expected ${expectedLength}, got ${y.length}.`);
  }

  return {
    phi: y.slice(0, cfg.n),
    pi: y.slice(cfg.n)
  };
}

function neighbor(phi: number[], i: number, delta: number, cfg: QftLatticeConfig): number {
  const idx = i + delta;
  if (cfg.periodic >= 0.5) {
    const wrapped = ((idx % cfg.n) + cfg.n) % cfg.n;
    return phi[wrapped];
  }

  if (idx < 0 || idx >= cfg.n) {
    return 0;
  }

  return phi[idx];
}

function laplacian(phi: number[], i: number, cfg: QftLatticeConfig): number {
  const left = neighbor(phi, i, -1, cfg);
  const right = neighbor(phi, i, +1, cfg);
  const center = phi[i];
  return (left - 2 * center + right) / (cfg.dx * cfg.dx);
}

export function buildQftLatticeInitialState(p: Record<string, number>): number[] {
  const cfg = qftLatticeFromParams(p);
  const phi = new Array<number>(cfg.n);
  const pi = new Array<number>(cfg.n);

  for (let i = 0; i < cfg.n; i += 1) {
    const x = qftLatticeXAt(i, cfg);
    const z = (x - cfg.packetCenter) / cfg.packetWidth;
    const env = Math.exp(-0.5 * z * z);
    const phase = cfg.packetK * (x - cfg.packetCenter);

    phi[i] = cfg.packetAmp * env * Math.cos(phase);
    pi[i] = cfg.packetPiScale * cfg.packetAmp * env * Math.sin(phase);
  }

  return [...phi, ...pi];
}

export interface QftLatticeObservables {
  phiCenter: number;
  piCenter: number;
  peakAbsPhi: number;
  fieldL2: number;
  momentumL2: number;
  spatialMean: number;
}

export function qftLatticeObservablesFromState(
  y: number[],
  p: Record<string, number>
): QftLatticeObservables {
  const cfg = qftLatticeFromParams(p, y.length);
  const { phi, pi } = splitState(y, cfg);

  const centerI = Math.floor(cfg.n / 2);

  let peakAbsPhi = 0;
  let fieldL2 = 0;
  let momentumL2 = 0;
  let spatialMean = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const f = phi[i];
    const g = pi[i];
    peakAbsPhi = Math.max(peakAbsPhi, Math.abs(f));
    fieldL2 += f * f * cfg.dx;
    momentumL2 += g * g * cfg.dx;
    spatialMean += f * cfg.dx;
  }

  return {
    phiCenter: phi[centerI] ?? 0,
    piCenter: pi[centerI] ?? 0,
    peakAbsPhi,
    fieldL2: Math.sqrt(Math.max(0, fieldL2)),
    momentumL2: Math.sqrt(Math.max(0, momentumL2)),
    spatialMean: spatialMean / (cfg.xMax - cfg.xMin || 1)
  };
}

export function qftLatticeEnergyFromState(y: number[], p: Record<string, number>): number {
  const cfg = qftLatticeFromParams(p, y.length);
  const { phi, pi } = splitState(y, cfg);

  let total = 0;

  for (let i = 0; i < cfg.n; i += 1) {
    const grad = (neighbor(phi, i, +1, cfg) - phi[i]) / cfg.dx;
    const kinetic = 0.5 * pi[i] * pi[i];
    const gradient = 0.5 * grad * grad;
    const massTerm = 0.5 * cfg.mass * cfg.mass * phi[i] * phi[i];
    const quartic = 0.25 * cfg.lambda * Math.pow(phi[i], 4);

    total += (kinetic + gradient + massTerm + quartic) * cfg.dx;
  }

  return total;
}

const defaultParams = {
  gridPoints: 96,
  xMin: -10,
  xMax: 10,
  mass: 1,
  lambda: 0.08,
  damping: 0,
  periodic: 1,
  packetCenter: -3,
  packetWidth: 1.1,
  packetAmp: 0.8,
  packetK: 1.4,
  packetPiScale: 0
};

export const qftLatticeSystem: OdeSystem = {
  id: "qftlattice",
  name: "QFT Lattice (1+1D Scalar Field)",
  mode: "ode",
  state: {
    names: [],
    y0: buildQftLatticeInitialState(defaultParams)
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 16
  },
  supportedIntegrators: ["rk4"],
  params: { ...defaultParams },
  rhs: (_t, y, p) => {
    const cfg = qftLatticeFromParams(p, y.length);
    const { phi, pi } = splitState(y, cfg);

    const dPhi = new Array<number>(cfg.n);
    const dPi = new Array<number>(cfg.n);

    for (let i = 0; i < cfg.n; i += 1) {
      dPhi[i] = pi[i];
      dPi[i] =
        laplacian(phi, i, cfg) -
        cfg.mass * cfg.mass * phi[i] -
        cfg.lambda * Math.pow(phi[i], 3) -
        cfg.damping * pi[i];
    }

    return [...dPhi, ...dPi];
  },
  energy: (y, p) => qftLatticeEnergyFromState(y, p),
  derived: (y, p) => {
    const obs = qftLatticeObservablesFromState(y, p);
    return {
      phiCenter: obs.phiCenter,
      piCenter: obs.piCenter,
      peakAbsPhi: obs.peakAbsPhi,
      fieldL2: obs.fieldL2,
      momentumL2: obs.momentumL2,
      spatialMean: obs.spatialMean
    };
  },
  presets: [
    {
      name: "Localized Pulse",
      y0: buildQftLatticeInitialState({
        ...defaultParams,
        packetCenter: -3,
        packetWidth: 1.1,
        packetAmp: 0.8,
        packetK: 1.4,
        packetPiScale: 0
      }),
      params: {
        packetCenter: -3,
        packetWidth: 1.1,
        packetAmp: 0.8,
        packetK: 1.4,
        packetPiScale: 0,
        lambda: 0.08,
        damping: 0
      }
    },
    {
      name: "Traveling Wave Packet",
      y0: buildQftLatticeInitialState({
        ...defaultParams,
        packetCenter: -4,
        packetWidth: 1,
        packetAmp: 0.7,
        packetK: 2.2,
        packetPiScale: 1
      }),
      params: {
        packetCenter: -4,
        packetWidth: 1,
        packetAmp: 0.7,
        packetK: 2.2,
        packetPiScale: 1,
        lambda: 0.03,
        damping: 0
      }
    },
    {
      name: "Strong Self-Interaction",
      y0: buildQftLatticeInitialState({
        ...defaultParams,
        packetCenter: -2,
        packetWidth: 0.9,
        packetAmp: 1,
        packetK: 0.8,
        packetPiScale: 0
      }),
      params: {
        packetCenter: -2,
        packetWidth: 0.9,
        packetAmp: 1,
        packetK: 0.8,
        packetPiScale: 0,
        lambda: 0.3,
        damping: 0
      }
    },
    {
      name: "Damped Relaxation",
      y0: buildQftLatticeInitialState({
        ...defaultParams,
        packetCenter: -3,
        packetWidth: 1.2,
        packetAmp: 0.85,
        packetK: 1.3,
        packetPiScale: 0
      }),
      params: {
        packetCenter: -3,
        packetWidth: 1.2,
        packetAmp: 0.85,
        packetK: 1.3,
        packetPiScale: 0,
        lambda: 0.08,
        damping: 0.08
      }
    }
  ],
  plotSpec: [
    {
      id: "phi-center-time",
      title: "Center Field phi(0,t)",
      xLabel: "t",
      yLabel: "phi_center",
      x: { kind: "time" },
      y: { kind: "derived", key: "phiCenter" }
    },
    {
      id: "pi-center-time",
      title: "Center Momentum pi(0,t)",
      xLabel: "t",
      yLabel: "pi_center",
      x: { kind: "time" },
      y: { kind: "derived", key: "piCenter" }
    },
    {
      id: "peak-time",
      title: "Peak |phi| vs Time",
      xLabel: "t",
      yLabel: "max |phi|",
      x: { kind: "time" },
      y: { kind: "derived", key: "peakAbsPhi" }
    },
    {
      id: "field-l2-time",
      title: "Field L2 Norm vs Time",
      xLabel: "t",
      yLabel: "||phi||_2",
      x: { kind: "time" },
      y: { kind: "derived", key: "fieldL2" }
    },
    {
      id: "energy-time",
      title: "Total Energy vs Time",
      xLabel: "t",
      yLabel: "E",
      x: { kind: "time" },
      y: { kind: "energy" }
    }
  ],
  vizSpec: {
    type: "qftlattice"
  }
};

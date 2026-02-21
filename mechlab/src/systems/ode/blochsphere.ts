import type { OdeSystem } from "../types";

export interface BlochSphereConfig {
  hbar: number;
  omegaX: number;
  omegaY: number;
  omegaZ: number;
  theta0: number;
  phi0: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function wrapAngle(angle: number): number {
  if (!Number.isFinite(angle)) {
    return 0;
  }

  const wrapped = ((angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return wrapped;
}

export function blochSphereFromParams(p: Record<string, number>): BlochSphereConfig {
  return {
    hbar: Math.max(1e-8, finiteOr(p.hbar, 1)),
    omegaX: finiteOr(p.omegaX, 1.8),
    omegaY: finiteOr(p.omegaY, 0),
    omegaZ: finiteOr(p.omegaZ, 0.6),
    theta0: clamp(finiteOr(p.theta0, 0.35), 0, Math.PI),
    phi0: wrapAngle(finiteOr(p.phi0, 0))
  };
}

function normalizeState(y: number[]): number[] {
  const ar = y[0] ?? 1;
  const ai = y[1] ?? 0;
  const br = y[2] ?? 0;
  const bi = y[3] ?? 0;

  const norm = ar * ar + ai * ai + br * br + bi * bi;
  const scale = norm > 1e-14 ? 1 / Math.sqrt(norm) : 1;

  return [ar * scale, ai * scale, br * scale, bi * scale];
}

export function buildBlochSphereInitialState(p: Record<string, number>): number[] {
  const cfg = blochSphereFromParams(p);

  const aRe = Math.cos(0.5 * cfg.theta0);
  const aIm = 0;

  const bMag = Math.sin(0.5 * cfg.theta0);
  const bRe = bMag * Math.cos(cfg.phi0);
  const bIm = bMag * Math.sin(cfg.phi0);

  return normalizeState([aRe, aIm, bRe, bIm]);
}

function splitState(y: number[]): { ar: number; ai: number; br: number; bi: number } {
  if (y.length !== 4) {
    throw new Error(`Bloch sphere state length mismatch: expected 4, got ${y.length}.`);
  }

  return {
    ar: y[0],
    ai: y[1],
    br: y[2],
    bi: y[3]
  };
}

export interface BlochSphereObservables {
  norm: number;
  p0: number;
  p1: number;
  sx: number;
  sy: number;
  sz: number;
  radius: number;
  theta: number;
  phi: number;
  phaseA: number;
  phaseB: number;
  relativePhase: number;
}

export function blochSphereObservablesFromState(
  y: number[],
  _p: Record<string, number>
): BlochSphereObservables {
  const { ar, ai, br, bi } = splitState(y);

  const absA2 = ar * ar + ai * ai;
  const absB2 = br * br + bi * bi;
  const norm = absA2 + absB2;
  const normSafe = norm > 1e-14 ? norm : 1;

  const reAB = ar * br + ai * bi;
  const imAB = ar * bi - ai * br;

  const p0 = absA2 / normSafe;
  const p1 = absB2 / normSafe;

  const sx = (2 * reAB) / normSafe;
  const sy = (2 * imAB) / normSafe;
  const sz = (absA2 - absB2) / normSafe;

  const szClamped = clamp(sz, -1, 1);
  const theta = Math.acos(szClamped);
  const phi = wrapAngle(Math.atan2(sy, sx));

  const phaseA = wrapAngle(Math.atan2(ai, ar));
  const phaseB = wrapAngle(Math.atan2(bi, br));

  return {
    norm,
    p0,
    p1,
    sx,
    sy,
    sz,
    radius: Math.sqrt(sx * sx + sy * sy + sz * sz),
    theta,
    phi,
    phaseA,
    phaseB,
    relativePhase: wrapAngle(phaseB - phaseA)
  };
}

export function blochSphereEnergyFromState(y: number[], p: Record<string, number>): number {
  const cfg = blochSphereFromParams(p);
  const obs = blochSphereObservablesFromState(y, p);
  return 0.5 * (cfg.omegaX * obs.sx + cfg.omegaY * obs.sy + cfg.omegaZ * obs.sz);
}

function hTimesState(
  ar: number,
  ai: number,
  br: number,
  bi: number,
  omegaX: number,
  omegaY: number,
  omegaZ: number
): { haRe: number; haIm: number; hbRe: number; hbIm: number } {
  const halfX = 0.5 * omegaX;
  const halfY = 0.5 * omegaY;
  const halfZ = 0.5 * omegaZ;

  const cRe = halfX;
  const cIm = -halfY;
  const dRe = halfX;
  const dIm = halfY;

  const cTimesBRe = cRe * br - cIm * bi;
  const cTimesBIm = cRe * bi + cIm * br;
  const dTimesARe = dRe * ar - dIm * ai;
  const dTimesAIm = dRe * ai + dIm * ar;

  return {
    haRe: halfZ * ar + cTimesBRe,
    haIm: halfZ * ai + cTimesBIm,
    hbRe: dTimesARe - halfZ * br,
    hbIm: dTimesAIm - halfZ * bi
  };
}

const defaultParams = {
  hbar: 1,
  omegaX: 1.8,
  omegaY: 0,
  omegaZ: 0.6,
  theta0: 0.35,
  phi0: 0
};

export const blochSphereSystem: OdeSystem = {
  id: "blochsphere",
  name: "Bloch Sphere (Single Qubit)",
  mode: "ode",
  state: {
    names: [],
    y0: buildBlochSphereInitialState(defaultParams)
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 24
  },
  supportedIntegrators: ["rk4"],
  params: { ...defaultParams },
  rhs: (_t, y, p) => {
    const cfg = blochSphereFromParams(p);
    const { ar, ai, br, bi } = splitState(y);

    const { haRe, haIm, hbRe, hbIm } = hTimesState(
      ar,
      ai,
      br,
      bi,
      cfg.omegaX,
      cfg.omegaY,
      cfg.omegaZ
    );

    return [haIm / cfg.hbar, -haRe / cfg.hbar, hbIm / cfg.hbar, -hbRe / cfg.hbar];
  },
  energy: (y, p) => blochSphereEnergyFromState(y, p),
  derived: (y, p) => {
    const obs = blochSphereObservablesFromState(y, p);

    return {
      norm: obs.norm,
      p0: obs.p0,
      p1: obs.p1,
      sx: obs.sx,
      sy: obs.sy,
      sz: obs.sz,
      radius: obs.radius,
      theta: obs.theta,
      phi: obs.phi,
      phaseA: obs.phaseA,
      phaseB: obs.phaseB,
      relativePhase: obs.relativePhase
    };
  },
  presets: [
    {
      name: "Z-Precession (Equator)",
      y0: buildBlochSphereInitialState({
        ...defaultParams,
        omegaX: 0,
        omegaY: 0,
        omegaZ: 1.7,
        theta0: Math.PI / 2,
        phi0: 0
      }),
      params: {
        omegaX: 0,
        omegaY: 0,
        omegaZ: 1.7,
        theta0: Math.PI / 2,
        phi0: 0
      }
    },
    {
      name: "Rabi Flip (X Drive)",
      y0: buildBlochSphereInitialState({
        ...defaultParams,
        omegaX: 2,
        omegaY: 0,
        omegaZ: 0,
        theta0: 0,
        phi0: 0
      }),
      params: {
        omegaX: 2,
        omegaY: 0,
        omegaZ: 0,
        theta0: 0,
        phi0: 0
      }
    },
    {
      name: "Larmor About Tilted Field",
      y0: buildBlochSphereInitialState({
        ...defaultParams,
        omegaX: 0.9,
        omegaY: 0.7,
        omegaZ: 1.2,
        theta0: 0.55,
        phi0: 0.2
      }),
      params: {
        omegaX: 0.9,
        omegaY: 0.7,
        omegaZ: 1.2,
        theta0: 0.55,
        phi0: 0.2
      }
    },
    {
      name: "Y-Axis Rotation",
      y0: buildBlochSphereInitialState({
        ...defaultParams,
        omegaX: 0,
        omegaY: 1.8,
        omegaZ: 0,
        theta0: 0,
        phi0: 0
      }),
      params: {
        omegaX: 0,
        omegaY: 1.8,
        omegaZ: 0,
        theta0: 0,
        phi0: 0
      }
    }
  ],
  plotSpec: [
    {
      id: "bloch-xy",
      title: "Bloch Equator Projection (s_x vs s_y)",
      xLabel: "s_x",
      yLabel: "s_y",
      x: { kind: "derived", key: "sx" },
      y: { kind: "derived", key: "sy" }
    },
    {
      id: "sz-time",
      title: "Bloch Z Component vs Time",
      xLabel: "t",
      yLabel: "s_z",
      x: { kind: "time" },
      y: { kind: "derived", key: "sz" }
    },
    {
      id: "p1-time",
      title: "Excited-State Population P(|1>)",
      xLabel: "t",
      yLabel: "P1",
      x: { kind: "time" },
      y: { kind: "derived", key: "p1" }
    },
    {
      id: "phi-time",
      title: "Azimuth Phase phi(t)",
      xLabel: "t",
      yLabel: "phi (rad)",
      x: { kind: "time" },
      y: { kind: "derived", key: "phi" }
    },
    {
      id: "norm-time",
      title: "Norm ||psi||^2 vs Time",
      xLabel: "t",
      yLabel: "||psi||^2",
      x: { kind: "time" },
      y: { kind: "derived", key: "norm" }
    },
    {
      id: "energy-time",
      title: "Energy Expectation <H> vs Time",
      xLabel: "t",
      yLabel: "<H>",
      x: { kind: "time" },
      y: { kind: "energy" }
    }
  ],
  vizSpec: {
    type: "blochsphere"
  }
};

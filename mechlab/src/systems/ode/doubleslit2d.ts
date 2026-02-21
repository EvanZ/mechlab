import type { OdeSystem } from "../types";

export interface DoubleSlit2dGridConfig {
  nx: number;
  ny: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  dx: number;
  dy: number;
  m: number;
  hbar: number;
  packetX0: number;
  packetY0: number;
  packetSigmaX: number;
  packetSigmaY: number;
  packetKx: number;
  packetKy: number;
  barrierY: number;
  barrierThickness: number;
  slitSeparation: number;
  slitWidth: number;
  barrierHeight: number;
  rightSlitOpen: number;
  detectorY: number;
  absorberStrength: number;
  absorberFraction: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeGridX(value: number): number {
  return clamp(Math.round(finiteOr(value, 48)), 24, 96);
}

function sanitizeGridY(value: number): number {
  return clamp(Math.round(finiteOr(value, 64)), 24, 112);
}

function sanitizeBaseParams(p: Record<string, number>): Omit<DoubleSlit2dGridConfig, "nx" | "ny" | "dx" | "dy"> {
  const xMin = finiteOr(p.xMin, -8);
  const rawXMax = finiteOr(p.xMax, 8);
  const xMax = rawXMax > xMin + 1e-6 ? rawXMax : xMin + 1;

  const yMin = finiteOr(p.yMin, -7);
  const rawYMax = finiteOr(p.yMax, 7);
  const yMax = rawYMax > yMin + 1e-6 ? rawYMax : yMin + 1;

  const barrierY = finiteOr(p.barrierY, -1);

  return {
    xMin,
    xMax,
    yMin,
    yMax,
    m: Math.max(1e-8, finiteOr(p.m, 1)),
    hbar: Math.max(1e-8, finiteOr(p.hbar, 1)),
    packetX0: finiteOr(p.packetX0, 0),
    packetY0: finiteOr(p.packetY0, -5),
    packetSigmaX: Math.max(0.05, finiteOr(p.packetSigmaX, 0.8)),
    packetSigmaY: Math.max(0.05, finiteOr(p.packetSigmaY, 0.65)),
    packetKx: finiteOr(p.packetKx, 0),
    packetKy: finiteOr(p.packetKy, 8),
    barrierY,
    barrierThickness: Math.max(0.02, finiteOr(p.barrierThickness, 0.2)),
    slitSeparation: Math.max(0.1, finiteOr(p.slitSeparation, 2.5)),
    slitWidth: Math.max(0.05, finiteOr(p.slitWidth, 0.5)),
    barrierHeight: Math.max(0, finiteOr(p.barrierHeight, 260)),
    rightSlitOpen: clamp(finiteOr(p.rightSlitOpen, 1), 0, 1),
    detectorY: clamp(finiteOr(p.detectorY, 4.5), yMin, yMax),
    absorberStrength: Math.max(0, finiteOr(p.absorberStrength, 1.2)),
    absorberFraction: clamp(finiteOr(p.absorberFraction, 0.12), 0, 0.45)
  };
}

export function doubleSlit2dGridFromParams(
  p: Record<string, number>,
  stateLength?: number
): DoubleSlit2dGridConfig {
  const base = sanitizeBaseParams(p);

  let nx = sanitizeGridX(p.gridX);
  let ny = sanitizeGridY(p.gridY);

  if (stateLength && stateLength % 2 === 0) {
    const nCells = stateLength / 2;
    const candidateX = sanitizeGridX(p.gridX);
    const candidateY = nCells / candidateX;

    if (Number.isInteger(candidateY) && candidateY >= 3) {
      nx = candidateX;
      ny = sanitizeGridY(candidateY);
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

export function doubleSlit2dXAt(i: number, cfg: DoubleSlit2dGridConfig): number {
  return cfg.xMin + i * cfg.dx;
}

export function doubleSlit2dYAt(j: number, cfg: DoubleSlit2dGridConfig): number {
  return cfg.yMin + j * cfg.dy;
}

function flattenIndex(i: number, j: number, cfg: DoubleSlit2dGridConfig): number {
  return j * cfg.nx + i;
}

function splitState(y: number[], cfg: DoubleSlit2dGridConfig): { re: number[]; im: number[] } {
  const expectedLength = 2 * cfg.nx * cfg.ny;
  if (y.length !== expectedLength) {
    throw new Error(`2D double-slit state length mismatch: expected ${expectedLength}, got ${y.length}.`);
  }

  const nCells = cfg.nx * cfg.ny;
  return {
    re: y.slice(0, nCells),
    im: y.slice(nCells)
  };
}

function firstDerivativeX(
  arr: number[],
  i: number,
  j: number,
  cfg: DoubleSlit2dGridConfig
): number {
  const c = flattenIndex(i, j, cfg);

  if (i === 0) {
    return (arr[flattenIndex(1, j, cfg)] - arr[c]) / cfg.dx;
  }

  if (i === cfg.nx - 1) {
    return (arr[c] - arr[flattenIndex(cfg.nx - 2, j, cfg)]) / cfg.dx;
  }

  return (arr[flattenIndex(i + 1, j, cfg)] - arr[flattenIndex(i - 1, j, cfg)]) / (2 * cfg.dx);
}

function firstDerivativeY(
  arr: number[],
  i: number,
  j: number,
  cfg: DoubleSlit2dGridConfig
): number {
  const c = flattenIndex(i, j, cfg);

  if (j === 0) {
    return (arr[flattenIndex(i, 1, cfg)] - arr[c]) / cfg.dy;
  }

  if (j === cfg.ny - 1) {
    return (arr[c] - arr[flattenIndex(i, cfg.ny - 2, cfg)]) / cfg.dy;
  }

  return (arr[flattenIndex(i, j + 1, cfg)] - arr[flattenIndex(i, j - 1, cfg)]) / (2 * cfg.dy);
}

function laplacian(
  arr: number[],
  i: number,
  j: number,
  cfg: DoubleSlit2dGridConfig
): number {
  const c = flattenIndex(i, j, cfg);
  const center = arr[c];

  const left = i > 0 ? arr[flattenIndex(i - 1, j, cfg)] : 0;
  const right = i + 1 < cfg.nx ? arr[flattenIndex(i + 1, j, cfg)] : 0;
  const down = j > 0 ? arr[flattenIndex(i, j - 1, cfg)] : 0;
  const up = j + 1 < cfg.ny ? arr[flattenIndex(i, j + 1, cfg)] : 0;

  return (left - 2 * center + right) / (cfg.dx * cfg.dx) + (down - 2 * center + up) / (cfg.dy * cfg.dy);
}

function barrierPotentialAtXY(
  x: number,
  y: number,
  cfg: Pick<
    DoubleSlit2dGridConfig,
    "barrierY" | "barrierThickness" | "slitSeparation" | "slitWidth" | "barrierHeight" | "rightSlitOpen"
  >
): number {
  const inBarrierStrip = Math.abs(y - cfg.barrierY) <= 0.5 * cfg.barrierThickness;
  if (!inBarrierStrip) {
    return 0;
  }

  const leftCenter = -0.5 * cfg.slitSeparation;
  const rightCenter = 0.5 * cfg.slitSeparation;

  const inLeftSlit = Math.abs(x - leftCenter) <= 0.5 * cfg.slitWidth;
  if (inLeftSlit) {
    return 0;
  }

  const inRightSlit = Math.abs(x - rightCenter) <= 0.5 * cfg.slitWidth;
  if (inRightSlit) {
    return cfg.barrierHeight * (1 - cfg.rightSlitOpen);
  }

  return cfg.barrierHeight;
}

function absorberAtXY(
  x: number,
  y: number,
  cfg: Pick<DoubleSlit2dGridConfig, "xMin" | "xMax" | "yMin" | "yMax" | "absorberFraction" | "absorberStrength">
): number {
  const edgeWidthX = cfg.absorberFraction * (cfg.xMax - cfg.xMin);
  const edgeWidthY = cfg.absorberFraction * (cfg.yMax - cfg.yMin);

  if ((edgeWidthX <= 0 && edgeWidthY <= 0) || cfg.absorberStrength <= 0) {
    return 0;
  }

  const dX = Math.min(x - cfg.xMin, cfg.xMax - x);
  const dY = Math.min(y - cfg.yMin, cfg.yMax - y);

  let ratio = 0;

  if (edgeWidthX > 0 && dX < edgeWidthX) {
    ratio = Math.max(ratio, (edgeWidthX - dX) / edgeWidthX);
  }

  if (edgeWidthY > 0 && dY < edgeWidthY) {
    ratio = Math.max(ratio, (edgeWidthY - dY) / edgeWidthY);
  }

  return cfg.absorberStrength * ratio * ratio;
}

export function buildDoubleSlit2dInitialState(p: Record<string, number>): number[] {
  const cfg = doubleSlit2dGridFromParams(p);
  const nCells = cfg.nx * cfg.ny;

  const re = new Array<number>(nCells);
  const im = new Array<number>(nCells);

  let normIntegral = 0;

  for (let j = 0; j < cfg.ny; j += 1) {
    const y = doubleSlit2dYAt(j, cfg);
    for (let i = 0; i < cfg.nx; i += 1) {
      const x = doubleSlit2dXAt(i, cfg);
      const idx = flattenIndex(i, j, cfg);

      const gaussX = Math.exp(-((x - cfg.packetX0) ** 2) / (4 * cfg.packetSigmaX * cfg.packetSigmaX));
      const gaussY = Math.exp(-((y - cfg.packetY0) ** 2) / (4 * cfg.packetSigmaY * cfg.packetSigmaY));
      const envelope = gaussX * gaussY;
      const phase = cfg.packetKx * x + cfg.packetKy * y;

      re[idx] = envelope * Math.cos(phase);
      im[idx] = envelope * Math.sin(phase);

      normIntegral += (re[idx] * re[idx] + im[idx] * im[idx]) * cfg.dx * cfg.dy;
    }
  }

  const scale = normIntegral > 0 ? 1 / Math.sqrt(normIntegral) : 1;
  const y0 = new Array<number>(2 * nCells);

  for (let idx = 0; idx < nCells; idx += 1) {
    y0[idx] = re[idx] * scale;
    y0[nCells + idx] = im[idx] * scale;
  }

  return y0;
}

function nearestYIndex(targetY: number, cfg: DoubleSlit2dGridConfig): number {
  let bestJ = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let j = 0; j < cfg.ny; j += 1) {
    const y = doubleSlit2dYAt(j, cfg);
    const distance = Math.abs(y - targetY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestJ = j;
    }
  }

  return bestJ;
}

function detectorVisibility(detectorDensity: number[], cfg: DoubleSlit2dGridConfig): number {
  const windowHalfWidth = Math.max(1.2, 1.5 * cfg.slitSeparation);
  let minDensity = Number.POSITIVE_INFINITY;
  let maxDensity = 0;

  for (let i = 0; i < cfg.nx; i += 1) {
    const x = doubleSlit2dXAt(i, cfg);
    if (Math.abs(x) > windowHalfWidth) {
      continue;
    }

    const value = detectorDensity[i];
    minDensity = Math.min(minDensity, value);
    maxDensity = Math.max(maxDensity, value);
  }

  if (!Number.isFinite(minDensity)) {
    minDensity = 0;
  }

  return (maxDensity - minDensity) / Math.max(1e-10, maxDensity + minDensity);
}

export interface DoubleSlit2dObservables {
  norm: number;
  xMean: number;
  yMean: number;
  spreadX: number;
  spreadY: number;
  detectorCenter: number;
  detectorVisibility: number;
  transmittedProb: number;
  reflectedProb: number;
}

export function doubleSlit2dObservablesFromState(
  y: number[],
  p: Record<string, number>
): DoubleSlit2dObservables {
  const cfg = doubleSlit2dGridFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);

  let norm = 0;
  let xMeanNumer = 0;
  let yMeanNumer = 0;
  let x2MeanNumer = 0;
  let y2MeanNumer = 0;
  let transmittedProb = 0;
  let reflectedProb = 0;

  const detectorJ = nearestYIndex(cfg.detectorY, cfg);
  const detectorDensity = new Array<number>(cfg.nx).fill(0);

  for (let j = 0; j < cfg.ny; j += 1) {
    const yPos = doubleSlit2dYAt(j, cfg);
    for (let i = 0; i < cfg.nx; i += 1) {
      const idx = flattenIndex(i, j, cfg);
      const xPos = doubleSlit2dXAt(i, cfg);
      const density = re[idx] * re[idx] + im[idx] * im[idx];
      const prob = density * cfg.dx * cfg.dy;

      norm += prob;
      xMeanNumer += xPos * prob;
      yMeanNumer += yPos * prob;
      x2MeanNumer += xPos * xPos * prob;
      y2MeanNumer += yPos * yPos * prob;

      if (j === detectorJ) {
        detectorDensity[i] = density;
      }

      if (yPos > cfg.barrierY + 0.5 * cfg.barrierThickness) {
        transmittedProb += prob;
      } else if (yPos < cfg.barrierY - 0.5 * cfg.barrierThickness) {
        reflectedProb += prob;
      }
    }
  }

  const centerI = Math.floor(cfg.nx / 2);
  const normSafe = norm > 1e-12 ? norm : 1;
  const xMean = xMeanNumer / normSafe;
  const yMean = yMeanNumer / normSafe;

  return {
    norm,
    xMean,
    yMean,
    spreadX: Math.sqrt(Math.max(0, x2MeanNumer / normSafe - xMean * xMean)),
    spreadY: Math.sqrt(Math.max(0, y2MeanNumer / normSafe - yMean * yMean)),
    detectorCenter: detectorDensity[centerI] ?? 0,
    detectorVisibility: detectorVisibility(detectorDensity, cfg),
    transmittedProb: transmittedProb / normSafe,
    reflectedProb: reflectedProb / normSafe
  };
}

function doubleSlit2dEnergyFromState(y: number[], p: Record<string, number>): number {
  const cfg = doubleSlit2dGridFromParams(p, y.length);
  const { re, im } = splitState(y, cfg);

  let kinetic = 0;
  let potential = 0;

  for (let j = 0; j < cfg.ny; j += 1) {
    const yPos = doubleSlit2dYAt(j, cfg);
    for (let i = 0; i < cfg.nx; i += 1) {
      const idx = flattenIndex(i, j, cfg);
      const xPos = doubleSlit2dXAt(i, cfg);
      const dRdx = firstDerivativeX(re, i, j, cfg);
      const dRdy = firstDerivativeY(re, i, j, cfg);
      const dIdx = firstDerivativeX(im, i, j, cfg);
      const dIdy = firstDerivativeY(im, i, j, cfg);
      const density = re[idx] * re[idx] + im[idx] * im[idx];
      const v = barrierPotentialAtXY(xPos, yPos, cfg);

      kinetic +=
        (cfg.hbar * cfg.hbar / (2 * cfg.m)) *
        (dRdx * dRdx + dRdy * dRdy + dIdx * dIdx + dIdy * dIdy) *
        cfg.dx *
        cfg.dy;
      potential += v * density * cfg.dx * cfg.dy;
    }
  }

  return kinetic + potential;
}

const defaultParams = {
  m: 1,
  hbar: 1,
  gridX: 48,
  gridY: 64,
  xMin: -8,
  xMax: 8,
  yMin: -7,
  yMax: 7,
  packetX0: 0,
  packetY0: -5,
  packetSigmaX: 0.8,
  packetSigmaY: 0.65,
  packetKx: 0,
  packetKy: 8,
  barrierY: -1,
  barrierThickness: 0.2,
  slitSeparation: 2.5,
  slitWidth: 0.5,
  barrierHeight: 260,
  rightSlitOpen: 1,
  detectorY: 4.5,
  absorberStrength: 1.2,
  absorberFraction: 0.12
};

export const doubleSlit2dSystem: OdeSystem = {
  id: "doubleslit2d",
  name: "Double-Slit Interference (2D)",
  mode: "ode",
  state: {
    names: [],
    y0: buildDoubleSlit2dInitialState(defaultParams)
  },
  simulationDefaults: {
    dt: 0.0032,
    duration: 1.12
  },
  supportedIntegrators: ["rk4"],
  params: { ...defaultParams },
  rhs: (_t, y, p) => {
    const cfg = doubleSlit2dGridFromParams(p, y.length);
    const { re, im } = splitState(y, cfg);

    const nCells = cfg.nx * cfg.ny;
    const dRe = new Array<number>(nCells);
    const dIm = new Array<number>(nCells);

    for (let j = 0; j < cfg.ny; j += 1) {
      const yPos = doubleSlit2dYAt(j, cfg);
      for (let i = 0; i < cfg.nx; i += 1) {
        const idx = flattenIndex(i, j, cfg);
        const xPos = doubleSlit2dXAt(i, cfg);
        const v = barrierPotentialAtXY(xPos, yPos, cfg);
        const gamma = absorberAtXY(xPos, yPos, cfg);
        const lapRe = laplacian(re, i, j, cfg);
        const lapIm = laplacian(im, i, j, cfg);

        dRe[idx] = -(cfg.hbar / (2 * cfg.m)) * lapIm + (v / cfg.hbar) * im[idx] - gamma * re[idx];
        dIm[idx] = +(cfg.hbar / (2 * cfg.m)) * lapRe - (v / cfg.hbar) * re[idx] - gamma * im[idx];
      }
    }

    return [...dRe, ...dIm];
  },
  energy: (y, p) => doubleSlit2dEnergyFromState(y, p),
  derived: (y, p) => {
    const obs = doubleSlit2dObservablesFromState(y, p);

    return {
      norm: obs.norm,
      xMean: obs.xMean,
      yMean: obs.yMean,
      spreadX: obs.spreadX,
      spreadY: obs.spreadY,
      detectorCenter: obs.detectorCenter,
      detectorVisibility: obs.detectorVisibility,
      transmittedProb: obs.transmittedProb,
      reflectedProb: obs.reflectedProb
    };
  },
  presets: [
    {
      name: "Symmetric Double Slit",
      y0: buildDoubleSlit2dInitialState({
        ...defaultParams,
        rightSlitOpen: 1
      }),
      params: {
        rightSlitOpen: 1
      }
    },
    {
      name: "Single Slit (Left Only)",
      y0: buildDoubleSlit2dInitialState({
        ...defaultParams,
        rightSlitOpen: 0
      }),
      params: {
        rightSlitOpen: 0
      }
    },
    {
      name: "Narrow Slits",
      y0: buildDoubleSlit2dInitialState({
        ...defaultParams,
        slitWidth: 0.3,
        slitSeparation: 2.5,
        rightSlitOpen: 1
      }),
      params: {
        slitWidth: 0.3,
        slitSeparation: 2.5,
        rightSlitOpen: 1
      }
    },
    {
      name: "Wide Separation",
      y0: buildDoubleSlit2dInitialState({
        ...defaultParams,
        slitSeparation: 3.5,
        rightSlitOpen: 1
      }),
      params: {
        slitSeparation: 3.5,
        rightSlitOpen: 1
      }
    }
  ],
  plotSpec: [
    {
      id: "detector-center-time",
      title: "Detector Center Intensity vs Time",
      xLabel: "t",
      yLabel: "I(0)",
      x: { kind: "time" },
      y: { kind: "derived", key: "detectorCenter" }
    },
    {
      id: "detector-visibility-time",
      title: "Detector Fringe Visibility vs Time",
      xLabel: "t",
      yLabel: "V",
      x: { kind: "time" },
      y: { kind: "derived", key: "detectorVisibility" }
    },
    {
      id: "transmitted-time",
      title: "Transmitted Probability vs Time",
      xLabel: "t",
      yLabel: "P_trans",
      x: { kind: "time" },
      y: { kind: "derived", key: "transmittedProb" }
    },
    {
      id: "reflected-time",
      title: "Reflected Probability vs Time",
      xLabel: "t",
      yLabel: "P_refl",
      x: { kind: "time" },
      y: { kind: "derived", key: "reflectedProb" }
    },
    {
      id: "norm-time",
      title: "Norm vs Time",
      xLabel: "t",
      yLabel: "||psi||^2",
      x: { kind: "time" },
      y: { kind: "derived", key: "norm" }
    }
  ],
  vizSpec: {
    type: "doubleslit2d"
  }
};

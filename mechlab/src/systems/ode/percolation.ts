import type { OdeSystem } from "../types";

interface PercolationConfig {
  gridSize: number;
  pOcc: number;
  trials: number;
  scanMin: number;
  scanMax: number;
  scanPoints: number;
  seed: number;
}

interface PercolationTrialSummary {
  occupiedFraction: number;
  largestFraction: number;
  spanningFraction: number;
  spanFlag: number;
  clusterCount: number;
}

interface PercolationSnapshot extends PercolationTrialSummary {
  n: number;
  occupancy: Uint8Array;
  largestMask: Uint8Array;
  spanningMask: Uint8Array;
}

export interface PercolationSimulationOptions {
  t0: number;
  y0: number[];
  dt: number;
  steps: number;
  params: Record<string, number>;
}

export interface PercolationSimulationResult {
  t: number[];
  y: number[][];
  derived: Record<string, number[]>;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  return Math.round(clamp(finiteOr(value, fallback), min, max));
}

function normalizeRange(minValue: number, maxValue: number): { min: number; max: number } {
  if (maxValue >= minValue) {
    return { min: minValue, max: maxValue };
  }

  return { min: maxValue, max: minValue };
}

function configFromParams(params: Record<string, number>): PercolationConfig {
  const rawMin = clamp(finiteOr(params.scanMin, 0.35), 0, 1);
  const rawMax = clamp(finiteOr(params.scanMax, 0.8), 0, 1);
  const normalized = normalizeRange(rawMin, rawMax);

  return {
    gridSize: clampInt(params.gridSize, 8, 80, 28),
    pOcc: clamp(finiteOr(params.pOcc, 0.5927), 0, 1),
    trials: clampInt(params.trials, 1, 500, 80),
    scanMin: normalized.min,
    scanMax: normalized.max,
    scanPoints: clampInt(params.scanPoints, 5, 101, 25),
    seed: Math.round(finiteOr(params.seed, 11))
  };
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;

  return () => {
    t += 0x6d2b79f5;
    let z = Math.imul(t ^ (t >>> 15), 1 | t);
    z ^= z + Math.imul(z ^ (z >>> 7), 61 | z);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

function generateOccupancy(n: number, pOcc: number, random: () => number): Uint8Array {
  const cells = n * n;
  const occupancy = new Uint8Array(cells);

  for (let i = 0; i < cells; i += 1) {
    occupancy[i] = random() < pOcc ? 1 : 0;
  }

  return occupancy;
}

function analyzeOccupancy(n: number, occupancy: Uint8Array): PercolationSnapshot {
  const cells = n * n;
  const visited = new Uint8Array(cells);
  const queue = new Int32Array(cells);
  const largestMask = new Uint8Array(cells);
  const spanningMask = new Uint8Array(cells);

  let occupiedCount = 0;
  for (let i = 0; i < cells; i += 1) {
    occupiedCount += occupancy[i];
  }

  let largestSize = 0;
  let largestIndices: number[] = [];
  let spanningSize = 0;
  let spanFlag = 0;
  let clusterCount = 0;

  for (let start = 0; start < cells; start += 1) {
    if (occupancy[start] === 0 || visited[start] !== 0) {
      continue;
    }

    clusterCount += 1;
    let qHead = 0;
    let qTail = 0;
    queue[qTail] = start;
    qTail += 1;
    visited[start] = 1;

    const members: number[] = [];
    let touchesTop = false;
    let touchesBottom = false;

    while (qHead < qTail) {
      const idx = queue[qHead];
      qHead += 1;
      members.push(idx);

      const row = Math.floor(idx / n);
      const col = idx - row * n;

      if (row === 0) {
        touchesTop = true;
      }

      if (row === n - 1) {
        touchesBottom = true;
      }

      if (row > 0) {
        const up = idx - n;
        if (occupancy[up] !== 0 && visited[up] === 0) {
          visited[up] = 1;
          queue[qTail] = up;
          qTail += 1;
        }
      }

      if (row < n - 1) {
        const down = idx + n;
        if (occupancy[down] !== 0 && visited[down] === 0) {
          visited[down] = 1;
          queue[qTail] = down;
          qTail += 1;
        }
      }

      if (col > 0) {
        const left = idx - 1;
        if (occupancy[left] !== 0 && visited[left] === 0) {
          visited[left] = 1;
          queue[qTail] = left;
          qTail += 1;
        }
      }

      if (col < n - 1) {
        const right = idx + 1;
        if (occupancy[right] !== 0 && visited[right] === 0) {
          visited[right] = 1;
          queue[qTail] = right;
          qTail += 1;
        }
      }
    }

    if (members.length > largestSize) {
      largestSize = members.length;
      largestIndices = members;
    }

    if (touchesTop && touchesBottom) {
      spanFlag = 1;
      spanningSize += members.length;
      for (const idx of members) {
        spanningMask[idx] = 1;
      }
    }
  }

  for (const idx of largestIndices) {
    largestMask[idx] = 1;
  }

  const cellsSafe = Math.max(1, cells);

  return {
    n,
    occupancy,
    largestMask,
    spanningMask,
    occupiedFraction: occupiedCount / cellsSafe,
    largestFraction: largestSize / cellsSafe,
    spanningFraction: spanningSize / cellsSafe,
    spanFlag,
    clusterCount
  };
}

function packSnapshot(snapshot: PercolationSnapshot): number[] {
  const cells = snapshot.n * snapshot.n;
  const packed = new Array<number>(1 + 3 * cells + 5);
  packed[0] = snapshot.n;

  let offset = 1;

  for (let i = 0; i < cells; i += 1) {
    packed[offset + i] = snapshot.occupancy[i];
  }

  offset += cells;
  for (let i = 0; i < cells; i += 1) {
    packed[offset + i] = snapshot.largestMask[i];
  }

  offset += cells;
  for (let i = 0; i < cells; i += 1) {
    packed[offset + i] = snapshot.spanningMask[i];
  }

  offset += cells;
  packed[offset] = snapshot.occupiedFraction;
  packed[offset + 1] = snapshot.largestFraction;
  packed[offset + 2] = snapshot.spanningFraction;
  packed[offset + 3] = snapshot.spanFlag;
  packed[offset + 4] = snapshot.clusterCount;

  return packed;
}

function runTrialSummary(n: number, pOcc: number, random: () => number): PercolationTrialSummary {
  const snapshot = analyzeOccupancy(n, generateOccupancy(n, pOcc, random));

  return {
    occupiedFraction: snapshot.occupiedFraction,
    largestFraction: snapshot.largestFraction,
    spanningFraction: snapshot.spanningFraction,
    spanFlag: snapshot.spanFlag,
    clusterCount: snapshot.clusterCount
  };
}

function interpolationFraction(index: number, total: number): number {
  if (total <= 1) {
    return 0;
  }
  return index / (total - 1);
}

function pFromScanIndex(index: number, cfg: PercolationConfig): number {
  return cfg.scanMin + interpolationFraction(index, cfg.scanPoints) * (cfg.scanMax - cfg.scanMin);
}

function snapshotForParams(cfg: PercolationConfig): PercolationSnapshot {
  const rng = mulberry32(cfg.seed);
  const occupancy = generateOccupancy(cfg.gridSize, cfg.pOcc, rng);
  return analyzeOccupancy(cfg.gridSize, occupancy);
}

export function buildPercolationInitialState(params: Record<string, number>): number[] {
  return packSnapshot(snapshotForParams(configFromParams(params)));
}

export function simulatePercolationExperiment(
  options: PercolationSimulationOptions
): PercolationSimulationResult {
  const cfg = configFromParams(options.params);
  const snapshot = snapshotForParams(cfg);

  const scanP = new Array<number>(cfg.scanPoints);
  const scanSpanProb = new Array<number>(cfg.scanPoints);
  const scanLargestFrac = new Array<number>(cfg.scanPoints);
  const scanOccupiedFrac = new Array<number>(cfg.scanPoints);
  const scanClusterCount = new Array<number>(cfg.scanPoints);

  const scanRng = mulberry32(cfg.seed + 7919);

  for (let i = 0; i < cfg.scanPoints; i += 1) {
    const pVal = pFromScanIndex(i, cfg);
    scanP[i] = pVal;

    let spanHits = 0;
    let largestAccum = 0;
    let occupiedAccum = 0;
    let clusterAccum = 0;

    for (let trial = 0; trial < cfg.trials; trial += 1) {
      const summary = runTrialSummary(cfg.gridSize, pVal, scanRng);
      spanHits += summary.spanFlag;
      largestAccum += summary.largestFraction;
      occupiedAccum += summary.occupiedFraction;
      clusterAccum += summary.clusterCount;
    }

    const denom = Math.max(1, cfg.trials);
    scanSpanProb[i] = spanHits / denom;
    scanLargestFrac[i] = largestAccum / denom;
    scanOccupiedFrac[i] = occupiedAccum / denom;
    scanClusterCount[i] = clusterAccum / denom;
  }

  return {
    t: [options.t0],
    y: [packSnapshot(snapshot)],
    derived: {
      occFrac: [snapshot.occupiedFraction],
      largestFrac: [snapshot.largestFraction],
      spanningFrac: [snapshot.spanningFraction],
      spanFlag: [snapshot.spanFlag],
      clusterCount: [snapshot.clusterCount],
      scanP,
      scanSpanProb,
      scanLargestFrac,
      scanOccupiedFrac,
      scanClusterCount
    }
  };
}

const defaultParams = {
  gridSize: 28,
  pOcc: 0.5927,
  trials: 80,
  scanMin: 0.35,
  scanMax: 0.8,
  scanPoints: 25,
  seed: 11
};

export const percolationSystem: OdeSystem = {
  id: "percolation",
  name: "2D Site Percolation",
  mode: "ode",
  state: {
    names: [],
    y0: buildPercolationInitialState(defaultParams)
  },
  simulationDefaults: {
    dt: 1,
    duration: 1
  },
  supportedIntegrators: ["rk4"],
  params: { ...defaultParams },
  rhs: (_t, y) => new Array<number>(y.length).fill(0),
  derived: (y) => {
    const n = Math.max(2, Math.round(finiteOr(y[0], defaultParams.gridSize)));
    const statsOffset = 1 + 3 * n * n;

    return {
      occFrac: finiteOr(y[statsOffset], 0),
      largestFrac: finiteOr(y[statsOffset + 1], 0),
      spanningFrac: finiteOr(y[statsOffset + 2], 0),
      spanFlag: finiteOr(y[statsOffset + 3], 0),
      clusterCount: finiteOr(y[statsOffset + 4], 0)
    };
  },
  presets: [
    {
      name: "Subcritical (p = 0.50)",
      y0: buildPercolationInitialState({ ...defaultParams, pOcc: 0.5 }),
      params: {
        pOcc: 0.5
      }
    },
    {
      name: "Near Critical (p = 0.5927)",
      y0: buildPercolationInitialState({ ...defaultParams, pOcc: 0.5927 }),
      params: {
        pOcc: 0.5927
      }
    },
    {
      name: "Supercritical (p = 0.68)",
      y0: buildPercolationInitialState({ ...defaultParams, pOcc: 0.68 }),
      params: {
        pOcc: 0.68
      }
    },
    {
      name: "Larger Lattice",
      y0: buildPercolationInitialState({ ...defaultParams, gridSize: 44, pOcc: 0.6 }),
      params: {
        gridSize: 44,
        pOcc: 0.6,
        trials: 60
      }
    }
  ],
  plotSpec: [
    {
      id: "span-vs-p",
      title: "Spanning Probability vs p",
      xLabel: "p",
      yLabel: "P(span)",
      x: { kind: "derived", key: "scanP" },
      y: { kind: "derived", key: "scanSpanProb" }
    },
    {
      id: "largest-vs-p",
      title: "Largest Cluster Fraction vs p",
      xLabel: "p",
      yLabel: "<s_max>/N",
      x: { kind: "derived", key: "scanP" },
      y: { kind: "derived", key: "scanLargestFrac" }
    },
    {
      id: "occupied-vs-p",
      title: "Occupied Fraction vs p",
      xLabel: "p",
      yLabel: "<occupied>",
      x: { kind: "derived", key: "scanP" },
      y: { kind: "derived", key: "scanOccupiedFrac" }
    }
  ],
  vizSpec: {
    type: "percolation"
  }
};

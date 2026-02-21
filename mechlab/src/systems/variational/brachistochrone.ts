import type { VariationalResult, VariationalSystem } from "../types";

interface SolverParams {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  g: number;
  segments: number;
  iterations: number;
  learningRate: number;
  smoothness: number;
  xClustering: number;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function valueOrDefault(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeParams(params: Record<string, number>): SolverParams {
  const x0 = valueOrDefault(params.x0, 0);
  const y0 = valueOrDefault(params.y0, 0);
  const x1 = valueOrDefault(params.x1, 2);
  const y1 = valueOrDefault(params.y1, 1);
  const g = valueOrDefault(params.g, 9.81);
  const segments = valueOrDefault(params.segments, 80);
  const iterations = valueOrDefault(params.iterations, 240);
  const learningRate = valueOrDefault(params.learningRate, 0.03);
  const smoothness = valueOrDefault(params.smoothness, 0.001);
  const xClustering = valueOrDefault(params.xClustering, 1.6);

  return {
    x0,
    y0,
    x1,
    y1,
    g: Math.max(1e-6, g),
    segments: clampInteger(segments, 8, 600),
    iterations: clampInteger(iterations, 1, 3000),
    learningRate: Math.max(1e-4, learningRate),
    smoothness: Math.max(0, smoothness),
    xClustering: Math.max(1, Math.min(4, xClustering))
  };
}

function linearInterpolation(a: number, b: number, ratio: number): number {
  return a + (b - a) * ratio;
}

function buildXGrid(x0: number, x1: number, segments: number, xClustering: number): number[] {
  const span = x1 - x0;
  const x = new Array<number>(segments + 1);
  for (let i = 0; i <= segments; i += 1) {
    const ratio = i / segments;
    const clusteredRatio = Math.pow(ratio, xClustering);
    x[i] = x0 + span * clusteredRatio;
  }
  return x;
}

function travelTime(values: number[], xGrid: number[], g: number, yRef: number, eps: number): number {
  let total = 0;

  for (let i = 0; i < values.length - 1; i += 1) {
    const dx = xGrid[i + 1] - xGrid[i];
    const yA = Math.max(values[i], yRef + eps);
    const yB = Math.max(values[i + 1], yRef + eps);
    const dy = yB - yA;
    const ds = Math.hypot(dx, dy);
    const yMid = Math.max((yA + yB) / 2 - yRef, eps);
    const speed = Math.sqrt(2 * g * yMid);
    total += ds / speed;
  }

  return total;
}

function smoothingPenalty(values: number[]): number {
  let total = 0;
  for (let i = 1; i < values.length - 1; i += 1) {
    const secondDifference = values[i + 1] - 2 * values[i] + values[i - 1];
    total += secondDifference * secondDifference;
  }
  return total;
}

function boundaryCurvaturePenalty(values: number[]): number {
  if (values.length < 4) {
    return 0;
  }

  const n = values.length;
  const left = values[2] - 2 * values[1] + values[0];
  const right = values[n - 1] - 2 * values[n - 2] + values[n - 3];

  return left * left + right * right;
}

function objective(
  values: number[],
  xGrid: number[],
  g: number,
  yRef: number,
  eps: number,
  smoothness: number
): number {
  return travelTime(values, xGrid, g, yRef, eps) + smoothness * (smoothingPenalty(values) + 6 * boundaryCurvaturePenalty(values));
}

function projectMonotonic(values: number[], y0: number, y1: number, minY: number, monotonicStep: number): void {
  const last = values.length - 1;
  values[0] = y0;
  values[last] = y1;

  for (let i = 1; i < last; i += 1) {
    values[i] = Math.max(values[i], minY);
  }

  for (let i = 1; i < last; i += 1) {
    values[i] = Math.max(values[i], values[i - 1] + monotonicStep);
  }

  for (let i = last - 1; i >= 1; i -= 1) {
    values[i] = Math.min(values[i], values[i + 1] - monotonicStep);
  }

  for (let i = 1; i < last; i += 1) {
    values[i] = Math.max(values[i], minY);
  }

  values[0] = y0;
  values[last] = y1;
}

function solveBrachistochrone(rawParams: Record<string, number>): VariationalResult {
  const params = sanitizeParams(rawParams);
  const { x0, y0, x1, y1, g, segments, iterations, learningRate, smoothness, xClustering } = params;
  const eps = 1e-5;

  if (x1 <= x0 || y1 <= y0) {
    const points = [
      { x: x0, y: y0 },
      { x: x1, y: y1 }
    ];

    return {
      points,
      referencePoints: points,
      meta: {
        descentTime: Number.POSITIVE_INFINITY,
        straightLineTime: Number.POSITIVE_INFINITY,
        improvementPct: 0,
        valid: 0
      },
      series: {
        iteration: [0],
        time: [Number.POSITIVE_INFINITY]
      }
    };
  }

  const xGrid = buildXGrid(x0, x1, segments, xClustering);
  const minY = y0 + eps;
  const monotonicStep = Math.max(1e-9, Math.min(eps, (y1 - y0) / (4 * segments)));

  const values = xGrid.map((x, index) => {
    const ratio = (x - x0) / (x1 - x0);
    const baseline = linearInterpolation(y0, y1, ratio);
    const sag = 0.18 * (y1 - y0) * Math.sin(Math.PI * ratio);
    return Math.max(minY, baseline + sag);
  });

  values[0] = y0;
  values[values.length - 1] = y1;
  projectMonotonic(values, y0, y1, minY, monotonicStep);

  const history: number[] = [];

  for (let iter = 0; iter < iterations; iter += 1) {
    const currentTime = travelTime(values, xGrid, g, y0, eps);
    history.push(currentTime);

    const lr = learningRate / Math.sqrt(1 + iter * 0.05);
    const gradients = new Array<number>(values.length).fill(0);

    for (let i = 1; i < values.length - 1; i += 1) {
      const center = values[i];
      const h = 1e-4 * Math.max(1, Math.abs(center));

      values[i] = center + h;
      const plus = objective(values, xGrid, g, y0, eps, smoothness);

      values[i] = center - h;
      const minus = objective(values, xGrid, g, y0, eps, smoothness);

      values[i] = center;
      gradients[i] = (plus - minus) / (2 * h);
    }

    for (let i = 1; i < values.length - 1; i += 1) {
      values[i] = Math.max(minY, values[i] - lr * gradients[i]);
    }

    projectMonotonic(values, y0, y1, minY, monotonicStep);
  }

  const descentTime = travelTime(values, xGrid, g, y0, eps);
  const straightValues = xGrid.map((x) => linearInterpolation(y0, y1, (x - x0) / (x1 - x0)));
  const straightLineTime = travelTime(straightValues, xGrid, g, y0, eps);
  const improvementPct =
    Number.isFinite(straightLineTime) && straightLineTime > 0
      ? ((straightLineTime - descentTime) / straightLineTime) * 100
      : 0;

  return {
    points: xGrid.map((x, index) => ({ x, y: values[index] })),
    referencePoints: xGrid.map((x, index) => ({ x, y: straightValues[index] })),
    meta: {
      descentTime,
      straightLineTime,
      improvementPct,
      valid: 1
    },
    series: {
      iteration: history.map((_, index) => index + 1),
      time: history
    }
  };
}

export const brachistochroneSystem: VariationalSystem = {
  id: "brachistochrone",
  name: "Brachistochrone",
  mode: "variational",
  params: {
    x0: 0,
    y0: 0,
    x1: 2,
    y1: 1,
    g: 9.81,
    segments: 80,
    iterations: 240,
    learningRate: 0.03,
    smoothness: 0.001,
    xClustering: 1.6
  },
  solve: (p) => solveBrachistochrone(p),
  plotSpec: [],
  vizSpec: {
    type: "brachistochrone"
  }
};

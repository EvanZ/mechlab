export interface MuscleCurvePoint {
  l: number;
  f: number;
}

export type MuscleCurveTuple = [number, number];

export const muscleCurveBounds = {
  lMin: 0.5,
  lMax: 1.6,
  fMin: 0,
  fMax: 1.4
};

const defaultCurve: MuscleCurvePoint[] = [
  { l: 0.5, f: 0.15 },
  { l: 0.75, f: 0.72 },
  { l: 1.0, f: 1.0 },
  { l: 1.2, f: 0.82 },
  { l: 1.4, f: 0.45 },
  { l: 1.6, f: 0.2 }
];

export const defaultMuscleCurve: MuscleCurvePoint[] = defaultCurve.map((point) => ({ ...point }));

let activeCurve: MuscleCurvePoint[] = normalizeMuscleCurve(defaultMuscleCurve);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dedupeAndSort(input: MuscleCurvePoint[]): MuscleCurvePoint[] {
  const finite = input
    .map((point) => ({
      l: point.l,
      f: point.f
    }))
    .filter((point) => Number.isFinite(point.l) && Number.isFinite(point.f))
    .map((point) => ({
      l: clamp(point.l, muscleCurveBounds.lMin, muscleCurveBounds.lMax),
      f: clamp(point.f, muscleCurveBounds.fMin, muscleCurveBounds.fMax)
    }))
    .sort((a, b) => a.l - b.l);

  const deduped: MuscleCurvePoint[] = [];
  for (const point of finite) {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.l - point.l) < 1e-8) {
      deduped[deduped.length - 1] = point;
      continue;
    }
    deduped.push(point);
  }
  return deduped;
}

function sampleLinear(points: MuscleCurvePoint[], l: number): number {
  if (l <= points[0].l) {
    return points[0].f;
  }
  if (l >= points[points.length - 1].l) {
    return points[points.length - 1].f;
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const left = points[i];
    const right = points[i + 1];
    if (l <= right.l) {
      const span = Math.max(1e-9, right.l - left.l);
      const ratio = (l - left.l) / span;
      return left.f + ratio * (right.f - left.f);
    }
  }

  return points[points.length - 1].f;
}

function smooth(points: MuscleCurvePoint[], passes: number): MuscleCurvePoint[] {
  let current = points.map((point) => ({ ...point }));
  for (let pass = 0; pass < passes; pass += 1) {
    const next = current.map((point) => ({ ...point }));
    for (let i = 1; i < current.length - 1; i += 1) {
      next[i].f = clamp(
        0.25 * current[i - 1].f + 0.5 * current[i].f + 0.25 * current[i + 1].f,
        muscleCurveBounds.fMin,
        muscleCurveBounds.fMax
      );
    }
    current = next;
  }
  return current;
}

export function normalizeMuscleCurve(input: MuscleCurvePoint[], samples = 110): MuscleCurvePoint[] {
  const sorted = dedupeAndSort(input);

  if (sorted.length < 2) {
    return defaultMuscleCurve.map((point) => ({ ...point }));
  }

  const start = muscleCurveBounds.lMin;
  const end = muscleCurveBounds.lMax;
  const count = Math.max(20, Math.round(samples));
  const sampled: MuscleCurvePoint[] = [];

  for (let i = 0; i < count; i += 1) {
    const ratio = i / Math.max(1, count - 1);
    const l = start + ratio * (end - start);
    sampled.push({
      l,
      f: clamp(sampleLinear(sorted, l), muscleCurveBounds.fMin, muscleCurveBounds.fMax)
    });
  }

  return smooth(sampled, 1);
}

export function setActiveMuscleCurve(points: MuscleCurvePoint[]): void {
  activeCurve = normalizeMuscleCurve(points);
}

export function getActiveMuscleCurve(): MuscleCurvePoint[] {
  return activeCurve.map((point) => ({ ...point }));
}

export function muscleCurveFromTuples(points: MuscleCurveTuple[]): MuscleCurvePoint[] {
  return points.map(([l, f]) => ({ l, f }));
}

export function muscleCurveToTuples(points: MuscleCurvePoint[]): MuscleCurveTuple[] {
  return points.map((point) => [point.l, point.f]);
}

export function evaluateActiveMuscleForceScale(lengthNorm: number): number {
  return sampleLinear(activeCurve, clamp(lengthNorm, muscleCurveBounds.lMin, muscleCurveBounds.lMax));
}

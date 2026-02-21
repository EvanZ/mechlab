export interface HillPoint {
  x: number;
  y: number;
}

export type HillTuple = [number, number];

const defaultProfile: HillPoint[] = [
  { x: 0, y: 3.4 },
  { x: 1.2, y: 3.1 },
  { x: 2.6, y: 2.5 },
  { x: 4.3, y: 1.7 },
  { x: 6.2, y: 1.0 },
  { x: 8.0, y: 0.55 },
  { x: 9.2, y: 0.78 },
  { x: 10, y: 1.2 }
];

export const defaultHillProfile: HillPoint[] = defaultProfile.map((point) => ({ ...point }));

let activeProfile: HillPoint[] = normalizeHillProfile(defaultHillProfile);

function clampFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function dedupeAndSort(points: HillPoint[]): HillPoint[] {
  const finite = points
    .map((point) => ({
      x: clampFinite(point.x, Number.NaN),
      y: clampFinite(point.y, Number.NaN)
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.x - b.x);

  const deduped: HillPoint[] = [];

  for (const point of finite) {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.x - point.x) < 1e-7) {
      deduped[deduped.length - 1] = { x: point.x, y: point.y };
      continue;
    }
    deduped.push(point);
  }

  return deduped;
}

function sampleLinear(points: HillPoint[], x: number): number {
  if (x <= points[0].x) {
    return points[0].y;
  }
  if (x >= points[points.length - 1].x) {
    return points[points.length - 1].y;
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const left = points[i];
    const right = points[i + 1];

    if (x <= right.x) {
      const span = Math.max(1e-12, right.x - left.x);
      const ratio = (x - left.x) / span;
      return left.y + ratio * (right.y - left.y);
    }
  }

  return points[points.length - 1].y;
}

function smoothPoints(points: HillPoint[], passes: number): HillPoint[] {
  let current = points.map((point) => ({ ...point }));

  for (let pass = 0; pass < passes; pass += 1) {
    const next = current.map((point) => ({ ...point }));
    for (let i = 1; i < current.length - 1; i += 1) {
      next[i].y = 0.25 * current[i - 1].y + 0.5 * current[i].y + 0.25 * current[i + 1].y;
    }
    current = next;
  }

  return current;
}

export function normalizeHillProfile(input: HillPoint[], samples = 120): HillPoint[] {
  const sorted = dedupeAndSort(input);

  if (sorted.length < 2) {
    return defaultHillProfile.map((point) => ({ ...point }));
  }

  const xStart = sorted[0].x;
  const xEnd = sorted[sorted.length - 1].x;
  const span = xEnd - xStart;
  if (!(span > 1e-9)) {
    return defaultHillProfile.map((point) => ({ ...point }));
  }

  const count = Math.max(12, Math.round(samples));
  const resampled: HillPoint[] = [];

  for (let i = 0; i < count; i += 1) {
    const ratio = i / Math.max(1, count - 1);
    const x = xStart + ratio * span;
    resampled.push({
      x,
      y: sampleLinear(sorted, x)
    });
  }

  return smoothPoints(resampled, 2);
}

export function hillProfileFromTuples(points: HillTuple[]): HillPoint[] {
  return points.map(([x, y]) => ({ x, y }));
}

export function hillProfileToTuples(points: HillPoint[]): HillTuple[] {
  return points.map((point) => [point.x, point.y]);
}

export function setActiveHillProfile(points: HillPoint[]): void {
  activeProfile = normalizeHillProfile(points);
}

export function getActiveHillProfile(): HillPoint[] {
  return activeProfile.map((point) => ({ ...point }));
}

export function getActiveHillRange(): { xMin: number; xMax: number } {
  return {
    xMin: activeProfile[0].x,
    xMax: activeProfile[activeProfile.length - 1].x
  };
}

function segmentAtX(x: number): { left: HillPoint; right: HillPoint } {
  if (x <= activeProfile[0].x) {
    return { left: activeProfile[0], right: activeProfile[1] };
  }

  for (let i = 0; i < activeProfile.length - 1; i += 1) {
    const left = activeProfile[i];
    const right = activeProfile[i + 1];
    if (x <= right.x) {
      return { left, right };
    }
  }

  return {
    left: activeProfile[activeProfile.length - 2],
    right: activeProfile[activeProfile.length - 1]
  };
}

export function evaluateHillY(x: number): number {
  const { left, right } = segmentAtX(x);
  const span = Math.max(1e-12, right.x - left.x);
  const ratio = (x - left.x) / span;
  return left.y + ratio * (right.y - left.y);
}

export function evaluateHillSlope(x: number): number {
  const { left, right } = segmentAtX(x);
  const span = Math.max(1e-12, right.x - left.x);
  return (right.y - left.y) / span;
}

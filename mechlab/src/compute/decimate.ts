export interface DecimatedSeries {
  x: number[];
  y: number[];
}

export function strideSample<T>(values: T[], maxPoints: number): T[] {
  if (maxPoints < 2 || values.length <= maxPoints) {
    return [...values];
  }

  const step = Math.ceil(values.length / maxPoints);
  const sampled: T[] = [];

  for (let i = 0; i < values.length; i += step) {
    sampled.push(values[i]);
  }

  if (sampled[sampled.length - 1] !== values[values.length - 1]) {
    sampled.push(values[values.length - 1]);
  }

  return sampled;
}

export function decimateMinMax(x: number[], y: number[], maxPoints: number): DecimatedSeries {
  if (x.length !== y.length) {
    throw new Error("x and y arrays must have the same length.");
  }

  if (x.length <= maxPoints || maxPoints < 3) {
    return { x: [...x], y: [...y] };
  }

  const bucketCount = Math.max(1, Math.floor(maxPoints / 2));
  const startX: number[] = [x[0]];
  const startY: number[] = [y[0]];

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.floor((bucket * x.length) / bucketCount);
    const end = Math.min(x.length - 1, Math.floor(((bucket + 1) * x.length) / bucketCount));

    if (end <= start) {
      continue;
    }

    let minIndex = start;
    let maxIndex = start;

    for (let i = start + 1; i <= end; i += 1) {
      if (y[i] < y[minIndex]) {
        minIndex = i;
      }
      if (y[i] > y[maxIndex]) {
        maxIndex = i;
      }
    }

    if (minIndex < maxIndex) {
      startX.push(x[minIndex], x[maxIndex]);
      startY.push(y[minIndex], y[maxIndex]);
    } else if (maxIndex < minIndex) {
      startX.push(x[maxIndex], x[minIndex]);
      startY.push(y[maxIndex], y[minIndex]);
    } else {
      startX.push(x[minIndex]);
      startY.push(y[minIndex]);
    }
  }

  startX.push(x[x.length - 1]);
  startY.push(y[y.length - 1]);

  return { x: startX, y: startY };
}

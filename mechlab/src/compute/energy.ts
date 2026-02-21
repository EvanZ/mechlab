export function computeEnergySeries(
  states: number[][],
  params: Record<string, number>,
  energyFn?: (y: number[], p: Record<string, number>) => number
): number[] | undefined {
  if (!energyFn) {
    return undefined;
  }

  return states.map((state) => energyFn(state, params));
}

export function computeDerivedSeries(
  states: number[][],
  params: Record<string, number>,
  derivedFn?: (y: number[], p: Record<string, number>) => Record<string, number>
): Record<string, number[]> | undefined {
  if (!derivedFn) {
    return undefined;
  }

  const output: Record<string, number[]> = {};

  for (const state of states) {
    const values = derivedFn(state, params);
    for (const [key, value] of Object.entries(values)) {
      if (!output[key]) {
        output[key] = [];
      }
      output[key].push(value);
    }
  }

  return output;
}

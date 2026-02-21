<script setup lang="ts">
import { computed } from "vue";
import {
  doubleSlit2dGridFromParams,
  doubleSlit2dObservablesFromState,
  doubleSlit2dXAt,
  doubleSlit2dYAt
} from "../../systems/ode/doubleslit2d";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 460;
const height = 340;

const mainLeft = 28;
const mainRight = 16;
const mainTop = 14;
const mainBottom = 112;

const profileTop = height - 86;
const profileBottom = height - 26;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const state = computed(() => props.states[safeIndex.value] ?? []);
const cfg = computed(() => doubleSlit2dGridFromParams(props.params, state.value.length));

const xGrid = computed(() => {
  const values = new Array<number>(cfg.value.nx);
  for (let i = 0; i < cfg.value.nx; i += 1) {
    values[i] = doubleSlit2dXAt(i, cfg.value);
  }
  return values;
});

function nearestYIndex(targetY: number): number {
  let bestJ = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let j = 0; j < cfg.value.ny; j += 1) {
    const y = doubleSlit2dYAt(j, cfg.value);
    const distance = Math.abs(y - targetY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestJ = j;
    }
  }

  return bestJ;
}

const detectorJ = computed(() => nearestYIndex(cfg.value.detectorY));

const densityField = computed(() => {
  const nCells = cfg.value.nx * cfg.value.ny;
  const density = new Array<number>(nCells).fill(0);

  if (state.value.length === 0) {
    return density;
  }

  for (let idx = 0; idx < nCells; idx += 1) {
    const re = state.value[idx] ?? 0;
    const im = state.value[nCells + idx] ?? 0;
    density[idx] = re * re + im * im;
  }

  return density;
});

const fieldMax = computed(() => densityField.value.reduce((acc, value) => Math.max(acc, value), 1e-12));

function mapXMain(x: number): number {
  const ratio = (x - cfg.value.xMin) / (cfg.value.xMax - cfg.value.xMin || 1);
  return mainLeft + ratio * (width - mainLeft - mainRight);
}

function mapYMain(y: number): number {
  const ratio = (y - cfg.value.yMin) / (cfg.value.yMax - cfg.value.yMin || 1);
  return height - mainBottom - ratio * (height - mainTop - mainBottom);
}

function mapYProfile(value: number, maxValue: number): number {
  const ratio = value / (maxValue || 1);
  return profileBottom - ratio * (profileBottom - profileTop);
}

interface HeatCell {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

function colorForDensity(value: number, maxValue: number): string {
  const r = Math.min(1, Math.max(0, value / (maxValue || 1)));
  const hue = 220 - 175 * Math.sqrt(r);
  const saturation = 78;
  const lightness = 16 + 54 * Math.pow(r, 0.55);
  return `hsl(${hue.toFixed(1)} ${saturation}% ${lightness.toFixed(1)}%)`;
}

const heatCells = computed<HeatCell[]>(() => {
  const targetNx = 72;
  const targetNy = 80;

  const sx = Math.max(1, Math.floor(cfg.value.nx / targetNx));
  const sy = Math.max(1, Math.floor(cfg.value.ny / targetNy));

  const cells: HeatCell[] = [];

  for (let j = 0; j < cfg.value.ny; j += sy) {
    for (let i = 0; i < cfg.value.nx; i += sx) {
      let sum = 0;
      let count = 0;

      for (let jj = j; jj < Math.min(cfg.value.ny, j + sy); jj += 1) {
        for (let ii = i; ii < Math.min(cfg.value.nx, i + sx); ii += 1) {
          sum += densityField.value[jj * cfg.value.nx + ii] ?? 0;
          count += 1;
        }
      }

      const avg = count > 0 ? sum / count : 0;
      const x0 = doubleSlit2dXAt(i, cfg.value);
      const x1 = doubleSlit2dXAt(Math.min(cfg.value.nx - 1, i + sx), cfg.value);
      const y0 = doubleSlit2dYAt(j, cfg.value);
      const y1 = doubleSlit2dYAt(Math.min(cfg.value.ny - 1, j + sy), cfg.value);

      const px0 = mapXMain(x0);
      const px1 = mapXMain(x1);
      const py0 = mapYMain(y0);
      const py1 = mapYMain(y1);

      cells.push({
        x: Math.min(px0, px1),
        y: Math.min(py0, py1),
        w: Math.max(0.75, Math.abs(px1 - px0)),
        h: Math.max(0.75, Math.abs(py1 - py0)),
        fill: colorForDensity(avg, fieldMax.value)
      });
    }
  }

  return cells;
});

const detectorCurrent = computed(() => {
  const values = new Array<number>(cfg.value.nx).fill(0);
  const j = detectorJ.value;

  for (let i = 0; i < cfg.value.nx; i += 1) {
    values[i] = densityField.value[j * cfg.value.nx + i] ?? 0;
  }

  return values;
});

const detectorAccumulated = computed(() => {
  const values = new Array<number>(cfg.value.nx).fill(0);
  const nCells = cfg.value.nx * cfg.value.ny;
  const j = detectorJ.value;

  for (let s = 0; s <= safeIndex.value; s += 1) {
    const snapshot = props.states[s];
    if (!snapshot) {
      continue;
    }

    for (let i = 0; i < cfg.value.nx; i += 1) {
      const idx = j * cfg.value.nx + i;
      const re = snapshot[idx] ?? 0;
      const im = snapshot[nCells + idx] ?? 0;
      values[i] += re * re + im * im;
    }
  }

  return values;
});

const profileMax = computed(() => {
  const currentMax = detectorCurrent.value.reduce((acc, value) => Math.max(acc, value), 0);
  const accMax = detectorAccumulated.value.reduce((acc, value) => Math.max(acc, value), 0);
  return Math.max(1e-12, currentMax, accMax);
});

function pathFromProfile(values: number[]): string {
  if (values.length === 0) {
    return "";
  }

  const parts: string[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const x = mapXMain(xGrid.value[i]);
    const y = mapYProfile(values[i], profileMax.value);
    parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return parts.join(" ");
}

const detectorCurrentPath = computed(() => pathFromProfile(detectorCurrent.value));
const detectorAccumulatedPath = computed(() => pathFromProfile(detectorAccumulated.value));

const detectorLineY = computed(() => mapYMain(doubleSlit2dYAt(detectorJ.value, cfg.value)));

const barrierRects = computed(() => {
  const leftSlitCenter = -0.5 * cfg.value.slitSeparation;
  const rightSlitCenter = 0.5 * cfg.value.slitSeparation;
  const leftSlitStart = leftSlitCenter - 0.5 * cfg.value.slitWidth;
  const leftSlitEnd = leftSlitCenter + 0.5 * cfg.value.slitWidth;
  const rightSlitStart = rightSlitCenter - 0.5 * cfg.value.slitWidth;
  const rightSlitEnd = rightSlitCenter + 0.5 * cfg.value.slitWidth;

  const y0 = mapYMain(cfg.value.barrierY + 0.5 * cfg.value.barrierThickness);
  const y1 = mapYMain(cfg.value.barrierY - 0.5 * cfg.value.barrierThickness);

  const top = Math.min(y0, y1);
  const h = Math.max(1.2, Math.abs(y1 - y0));

  const segments = [
    { x0: cfg.value.xMin, x1: leftSlitStart },
    { x0: leftSlitEnd, x1: rightSlitStart },
    { x0: rightSlitEnd, x1: cfg.value.xMax }
  ];

  return segments
    .filter((segment) => segment.x1 > segment.x0)
    .map((segment) => {
      const x0 = mapXMain(segment.x0);
      const x1 = mapXMain(segment.x1);
      return {
        x: Math.min(x0, x1),
        y: top,
        w: Math.max(1, Math.abs(x1 - x0)),
        h
      };
    });
});

const observables = computed(() => {
  if (!state.value.length) {
    return null;
  }
  return doubleSlit2dObservablesFromState(state.value, props.params);
});
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <rect x="0" y="0" :width="width" :height="height" fill="#f7fbff" stroke="#cbd8ee" />

      <g class="field-frame">
        <rect
          :x="mainLeft"
          :y="mainTop"
          :width="width - mainLeft - mainRight"
          :height="height - mainTop - mainBottom"
          fill="#0b1220"
          opacity="0.98"
        />

        <rect
          v-for="(cell, idx) in heatCells"
          :key="idx"
          :x="cell.x"
          :y="cell.y"
          :width="cell.w"
          :height="cell.h"
          :fill="cell.fill"
        />

        <rect
          v-for="(segment, idx) in barrierRects"
          :key="`bar-${idx}`"
          :x="segment.x"
          :y="segment.y"
          :width="segment.w"
          :height="segment.h"
          class="barrier"
        />

        <line
          :x1="mainLeft"
          :y1="detectorLineY"
          :x2="width - mainRight"
          :y2="detectorLineY"
          class="detector-line"
        />
      </g>

      <g>
        <rect
          :x="mainLeft"
          :y="profileTop"
          :width="width - mainLeft - mainRight"
          :height="profileBottom - profileTop"
          fill="#ffffff"
          stroke="#cad7ec"
        />
        <path :d="detectorAccumulatedPath" class="detector-acc" />
        <path :d="detectorCurrentPath" class="detector-current" />
      </g>
    </svg>

    <div class="viz-meta">
      <span>2D density |psi(x,y)|^2</span>
      <span>Norm {{ (observables?.norm ?? 0).toFixed(4) }}</span>
      <span>Visibility {{ (observables?.detectorVisibility ?? 0).toFixed(3) }}</span>
      <span>P_trans {{ (observables?.transmittedProb ?? 0).toFixed(3) }}</span>
    </div>
  </div>
</template>

<style scoped>
.viz-wrap {
  width: 100%;
  max-width: 480px;
  display: grid;
  gap: 0.35rem;
}

.viz {
  width: 100%;
  height: auto;
}

.barrier {
  fill: #c4cedf;
  opacity: 0.9;
}

.detector-line {
  stroke: #f4f7ff;
  stroke-width: 0.9;
  stroke-dasharray: 4 3;
}

.detector-current {
  fill: none;
  stroke: #1f63cd;
  stroke-width: 1.5;
}

.detector-acc {
  fill: none;
  stroke: #cb6a21;
  stroke-width: 1.35;
}

.viz-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.7rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid #c8d6ec;
  border-radius: 8px;
  background: #f8fbff;
  font-size: 0.72rem;
  color: #2a3a56;
  line-height: 1.3;
}
</style>

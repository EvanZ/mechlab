<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 470;
const height = 330;

const gridLeft = 18;
const gridTop = 18;
const gridSizePx = 280;

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  const rounded = Math.round(finiteOr(value, fallback));
  return Math.max(min, Math.min(max, rounded));
}

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const packedState = computed(() => props.states[safeIndex.value] ?? []);

interface DecodedState {
  n: number;
  occupancy: number[];
  largestMask: number[];
  spanningMask: number[];
  occFrac: number;
  largestFrac: number;
  spanningFrac: number;
  spanFlag: number;
  clusterCount: number;
}

function emptyDecodedState(n: number): DecodedState {
  const cells = n * n;
  return {
    n,
    occupancy: new Array<number>(cells).fill(0),
    largestMask: new Array<number>(cells).fill(0),
    spanningMask: new Array<number>(cells).fill(0),
    occFrac: 0,
    largestFrac: 0,
    spanningFrac: 0,
    spanFlag: 0,
    clusterCount: 0
  };
}

const decoded = computed<DecodedState>(() => {
  const defaultN = clampInt(props.params.gridSize, 8, 80, 28);

  if (packedState.value.length === 0) {
    return emptyDecodedState(defaultN);
  }

  const n = clampInt(packedState.value[0], 8, 80, defaultN);
  const cells = n * n;
  const requiredLength = 1 + 3 * cells;

  if (packedState.value.length < requiredLength) {
    return emptyDecodedState(n);
  }

  let offset = 1;

  const occupancy = packedState.value.slice(offset, offset + cells).map((value) => (value >= 0.5 ? 1 : 0));
  offset += cells;

  const largestMask = packedState.value.slice(offset, offset + cells).map((value) => (value >= 0.5 ? 1 : 0));
  offset += cells;

  const spanningMask = packedState.value.slice(offset, offset + cells).map((value) => (value >= 0.5 ? 1 : 0));
  offset += cells;

  const occupiedCount = occupancy.reduce((acc, value) => acc + value, 0);
  const largestCount = largestMask.reduce((acc, value) => acc + value, 0);
  const spanningCount = spanningMask.reduce((acc, value) => acc + value, 0);
  const cellsSafe = Math.max(1, cells);

  return {
    n,
    occupancy,
    largestMask,
    spanningMask,
    occFrac: finiteOr(packedState.value[offset], occupiedCount / cellsSafe),
    largestFrac: finiteOr(packedState.value[offset + 1], largestCount / cellsSafe),
    spanningFrac: finiteOr(packedState.value[offset + 2], spanningCount / cellsSafe),
    spanFlag: finiteOr(packedState.value[offset + 3], spanningCount > 0 ? 1 : 0),
    clusterCount: finiteOr(packedState.value[offset + 4], 0)
  };
});

const cellSize = computed(() => gridSizePx / decoded.value.n);

interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

const cellRects = computed<CellRect[]>(() => {
  const rects: CellRect[] = [];
  const n = decoded.value.n;
  const cell = cellSize.value;

  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const idx = row * n + col;
      const occupied = decoded.value.occupancy[idx] === 1;
      const inLargest = decoded.value.largestMask[idx] === 1;
      const inSpanning = decoded.value.spanningMask[idx] === 1;

      let fill = "#f5f8ff";
      if (occupied) {
        fill = "#5579d9";
      }

      if (inLargest) {
        fill = "#f2a23c";
      }

      if (inSpanning) {
        fill = "#2ea25f";
      }

      rects.push({
        x: gridLeft + col * cell,
        y: gridTop + row * cell,
        w: Math.max(0.45, cell),
        h: Math.max(0.45, cell),
        fill
      });
    }
  }

  return rects;
});

const spanLabel = computed(() => (decoded.value.spanFlag >= 0.5 ? "Yes" : "No"));
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <defs>
        <linearGradient id="percBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f8fbff" />
          <stop offset="100%" stop-color="#eaf1ff" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" :width="width" :height="height" fill="url(#percBg)" stroke="#cbd8ed" />

      <rect
        :x="gridLeft"
        :y="gridTop"
        :width="gridSizePx"
        :height="gridSizePx"
        fill="#eef4ff"
        stroke="#b3c6e5"
      />

      <rect
        v-for="(cell, idx) in cellRects"
        :key="idx"
        :x="cell.x"
        :y="cell.y"
        :width="cell.w"
        :height="cell.h"
        :fill="cell.fill"
      />

      <text x="314" y="34" class="label">Legend</text>
      <rect x="315" y="44" width="12" height="12" fill="#f5f8ff" stroke="#97a9c7" />
      <text x="333" y="54" class="label">empty</text>
      <rect x="315" y="64" width="12" height="12" fill="#5579d9" />
      <text x="333" y="74" class="label">occupied</text>
      <rect x="315" y="84" width="12" height="12" fill="#f2a23c" />
      <text x="333" y="94" class="label">largest cluster</text>
      <rect x="315" y="104" width="12" height="12" fill="#2ea25f" />
      <text x="333" y="114" class="label">spanning cluster</text>

      <text x="314" y="142" class="label">N = {{ decoded.n }}</text>
      <text x="314" y="160" class="label">span (top-bottom): {{ spanLabel }}</text>
      <text x="314" y="178" class="label">occupied: {{ decoded.occFrac.toFixed(3) }}</text>
      <text x="314" y="196" class="label">largest/N: {{ decoded.largestFrac.toFixed(3) }}</text>
      <text x="314" y="214" class="label">spanning/N: {{ decoded.spanningFrac.toFixed(3) }}</text>
      <text x="314" y="232" class="label">clusters: {{ decoded.clusterCount.toFixed(1) }}</text>
    </svg>

    <div class="stats">
      <span>N {{ decoded.n }}</span>
      <span>span {{ spanLabel }}</span>
      <span>occupied {{ decoded.occFrac.toFixed(3) }}</span>
      <span>largest/N {{ decoded.largestFrac.toFixed(3) }}</span>
      <span>spanning/N {{ decoded.spanningFrac.toFixed(3) }}</span>
    </div>
  </div>
</template>

<style scoped>
.viz-wrap {
  width: 100%;
  max-width: 490px;
  display: grid;
  gap: 0.35rem;
}

.viz {
  width: 100%;
  height: auto;
}

.label {
  font-size: 11px;
  fill: #253452;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  font-size: 0.74rem;
  color: #334967;
}
</style>

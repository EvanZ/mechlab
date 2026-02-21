<script setup lang="ts">
import { computed } from "vue";
import {
  qftLatticeFromParams,
  qftLatticeObservablesFromState,
  qftLatticeXAt
} from "../../systems/ode/qftlattice";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 460;
const height = 320;

const profileLeft = 30;
const profileRight = 14;
const profileTop = 14;
const profileBottom = 178;

const historyTop = 208;
const historyBottom = 304;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const state = computed(() => props.states[safeIndex.value] ?? []);
const cfg = computed(() => qftLatticeFromParams(props.params, state.value.length));

const fieldSeries = computed(() => {
  if (!state.value.length) {
    return {
      x: [] as number[],
      phi: [] as number[],
      pi: [] as number[]
    };
  }

  const n = cfg.value.n;
  const x = new Array<number>(n);
  const phi = new Array<number>(n);
  const pi = new Array<number>(n);

  for (let i = 0; i < n; i += 1) {
    x[i] = qftLatticeXAt(i, cfg.value);
    phi[i] = state.value[i] ?? 0;
    pi[i] = state.value[n + i] ?? 0;
  }

  return { x, phi, pi };
});

const observables = computed(() => {
  if (!state.value.length) {
    return null;
  }

  return qftLatticeObservablesFromState(state.value, props.params);
});

const profileScale = computed(() => {
  const phiMax = fieldSeries.value.phi.reduce((acc, value) => Math.max(acc, Math.abs(value)), 0);
  const piMax = fieldSeries.value.pi.reduce((acc, value) => Math.max(acc, Math.abs(value)), 0);
  const maxAbs = Math.max(0.15, phiMax, piMax);
  return {
    min: -1.12 * maxAbs,
    max: 1.12 * maxAbs
  };
});

function mapX(x: number): number {
  const ratio = (x - cfg.value.xMin) / (cfg.value.xMax - cfg.value.xMin || 1);
  return profileLeft + ratio * (width - profileLeft - profileRight);
}

function mapYProfile(value: number): number {
  const ratio = (value - profileScale.value.min) / (profileScale.value.max - profileScale.value.min || 1);
  return profileBottom - ratio * (profileBottom - profileTop);
}

function pathFromSeries(x: number[], y: number[]): string {
  if (!x.length || !y.length || x.length !== y.length) {
    return "";
  }

  const parts: string[] = [];

  for (let i = 0; i < x.length; i += 1) {
    const px = mapX(x[i]);
    const py = mapYProfile(y[i]);
    parts.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)}`);
  }

  return parts.join(" ");
}

const phiPath = computed(() => pathFromSeries(fieldSeries.value.x, fieldSeries.value.phi));
const piPath = computed(() => pathFromSeries(fieldSeries.value.x, fieldSeries.value.pi));

function mapYHistory(row: number, rowCount: number): number {
  if (rowCount <= 1) {
    return historyTop;
  }
  const ratio = row / (rowCount - 1);
  return historyTop + ratio * (historyBottom - historyTop);
}

interface HeatCell {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

function colorForPhi(value: number, maxAbs: number): string {
  const norm = Math.max(-1, Math.min(1, value / (maxAbs || 1)));
  const hue = norm >= 0 ? 6 : 216;
  const sat = 76;
  const light = 14 + 55 * Math.pow(Math.abs(norm), 0.62);
  return `hsl(${hue} ${sat}% ${light.toFixed(1)}%)`;
}

const historyCells = computed<HeatCell[]>(() => {
  if (!props.states.length || !state.value.length) {
    return [];
  }

  const maxRows = 54;
  const maxCols = 84;

  const rowStep = Math.max(1, Math.floor((safeIndex.value + 1) / maxRows));
  const colStep = Math.max(1, Math.floor(cfg.value.n / maxCols));

  const rowIndices: number[] = [];
  for (let s = 0; s <= safeIndex.value; s += rowStep) {
    rowIndices.push(s);
  }
  if (rowIndices[rowIndices.length - 1] !== safeIndex.value) {
    rowIndices.push(safeIndex.value);
  }

  let maxAbsPhi = 1e-12;
  for (let r = 0; r < rowIndices.length; r += 1) {
    const snapshot = props.states[rowIndices[r]];
    for (let i = 0; i < cfg.value.n; i += colStep) {
      maxAbsPhi = Math.max(maxAbsPhi, Math.abs(snapshot?.[i] ?? 0));
    }
  }

  const cells: HeatCell[] = [];
  const profileWidth = width - profileLeft - profileRight;

  for (let r = 0; r < rowIndices.length; r += 1) {
    const snapshot = props.states[rowIndices[r]];
    const y0 = mapYHistory(r, rowIndices.length);
    const y1 = mapYHistory(Math.min(r + 1, rowIndices.length - 1), rowIndices.length);

    for (let i = 0; i < cfg.value.n; i += colStep) {
      const x0 = profileLeft + (i / Math.max(1, cfg.value.n - 1)) * profileWidth;
      const x1 =
        profileLeft +
        (Math.min(cfg.value.n - 1, i + colStep) / Math.max(1, cfg.value.n - 1)) * profileWidth;
      const phi = snapshot?.[i] ?? 0;

      cells.push({
        x: Math.min(x0, x1),
        y: Math.min(y0, y1),
        w: Math.max(0.8, Math.abs(x1 - x0)),
        h: Math.max(0.8, Math.abs(y1 - y0)),
        fill: colorForPhi(phi, maxAbsPhi)
      });
    }
  }

  return cells;
});
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <rect x="0" y="0" :width="width" :height="height" fill="#f7fbff" stroke="#cad8ee" />

      <rect
        :x="profileLeft"
        :y="profileTop"
        :width="width - profileLeft - profileRight"
        :height="profileBottom - profileTop"
        fill="#ffffff"
        stroke="#cad8ee"
      />

      <line
        :x1="profileLeft"
        :y1="mapYProfile(0)"
        :x2="width - profileRight"
        :y2="mapYProfile(0)"
        class="zero-line"
      />

      <path :d="piPath" class="pi-path" />
      <path :d="phiPath" class="phi-path" />

      <rect
        :x="profileLeft"
        :y="historyTop"
        :width="width - profileLeft - profileRight"
        :height="historyBottom - historyTop"
        fill="#0c1220"
        stroke="#cad8ee"
      />

      <rect
        v-for="(cell, idx) in historyCells"
        :key="idx"
        :x="cell.x"
        :y="cell.y"
        :width="cell.w"
        :height="cell.h"
        :fill="cell.fill"
      />

      <text x="10" y="16" class="label">phi(x) (blue), pi(x) (orange)</text>
      <text x="10" y="198" class="label">Spacetime history of phi(x,t)</text>
    </svg>

    <div class="viz-meta">
      <span>phi_center {{ (observables?.phiCenter ?? 0).toFixed(3) }}</span>
      <span>pi_center {{ (observables?.piCenter ?? 0).toFixed(3) }}</span>
      <span>peak |phi| {{ (observables?.peakAbsPhi ?? 0).toFixed(3) }}</span>
      <span>||phi||_2 {{ (observables?.fieldL2 ?? 0).toFixed(3) }}</span>
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

.zero-line {
  stroke: #b5c4dc;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.phi-path {
  fill: none;
  stroke: #1f64cf;
  stroke-width: 1.9;
}

.pi-path {
  fill: none;
  stroke: #cb6a20;
  stroke-width: 1.35;
}

.label {
  font-size: 11px;
  fill: #27384f;
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

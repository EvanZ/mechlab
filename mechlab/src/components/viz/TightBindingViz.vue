<script setup lang="ts">
import { computed } from "vue";
import {
  tightBindingFromParams,
  tightBindingObservablesFromState,
  tightBindingOnsiteArray
} from "../../systems/ode/tightbinding";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 460;
const height = 320;

const topLeft = 30;
const topRight = 16;
const topTop = 14;
const topBottom = 186;

const historyTop = 214;
const historyBottom = 304;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const state = computed(() => props.states[safeIndex.value] ?? []);
const cfg = computed(() => tightBindingFromParams(props.params, state.value.length));

const profile = computed(() => {
  if (!state.value.length) {
    return {
      prob: [] as number[]
    };
  }

  const n = cfg.value.n;
  const prob = new Array<number>(n);

  for (let i = 0; i < n; i += 1) {
    const re = state.value[i] ?? 0;
    const im = state.value[n + i] ?? 0;
    prob[i] = re * re + im * im;
  }

  return { prob };
});

const onsite = computed(() => tightBindingOnsiteArray(props.params, state.value.length));

const observables = computed(() => {
  if (!state.value.length) {
    return null;
  }
  return tightBindingObservablesFromState(state.value, props.params);
});

const topScale = computed(() => {
  const pMax = profile.value.prob.reduce((acc, value) => Math.max(acc, value), 1e-10);
  const vMin = onsite.value.length ? Math.min(...onsite.value) : -1;
  const vMax = onsite.value.length ? Math.max(...onsite.value) : 1;
  const vSpan = Math.max(1e-8, vMax - vMin);

  return {
    pMax,
    vMin,
    vSpan
  };
});

function mapXSite(i: number): number {
  const ratio = i / Math.max(1, cfg.value.n - 1);
  return topLeft + ratio * (width - topLeft - topRight);
}

function mapYProb(p: number): number {
  const ratio = p / (topScale.value.pMax * 1.12 || 1);
  return topBottom - ratio * (topBottom - topTop);
}

function mapYOnsite(v: number): number {
  const norm = (v - topScale.value.vMin) / topScale.value.vSpan;
  const target = norm * topScale.value.pMax * 0.78;
  return mapYProb(target);
}

function pathFromProfile(values: number[], mapY: (value: number) => number): string {
  if (!values.length) {
    return "";
  }

  const parts: string[] = [];

  for (let i = 0; i < values.length; i += 1) {
    const x = mapXSite(i);
    const y = mapY(values[i]);
    parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return parts.join(" ");
}

const probPath = computed(() => pathFromProfile(profile.value.prob, mapYProb));
const onsitePath = computed(() => pathFromProfile(onsite.value, mapYOnsite));

const meanLineX = computed(() => {
  const mean = observables.value?.meanSite ?? 0;
  const clamped = Math.max(0, Math.min(cfg.value.n - 1, mean));
  return mapXSite(clamped);
});

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

function colorForProb(p: number, maxP: number): string {
  const r = Math.max(0, Math.min(1, p / (maxP || 1)));
  const hue = 212 - 162 * Math.sqrt(r);
  const sat = 78;
  const light = 13 + 58 * Math.pow(r, 0.58);
  return `hsl(${hue.toFixed(1)} ${sat}% ${light.toFixed(1)}%)`;
}

const historyCells = computed<HeatCell[]>(() => {
  if (!props.states.length || !state.value.length) {
    return [];
  }

  const maxRows = 56;
  const rowStep = Math.max(1, Math.floor((safeIndex.value + 1) / maxRows));

  const rowIndices: number[] = [];
  for (let s = 0; s <= safeIndex.value; s += rowStep) {
    rowIndices.push(s);
  }
  if (rowIndices[rowIndices.length - 1] !== safeIndex.value) {
    rowIndices.push(safeIndex.value);
  }

  const colStep = Math.max(1, Math.floor(cfg.value.n / 96));
  const n = cfg.value.n;

  let maxP = 1e-12;

  for (let r = 0; r < rowIndices.length; r += 1) {
    const snapshot = props.states[rowIndices[r]];
    for (let i = 0; i < n; i += colStep) {
      const re = snapshot?.[i] ?? 0;
      const im = snapshot?.[n + i] ?? 0;
      const p = re * re + im * im;
      maxP = Math.max(maxP, p);
    }
  }

  const cells: HeatCell[] = [];

  for (let r = 0; r < rowIndices.length; r += 1) {
    const snapshot = props.states[rowIndices[r]];

    const y0 = mapYHistory(r, rowIndices.length);
    const y1 = mapYHistory(Math.min(r + 1, rowIndices.length - 1), rowIndices.length);

    for (let i = 0; i < n; i += colStep) {
      const re = snapshot?.[i] ?? 0;
      const im = snapshot?.[n + i] ?? 0;
      const p = re * re + im * im;

      const x0 = mapXSite(i);
      const x1 = mapXSite(Math.min(n - 1, i + colStep));

      cells.push({
        x: Math.min(x0, x1),
        y: Math.min(y0, y1),
        w: Math.max(0.8, Math.abs(x1 - x0)),
        h: Math.max(0.8, Math.abs(y1 - y0)),
        fill: colorForProb(p, maxP)
      });
    }
  }

  return cells;
});
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <rect x="0" y="0" :width="width" :height="height" fill="#f8fbff" stroke="#cbd9ee" />

      <rect
        :x="topLeft"
        :y="topTop"
        :width="width - topLeft - topRight"
        :height="topBottom - topTop"
        fill="#ffffff"
        stroke="#cad8ec"
      />

      <line
        :x1="topLeft"
        :y1="mapYProb(0)"
        :x2="width - topRight"
        :y2="mapYProb(0)"
        class="zero-line"
      />
      <line :x1="meanLineX" :y1="topTop" :x2="meanLineX" :y2="topBottom" class="mean-line" />

      <path :d="onsitePath" class="onsite" />
      <path :d="probPath" class="prob" />

      <rect
        :x="topLeft"
        :y="historyTop"
        :width="width - topLeft - topRight"
        :height="historyBottom - historyTop"
        fill="#0d1525"
        stroke="#cad8ec"
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

      <text x="10" y="16" class="label">Site probability |psi_n|^2 (blue), onsite energy (orange)</text>
      <text x="10" y="208" class="label">Spacetime probability map n vs t</text>
    </svg>

    <div class="viz-meta">
      <span>Norm {{ (observables?.norm ?? 0).toFixed(4) }}</span>
      <span>&lt;n&gt; {{ (observables?.meanSite ?? 0).toFixed(2) }}</span>
      <span>Spread {{ (observables?.spread ?? 0).toFixed(2) }}</span>
      <span>IPR {{ (observables?.ipr ?? 0).toFixed(3) }}</span>
      <span>P_right {{ (observables?.rightProb ?? 0).toFixed(3) }}</span>
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
  stroke: #b6c5dc;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.mean-line {
  stroke: #3f63a3;
  stroke-width: 1;
  stroke-dasharray: 5 3;
}

.prob {
  fill: none;
  stroke: #1f63ce;
  stroke-width: 2;
}

.onsite {
  fill: none;
  stroke: #c9641f;
  stroke-width: 1.35;
  stroke-dasharray: 4 3;
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

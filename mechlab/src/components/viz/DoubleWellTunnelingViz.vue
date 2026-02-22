<script setup lang="ts">
import { computed } from "vue";
import {
  doubleWellGridFromParams,
  doubleWellObservablesFromState,
  doubleWellPotentialAtX,
  doubleWellXAt
} from "../../systems/ode/doublewell";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 460;
const height = 315;
const padLeft = 34;
const padRight = 16;
const padTop = 14;
const padBottom = 126;

const barHeight = 12;
const barWidth = 170;
const barYStart = height - 58;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const state = computed(() => props.states[safeIndex.value] ?? []);
const cfg = computed(() => doubleWellGridFromParams(props.params, state.value.length));

const densityData = computed(() => {
  if (!state.value.length) {
    return { x: [] as number[], rho: [] as number[] };
  }

  const n = cfg.value.n;
  const re = state.value.slice(0, n);
  const im = state.value.slice(n);

  const x = new Array<number>(n);
  const rho = new Array<number>(n);

  for (let i = 0; i < n; i += 1) {
    x[i] = doubleWellXAt(i, cfg.value);
    rho[i] = re[i] * re[i] + im[i] * im[i];
  }

  return { x, rho };
});

const potentialData = computed(() => {
  const x = new Array<number>(cfg.value.n);
  const v = new Array<number>(cfg.value.n);

  for (let i = 0; i < cfg.value.n; i += 1) {
    const xi = doubleWellXAt(i, cfg.value);
    x[i] = xi;
    v[i] = doubleWellPotentialAtX(xi, cfg.value);
  }

  return { x, v };
});

const observables = computed(() => {
  if (!state.value.length) {
    return null;
  }

  return doubleWellObservablesFromState(state.value, props.params);
});

const yScale = computed(() => {
  const rhoMax = densityData.value.rho.reduce((acc, value) => Math.max(acc, value), 1e-9);
  const vAbsMax = potentialData.value.v.reduce((acc, value) => Math.max(acc, Math.abs(value)), 0);
  const vScale = vAbsMax > 1e-10 ? (0.8 * rhoMax) / vAbsMax : 0;
  const vScaled = potentialData.value.v.map((value) => value * vScale);

  const minY = Math.min(0, ...vScaled);
  const maxY = Math.max(1e-6, rhoMax * 1.12, ...vScaled);

  return { minY, maxY, vScale };
});

function mapX(x: number): number {
  const ratio = (x - cfg.value.xMin) / (cfg.value.xMax - cfg.value.xMin || 1);
  return padLeft + ratio * (width - padLeft - padRight);
}

function mapY(y: number): number {
  const ratio = (y - yScale.value.minY) / (yScale.value.maxY - yScale.value.minY || 1);
  return height - padBottom - ratio * (height - padTop - padBottom);
}

function pathFromSeries(x: number[], y: number[]): string {
  if (!x.length || !y.length || x.length !== y.length) {
    return "";
  }

  const parts: string[] = [];

  for (let i = 0; i < x.length; i += 1) {
    const px = mapX(x[i]);
    const py = mapY(y[i]);
    parts.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)}`);
  }

  return parts.join(" ");
}

const densityPath = computed(() => pathFromSeries(densityData.value.x, densityData.value.rho));
const potentialPath = computed(() =>
  pathFromSeries(
    potentialData.value.x,
    potentialData.value.v.map((value) => value * yScale.value.vScale)
  )
);

const splitX = computed(() => mapX(0));
const leftFillWidth = computed(() => barWidth * Math.max(0, Math.min(1, observables.value?.leftProb ?? 0)));
const rightFillWidth = computed(() => barWidth * Math.max(0, Math.min(1, observables.value?.rightProb ?? 0)));
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <rect x="0" y="0" :width="width" :height="height" fill="#f8fbff" stroke="#cbdaee" />

      <rect
        :x="padLeft"
        :y="padTop"
        :width="width - padLeft - padRight"
        :height="height - padTop - padBottom"
        fill="#ffffff"
        stroke="#cad8ec"
      />

      <line :x1="padLeft" :y1="mapY(0)" :x2="width - padRight" :y2="mapY(0)" class="zero-line" />
      <line :x1="splitX" :y1="padTop" :x2="splitX" :y2="height - padBottom" class="split-line" />

      <path :d="potentialPath" class="potential" />
      <path :d="densityPath" class="density" />

      <text x="10" y="16" class="label">|psi|^2 (blue), V(x) scaled (orange)</text>

      <text :x="padLeft" :y="barYStart - 10" class="label">Left well occupancy</text>
      <rect :x="padLeft" :y="barYStart" :width="barWidth" :height="barHeight" class="bar-track" />
      <rect :x="padLeft" :y="barYStart" :width="leftFillWidth" :height="barHeight" class="bar-left" />

      <text :x="width - padRight - barWidth" :y="barYStart - 10" class="label">Right well occupancy</text>
      <rect :x="width - padRight - barWidth" :y="barYStart" :width="barWidth" :height="barHeight" class="bar-track" />
      <rect
        :x="width - padRight - barWidth"
        :y="barYStart"
        :width="rightFillWidth"
        :height="barHeight"
        class="bar-right"
      />
    </svg>

    <div class="viz-meta">
      <span>Norm {{ (observables?.norm ?? 0).toFixed(4) }}</span>
      <span>P_L {{ (observables?.leftProb ?? 0).toFixed(3) }}</span>
      <span>P_R {{ (observables?.rightProb ?? 0).toFixed(3) }}</span>
      <span>Imbalance {{ (observables?.imbalance ?? 0).toFixed(3) }}</span>
      <span>&lt;x&gt; {{ (observables?.xMean ?? 0).toFixed(3) }}</span>
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
  stroke: #b7c6de;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.split-line {
  stroke: #5a76aa;
  stroke-width: 1;
  stroke-dasharray: 5 4;
}

.density {
  fill: none;
  stroke: #1f63ce;
  stroke-width: 2;
}

.potential {
  fill: none;
  stroke: #c8611d;
  stroke-width: 1.7;
}

.bar-track {
  fill: #edf2fb;
  stroke: #c5d3ea;
}

.bar-left {
  fill: #326dd6;
}

.bar-right {
  fill: #20915d;
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

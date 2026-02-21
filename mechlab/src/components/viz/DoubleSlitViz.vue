<script setup lang="ts">
import { computed } from "vue";
import {
  doubleSlitGridFromParams,
  doubleSlitObservablesFromState,
  doubleSlitXAt
} from "../../systems/ode/doubleslit";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 430;
const height = 280;
const padLeft = 36;
const padRight = 16;
const padTop = 16;
const padBottom = 28;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const state = computed(() => props.states[safeIndex.value] ?? []);
const cfg = computed(() => doubleSlitGridFromParams(props.params, state.value.length));

const xGrid = computed(() => {
  const x = new Array<number>(cfg.value.n);
  for (let i = 0; i < cfg.value.n; i += 1) {
    x[i] = doubleSlitXAt(i, cfg.value);
  }
  return x;
});

const currentProfile = computed(() => {
  if (state.value.length === 0) {
    return {
      x: [] as number[],
      y: [] as number[]
    };
  }

  const n = cfg.value.n;
  const y = new Array<number>(n);

  for (let i = 0; i < n; i += 1) {
    const re = state.value[i] ?? 0;
    const im = state.value[n + i] ?? 0;
    y[i] = re * re + im * im;
  }

  return { x: xGrid.value, y };
});

const screenProfile = computed(() => {
  if (!props.states.length) {
    return {
      x: [] as number[],
      y: [] as number[]
    };
  }

  const n = cfg.value.n;
  const y = new Array<number>(n).fill(0);

  for (let j = 0; j < props.states.length; j += 1) {
    const snapshot = props.states[j];
    for (let i = 0; i < n; i += 1) {
      const sr = snapshot?.[i] ?? 0;
      const si = snapshot?.[n + i] ?? 0;
      y[i] += sr * sr + si * si;
    }
  }

  return { x: xGrid.value, y };
});

const observables = computed(() => {
  if (state.value.length === 0) {
    return null;
  }
  return doubleSlitObservablesFromState(state.value, props.params);
});

const yMax = computed(() => {
  const currentMax = currentProfile.value.y.reduce((acc, value) => Math.max(acc, value), 0);
  const screenMax = screenProfile.value.y.reduce((acc, value) => Math.max(acc, value), 0);
  return Math.max(1e-8, currentMax, screenMax);
});

function mapX(x: number): number {
  const ratio = (x - cfg.value.xMin) / (cfg.value.xMax - cfg.value.xMin || 1);
  return padLeft + ratio * (width - padLeft - padRight);
}

function mapY(y: number): number {
  const ratio = y / yMax.value;
  return height - padBottom - ratio * (height - padTop - padBottom);
}

function pathFromSeries(x: number[], y: number[]): string {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
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

const currentPath = computed(() => pathFromSeries(currentProfile.value.x, currentProfile.value.y));
const screenPath = computed(() => pathFromSeries(screenProfile.value.x, screenProfile.value.y));

const slitLeftX = computed(() => mapX(-0.5 * (cfg.value.slitSeparation ?? 0)));
const slitRightX = computed(() => mapX(0.5 * (cfg.value.slitSeparation ?? 0)));
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <defs>
      <linearGradient id="dsBg" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#f8fbff" />
        <stop offset="100%" stop-color="#edf3ff" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" :width="width" :height="height" fill="url(#dsBg)" stroke="#ccdaef" />

    <line :x1="padLeft" :y1="height - padBottom" :x2="width - padRight" :y2="height - padBottom" class="axis" />
    <line :x1="padLeft" :y1="padTop" :x2="padLeft" :y2="height - padBottom" class="axis" />

    <line :x1="slitLeftX" :y1="padTop" :x2="slitLeftX" :y2="height - padBottom" class="slit" />
    <line :x1="slitRightX" :y1="padTop" :x2="slitRightX" :y2="height - padBottom" class="slit" />

    <path :d="screenPath" class="screen" />
    <path :d="currentPath" class="current" />

    <text x="10" y="16" class="label">Current intensity (blue) + accumulated screen (orange)</text>
    <text x="10" y="31" class="label">Norm {{ (observables?.norm ?? 0).toFixed(4) }}</text>
    <text x="10" y="46" class="label">Center {{ (observables?.centerDensity ?? 0).toFixed(3) }}</text>
    <text x="10" y="61" class="label">Visibility {{ (observables?.visibility ?? 0).toFixed(3) }}</text>
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 450px;
  height: auto;
}

.axis {
  stroke: #6f82a3;
  stroke-width: 1.1;
}

.slit {
  stroke: #94a5c5;
  stroke-width: 1;
  stroke-dasharray: 4 3;
}

.current {
  fill: none;
  stroke: #1e62c9;
  stroke-width: 2.1;
}

.screen {
  fill: none;
  stroke: #cf6a1f;
  stroke-width: 1.6;
}

.label {
  font-size: 11px;
  fill: #20314f;
}
</style>

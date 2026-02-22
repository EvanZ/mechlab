<script setup lang="ts">
import { computed } from "vue";
import { wave2dFromParams, wave2dObservablesFromState } from "../../systems/ode/wave2d";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 460;
const height = 330;

const fieldLeft = 24;
const fieldTop = 16;
const fieldWidth = 290;
const fieldHeight = 290;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const state = computed(() => props.states[safeIndex.value] ?? []);
const cfg = computed(() => wave2dFromParams(props.params, state.value.length));

const field = computed(() => {
  const nCells = cfg.value.nx * cfg.value.ny;
  return state.value.length >= nCells ? state.value.slice(0, nCells) : [];
});

const observables = computed(() => {
  if (!state.value.length) {
    return null;
  }
  return wave2dObservablesFromState(state.value, props.params);
});

function mapXWorld(x: number): number {
  const ratio = (x - cfg.value.xMin) / (cfg.value.xMax - cfg.value.xMin || 1);
  return fieldLeft + ratio * fieldWidth;
}

function mapYWorld(y: number): number {
  const ratio = (y - cfg.value.yMin) / (cfg.value.yMax - cfg.value.yMin || 1);
  return fieldTop + (1 - ratio) * fieldHeight;
}

interface HeatCell {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

function colorForHeight(value: number, maxAbs: number): string {
  const normalized = clamp(value / (maxAbs || 1), -1, 1);
  const magnitude = Math.pow(Math.abs(normalized), 0.72);

  if (normalized >= 0) {
    const hue = 22;
    const sat = 82;
    const light = 92 - 58 * magnitude;
    return `hsl(${hue} ${sat}% ${light.toFixed(1)}%)`;
  }

  const hue = 208;
  const sat = 80;
  const light = 92 - 58 * magnitude;
  return `hsl(${hue} ${sat}% ${light.toFixed(1)}%)`;
}

const heatCells = computed<HeatCell[]>(() => {
  if (!field.value.length) {
    return [];
  }

  const stepX = Math.max(1, Math.floor(cfg.value.nx / 64));
  const stepY = Math.max(1, Math.floor(cfg.value.ny / 64));

  let maxAbs = 1e-9;

  for (let j = 0; j < cfg.value.ny; j += stepY) {
    for (let i = 0; i < cfg.value.nx; i += stepX) {
      const idx = j * cfg.value.nx + i;
      maxAbs = Math.max(maxAbs, Math.abs(field.value[idx] ?? 0));
    }
  }

  const cells: HeatCell[] = [];

  for (let j = 0; j < cfg.value.ny; j += stepY) {
    const y0World = cfg.value.yMin + (j / cfg.value.ny) * (cfg.value.yMax - cfg.value.yMin);
    const y1World =
      cfg.value.yMin + (Math.min(cfg.value.ny, j + stepY) / cfg.value.ny) * (cfg.value.yMax - cfg.value.yMin);

    for (let i = 0; i < cfg.value.nx; i += stepX) {
      const x0World = cfg.value.xMin + (i / cfg.value.nx) * (cfg.value.xMax - cfg.value.xMin);
      const x1World =
        cfg.value.xMin + (Math.min(cfg.value.nx, i + stepX) / cfg.value.nx) * (cfg.value.xMax - cfg.value.xMin);

      const idx = j * cfg.value.nx + i;
      const value = field.value[idx] ?? 0;

      const x0 = mapXWorld(x0World);
      const x1 = mapXWorld(x1World);
      const yTop = mapYWorld(y1World);
      const yBottom = mapYWorld(y0World);

      cells.push({
        x: Math.min(x0, x1),
        y: Math.min(yTop, yBottom),
        w: Math.max(0.8, Math.abs(x1 - x0)),
        h: Math.max(0.8, Math.abs(yBottom - yTop)),
        fill: colorForHeight(value, maxAbs)
      });
    }
  }

  return cells;
});

const dropX = computed(() => mapXWorld(Number.isFinite(props.params.dropX0) ? props.params.dropX0 : 0));
const dropY = computed(() => mapYWorld(Number.isFinite(props.params.dropY0) ? props.params.dropY0 : 0));

const rmsRadiusPx = computed(() => {
  const r = observables.value?.rmsRadius ?? 0;
  const scaleX = fieldWidth / (cfg.value.xMax - cfg.value.xMin || 1);
  const scaleY = fieldHeight / (cfg.value.yMax - cfg.value.yMin || 1);
  const scale = 0.5 * (scaleX + scaleY);
  return r * scale;
});
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <defs>
        <linearGradient id="lakeBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f7fbff" />
          <stop offset="100%" stop-color="#e6f0ff" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" :width="width" :height="height" fill="url(#lakeBg)" stroke="#c9d8ef" />

      <rect
        :x="fieldLeft"
        :y="fieldTop"
        :width="fieldWidth"
        :height="fieldHeight"
        fill="#edf3ff"
        stroke="#adc0df"
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

      <circle :cx="dropX" :cy="dropY" r="3" class="drop-marker" />
      <circle v-if="rmsRadiusPx > 1" :cx="dropX" :cy="dropY" :r="rmsRadiusPx" class="wavefront" />

      <text x="12" y="16" class="label">2D surface height field h(x,y,t)</text>
      <text x="326" y="34" class="label">Stone</text>
      <circle cx="318" cy="30" r="4.4" class="legend-stone" />
      <text x="326" y="52" class="label">RMS front</text>
      <line x1="313" y1="49" x2="322" y2="49" class="legend-front" />
    </svg>

    <div class="viz-meta">
      <span>h_center {{ (observables?.centerEta ?? 0).toFixed(3) }}</span>
      <span>peak |h| {{ (observables?.peakAbsEta ?? 0).toFixed(3) }}</span>
      <span>mean |h| {{ (observables?.meanAbsEta ?? 0).toFixed(3) }}</span>
      <span>r_rms {{ (observables?.rmsRadius ?? 0).toFixed(3) }}</span>
      <span>v_rms {{ (observables?.rmsSpeed ?? 0).toFixed(3) }}</span>
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

.drop-marker {
  fill: #13243f;
  stroke: #c8d7f0;
  stroke-width: 0.9;
}

.wavefront {
  fill: none;
  stroke: #f0f5ff;
  stroke-width: 1.2;
  stroke-dasharray: 4 3;
  opacity: 0.95;
}

.legend-stone {
  fill: #13243f;
  stroke: #c8d7f0;
  stroke-width: 0.9;
}

.legend-front {
  stroke: #f0f5ff;
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}

.label {
  font-size: 11px;
  fill: #20314f;
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

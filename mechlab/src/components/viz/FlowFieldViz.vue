<script setup lang="ts">
import { computed } from "vue";
import { strideSample } from "../../compute/decimate";
import { flowFieldVelocity } from "../../systems/ode/flowfield";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 420;
const height = 300;
const pad = 22;
const gridCols = 15;
const gridRows = 11;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const current = computed(() => props.states[safeIndex.value] ?? [0, 0]);

const bounds = computed(() => {
  const all = props.states.length > 0 ? props.states : [[-2, -1.5], [2, 1.5]];
  const xs = all.map((state) => state[0] ?? 0);
  const ys = all.map((state) => state[1] ?? 0);

  let xMin = Math.min(...xs, -2);
  let xMax = Math.max(...xs, 2);
  let yMin = Math.min(...ys, -1.5);
  let yMax = Math.max(...ys, 1.5);

  const span = Math.max(xMax - xMin, yMax - yMin, 1e-6);
  const cx = 0.5 * (xMin + xMax);
  const cy = 0.5 * (yMin + yMax);

  xMin = cx - 0.58 * span;
  xMax = cx + 0.58 * span;
  yMin = cy - 0.58 * span;
  yMax = cy + 0.58 * span;

  return { xMin, xMax, yMin, yMax };
});

function mapX(x: number): number {
  const ratio = (x - bounds.value.xMin) / (bounds.value.xMax - bounds.value.xMin || 1);
  return pad + ratio * (width - 2 * pad);
}

function mapY(y: number): number {
  const ratio = (y - bounds.value.yMin) / (bounds.value.yMax - bounds.value.yMin || 1);
  return height - pad - ratio * (height - 2 * pad);
}

interface FlowVector {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const vectors = computed<FlowVector[]>(() => {
  const list: FlowVector[] = [];
  const xSpan = bounds.value.xMax - bounds.value.xMin;
  const ySpan = bounds.value.yMax - bounds.value.yMin;

  const samples: Array<{ x: number; y: number; u: number; v: number }> = [];

  for (let row = 0; row < gridRows; row += 1) {
    const yr = row / Math.max(1, gridRows - 1);
    const y = bounds.value.yMin + (1 - yr) * ySpan;

    for (let col = 0; col < gridCols; col += 1) {
      const xr = col / Math.max(1, gridCols - 1);
      const x = bounds.value.xMin + xr * xSpan;
      const { u, v } = flowFieldVelocity(x, y, props.params);

      if (Number.isFinite(u) && Number.isFinite(v)) {
        samples.push({ x, y, u, v });
      }
    }
  }

  const maxMag = samples.reduce((acc, sample) => Math.max(acc, Math.hypot(sample.u, sample.v)), 1e-9);
  const target = 0.45 * Math.min(xSpan / Math.max(1, gridCols - 1), ySpan / Math.max(1, gridRows - 1));
  const scale = target / maxMag;

  for (const sample of samples) {
    const x2 = sample.x + sample.u * scale;
    const y2 = sample.y + sample.v * scale;

    list.push({
      x1: mapX(sample.x),
      y1: mapY(sample.y),
      x2: mapX(x2),
      y2: mapY(y2)
    });
  }

  return list;
});

const trailPath = computed(() => {
  const sampledTrail = strideSample(props.states.slice(0, safeIndex.value + 1), 1400);
  if (sampledTrail.length === 0) {
    return "";
  }

  return sampledTrail
    .map((state, index) => {
      const x = mapX(state[0] ?? 0);
      const y = mapY(state[1] ?? 0);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
});

const currentX = computed(() => mapX(current.value[0] ?? 0));
const currentY = computed(() => mapY(current.value[1] ?? 0));
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <defs>
      <linearGradient id="flowBg" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#f4f9ff" />
        <stop offset="100%" stop-color="#e5f0ff" />
      </linearGradient>
      <marker id="flow-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
        <path d="M0,0 L7,3.5 L0,7 z" fill="#8aa0c6" />
      </marker>
    </defs>

    <rect x="0" y="0" :width="width" :height="height" fill="url(#flowBg)" stroke="#ccd8ea" />

    <line :x1="pad" :y1="height - pad" :x2="width - pad" :y2="height - pad" class="axis" />
    <line :x1="pad" :y1="pad" :x2="pad" :y2="height - pad" class="axis" />

    <line
      v-for="(vector, index) in vectors"
      :key="`vec-${index}`"
      :x1="vector.x1"
      :y1="vector.y1"
      :x2="vector.x2"
      :y2="vector.y2"
      class="field"
      marker-end="url(#flow-arrow)"
    />

    <path :d="trailPath" class="trail" />
    <circle :cx="currentX" :cy="currentY" r="6" class="particle" />
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 440px;
  height: auto;
}

.axis {
  stroke: #6f82a3;
  stroke-width: 1.1;
}

.field {
  stroke: #8aa0c6;
  stroke-width: 1;
  opacity: 0.9;
}

.trail {
  fill: none;
  stroke: #1f6feb;
  stroke-width: 2;
}

.particle {
  fill: #da4a4a;
  stroke: #8a2424;
  stroke-width: 1;
}
</style>

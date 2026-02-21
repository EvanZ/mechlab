<script setup lang="ts">
import { computed } from "vue";
import { strideSample } from "../../compute/decimate";

const props = defineProps<{
  states: number[][];
  index: number;
}>();

const width = 360;
const height = 260;
const pad = 24;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const current = computed(() => props.states[safeIndex.value] ?? [0, 0]);

const bounds = computed(() => {
  const all = props.states.length > 0 ? props.states : [[0, 0]];
  const xs = all.map((state) => state[0] ?? 0);
  const ys = all.map((state) => state[1] ?? 0);

  const xMin = Math.min(...xs, 0);
  const xMax = Math.max(...xs, 1);
  const yMin = Math.min(...ys, 0);
  const yMax = Math.max(...ys, 1);

  const xSpan = Math.max(1e-6, xMax - xMin);
  const ySpan = Math.max(1e-6, yMax - yMin);

  return {
    xMin: xMin - xSpan * 0.05,
    xMax: xMax + xSpan * 0.05,
    yMin: yMin - ySpan * 0.05,
    yMax: yMax + ySpan * 0.05
  };
});

function mapX(x: number): number {
  const { xMin, xMax } = bounds.value;
  const ratio = (x - xMin) / (xMax - xMin || 1);
  return pad + ratio * (width - 2 * pad);
}

function mapY(y: number): number {
  const { yMin, yMax } = bounds.value;
  const ratio = (y - yMin) / (yMax - yMin || 1);
  return height - pad - ratio * (height - 2 * pad);
}

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

const currentCx = computed(() => mapX(current.value[0] ?? 0));
const currentCy = computed(() => mapY(current.value[1] ?? 0));
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <rect x="0" y="0" :width="width" :height="height" fill="#fbfdff" stroke="#ccd8ea" />

    <line :x1="pad" :y1="height - pad" :x2="width - pad" :y2="height - pad" class="axis" />
    <line :x1="pad" :y1="height - pad" :x2="pad" :y2="pad" class="axis" />

    <path :d="trailPath" class="trail" />
    <circle :cx="currentCx" :cy="currentCy" r="6" class="body" />
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 420px;
  height: auto;
}

.axis {
  stroke: #6b7a95;
  stroke-width: 1.2;
}

.trail {
  fill: none;
  stroke: #1f6feb;
  stroke-width: 2;
}

.body {
  fill: #d94848;
}
</style>

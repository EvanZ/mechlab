<script setup lang="ts">
import { computed } from "vue";
import { strideSample } from "../../compute/decimate";

const props = defineProps<{
  states: number[][];
  index: number;
}>();

const width = 360;
const height = 300;
const pad = 20;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const current = computed(() => props.states[safeIndex.value] ?? [1, 0]);

const bounds = computed(() => {
  const all = props.states.length > 0 ? props.states : [[-1, -1], [1, 1]];
  const xs = all.map((state) => state[0] ?? 0);
  const ys = all.map((state) => state[1] ?? 0);

  let xMin = Math.min(...xs, -1);
  let xMax = Math.max(...xs, 1);
  let yMin = Math.min(...ys, -1);
  let yMax = Math.max(...ys, 1);

  const span = Math.max(xMax - xMin, yMax - yMin, 1e-6);
  const cx = (xMin + xMax) / 2;
  const cy = (yMin + yMax) / 2;

  xMin = cx - span / 2;
  xMax = cx + span / 2;
  yMin = cy - span / 2;
  yMax = cy + span / 2;

  return {
    xMin: xMin - span * 0.08,
    xMax: xMax + span * 0.08,
    yMin: yMin - span * 0.08,
    yMax: yMax + span * 0.08
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
const centerCx = computed(() => mapX(0));
const centerCy = computed(() => mapY(0));
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <rect x="0" y="0" :width="width" :height="height" fill="#fbfdff" stroke="#ccd8ea" />

    <path :d="trailPath" class="trail" />
    <circle :cx="centerCx" :cy="centerCy" r="10" class="primary" />
    <circle :cx="currentCx" :cy="currentCy" r="5" class="satellite" />
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 420px;
  height: auto;
}

.trail {
  fill: none;
  stroke: #1f6feb;
  stroke-width: 1.8;
}

.primary {
  fill: #e0a400;
  stroke: #886200;
  stroke-width: 1;
}

.satellite {
  fill: #2f5fc0;
}
</style>

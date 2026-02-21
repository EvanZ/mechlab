<script setup lang="ts">
import { computed } from "vue";
import { strideSample } from "../../compute/decimate";
import type { HillPoint } from "../../systems/ode/hillProfile";

const props = defineProps<{
  states: number[][];
  index: number;
  hillProfile: HillPoint[];
}>();

const width = 430;
const height = 280;
const pad = 22;

const safeIndex = computed(() =>
  Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1)))
);
const current = computed(() => props.states[safeIndex.value] ?? [0, 0]);

const bounds = computed(() => {
  const xs = props.hillProfile.map((point) => point.x);
  const ys = props.hillProfile.map((point) => point.y);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const xPad = Math.max(0.4, 0.08 * (xMax - xMin));
  const yPad = Math.max(0.25, 0.18 * (yMax - yMin));

  return {
    xMin: xMin - xPad,
    xMax: xMax + xPad,
    yMin: Math.min(0, yMin - yPad),
    yMax: yMax + yPad
  };
});

function mapX(x: number): number {
  const ratio = (x - bounds.value.xMin) / (bounds.value.xMax - bounds.value.xMin || 1);
  return pad + ratio * (width - 2 * pad);
}

function mapY(y: number): number {
  const ratio = (y - bounds.value.yMin) / (bounds.value.yMax - bounds.value.yMin || 1);
  return height - pad - ratio * (height - 2 * pad);
}

function sampleYFromProfile(x: number): number {
  if (props.hillProfile.length === 0) {
    return 0;
  }
  if (props.hillProfile.length === 1) {
    return props.hillProfile[0].y;
  }

  if (x <= props.hillProfile[0].x) {
    return props.hillProfile[0].y;
  }

  for (let i = 0; i < props.hillProfile.length - 1; i += 1) {
    const left = props.hillProfile[i];
    const right = props.hillProfile[i + 1];
    if (x <= right.x) {
      const span = Math.max(1e-12, right.x - left.x);
      const ratio = (x - left.x) / span;
      return left.y + ratio * (right.y - left.y);
    }
  }

  return props.hillProfile[props.hillProfile.length - 1].y;
}

const hillPath = computed(() => {
  if (props.hillProfile.length < 2) {
    return "";
  }

  return props.hillProfile
    .map((point, index) => `${index === 0 ? "M" : "L"}${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`)
    .join(" ");
});

const trailPath = computed(() => {
  const sampled = strideSample(props.states.slice(0, safeIndex.value + 1), 1600);
  if (sampled.length < 2) {
    return "";
  }

  return sampled
    .map((state, index) => {
      const x = state[0] ?? 0;
      const y = sampleYFromProfile(x);
      return `${index === 0 ? "M" : "L"}${mapX(x).toFixed(2)} ${mapY(y).toFixed(2)}`;
    })
    .join(" ");
});

const skierX = computed(() => mapX(current.value[0] ?? 0));
const skierY = computed(() => mapY(sampleYFromProfile(current.value[0] ?? 0)));
const speed = computed(() => current.value[1] ?? 0);
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <defs>
      <linearGradient id="skiSky" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#f2f8ff" />
        <stop offset="100%" stop-color="#dfeeff" />
      </linearGradient>
      <linearGradient id="snowFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#fbfeff" />
        <stop offset="100%" stop-color="#ebf3ff" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" :width="width" :height="height" fill="url(#skiSky)" stroke="#cbd8ea" />

    <path :d="hillPath" class="hill-snow" />
    <path :d="trailPath" class="trail" />
    <circle :cx="skierX" :cy="skierY - 1" r="6" class="skier" />

    <text x="10" y="16" class="label">v_t = {{ speed.toFixed(3) }}</text>
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 450px;
  height: auto;
}

.hill-snow {
  fill: none;
  stroke: #24457c;
  stroke-width: 3;
}

.trail {
  fill: none;
  stroke: #f08b2f;
  stroke-width: 1.8;
}

.skier {
  fill: #d74c4c;
  stroke: #8a2323;
  stroke-width: 1.2;
}

.label {
  font-size: 12px;
  fill: #1e2f4c;
}
</style>

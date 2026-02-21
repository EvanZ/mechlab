<script setup lang="ts">
import { computed } from "vue";
import { strideSample } from "../../compute/decimate";

const props = defineProps<{
  states: number[][];
  index: number;
}>();

const width = 400;
const height = 280;
const pad = 20;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const current = computed(() => props.states[safeIndex.value] ?? [0, 0, 0, 0]);

const bounds = computed(() => {
  const all = props.states.length > 0 ? props.states : [[-0.2, -1], [0.2, 0.2]];
  const xs = all.map((state) => state[0] ?? 0);
  const ys = all.map((state) => state[1] ?? 0);

  const xMin = Math.min(...xs, -0.2);
  const xMax = Math.max(...xs, 0.2);
  const yMin = Math.min(...ys, -1);
  const yMax = Math.max(...ys, 0.2);

  const xSpan = Math.max(1e-6, xMax - xMin);
  const ySpan = Math.max(1e-6, yMax - yMin);

  return {
    xMin: xMin - 0.12 * xSpan,
    xMax: xMax + 0.12 * xSpan,
    yMin: yMin - 0.12 * ySpan,
    yMax: yMax + 0.12 * ySpan
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

const speed = computed(() => Math.hypot(current.value[2] ?? 0, current.value[3] ?? 0));
const vy = computed(() => current.value[3] ?? 0);
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <defs>
      <linearGradient id="fluidBg" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#f2f8ff" />
        <stop offset="100%" stop-color="#dcecff" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" :width="width" :height="height" fill="url(#fluidBg)" stroke="#ccd8ea" />

    <line :x1="pad" :y1="height - pad" :x2="width - pad" :y2="height - pad" class="axis" />
    <line :x1="pad" :y1="pad" :x2="pad" :y2="height - pad" class="axis" />

    <path :d="trailPath" class="trail" />
    <circle :cx="currentX" :cy="currentY" r="7" class="particle" />

    <text x="12" y="16" class="label">speed = {{ speed.toFixed(3) }}</text>
    <text x="12" y="31" class="label">vy = {{ vy.toFixed(3) }}</text>
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 430px;
  height: auto;
}

.axis {
  stroke: #7083a3;
  stroke-width: 1.2;
}

.trail {
  fill: none;
  stroke: #1f6feb;
  stroke-width: 2;
}

.particle {
  fill: #dd4a4a;
  stroke: #992929;
  stroke-width: 1;
}

.label {
  font-size: 11px;
  fill: #21314d;
}
</style>

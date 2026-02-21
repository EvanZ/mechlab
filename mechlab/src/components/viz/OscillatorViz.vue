<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  x: number;
  seriesX: number[];
}>();

const width = 360;
const height = 220;
const railY = 120;
const anchorX = 38;
const restMassX = 210;

const amplitude = computed(() => {
  const maxValue = props.seriesX.reduce((acc, value) => Math.max(acc, Math.abs(value)), 1);
  return Math.max(0.2, maxValue);
});

const massX = computed(() => restMassX + (props.x / amplitude.value) * 95);

const springPath = computed(() => {
  const turns = 10;
  const startX = anchorX;
  const endX = massX.value - 20;
  const span = Math.max(20, endX - startX);
  const step = span / turns;

  const points: string[] = [`M ${startX} ${railY}`];

  for (let i = 1; i <= turns; i += 1) {
    const xPos = startX + step * i;
    const yPos = i % 2 === 0 ? railY - 10 : railY + 10;
    points.push(`L ${xPos.toFixed(2)} ${yPos.toFixed(2)}`);
  }

  points.push(`L ${(endX + 1).toFixed(2)} ${railY.toFixed(2)}`);

  return points.join(" ");
});
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <rect x="0" y="0" :width="width" :height="height" fill="#fbfdff" stroke="#ccd8ea" />

    <line :x1="20" :y1="railY + 26" :x2="340" :y2="railY + 26" class="ground" />
    <line :x1="anchorX" :y1="railY - 26" :x2="anchorX" :y2="railY + 26" class="wall" />

    <path :d="springPath" class="spring" />
    <rect :x="massX - 20" :y="railY - 20" width="40" height="40" class="mass" />

    <text x="16" y="18" class="label">x = {{ x.toFixed(3) }}</text>
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 420px;
  height: auto;
}

.ground {
  stroke: #9aaccc;
  stroke-width: 3;
}

.wall {
  stroke: #334b77;
  stroke-width: 6;
}

.spring {
  stroke: #1f6feb;
  stroke-width: 2.2;
  fill: none;
}

.mass {
  fill: #2e5ca8;
  stroke: #1d3a69;
  stroke-width: 1.5;
  rx: 4;
}

.label {
  font-size: 12px;
  fill: #1d2a44;
}
</style>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    states: number[][];
    index: number;
    l?: number;
  }>(),
  {
    l: 0.7
  }
);

const width = 400;
const height = 260;
const groundY = 200;
const cartWidth = 62;
const cartHeight = 32;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const current = computed(() => props.states[safeIndex.value] ?? [0, 0, 0, 0]);

const xRange = computed(() => {
  const xValues = props.states.length > 0 ? props.states.map((state) => state[0] ?? 0) : [0];
  const minX = Math.min(...xValues, -1);
  const maxX = Math.max(...xValues, 1);

  const span = Math.max(1, maxX - minX);
  return {
    minX: minX - 0.2 * span,
    maxX: maxX + 0.2 * span
  };
});

function mapX(x: number): number {
  const ratio = (x - xRange.value.minX) / (xRange.value.maxX - xRange.value.minX || 1);
  return 36 + ratio * (width - 72);
}

const cartX = computed(() => mapX(current.value[0] ?? 0));
const theta = computed(() => current.value[2] ?? 0);

const poleTip = computed(() => {
  const px = cartX.value + props.l * 90 * Math.sin(theta.value);
  const py = groundY - cartHeight / 2 - props.l * 90 * Math.cos(theta.value);

  return {
    x: px,
    y: py
  };
});
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <rect x="0" y="0" :width="width" :height="height" fill="#fbfdff" stroke="#ccd8ea" />

    <line x1="24" :y1="groundY + cartHeight / 2" :x2="width - 24" :y2="groundY + cartHeight / 2" class="ground" />

    <rect
      :x="cartX - cartWidth / 2"
      :y="groundY - cartHeight / 2"
      :width="cartWidth"
      :height="cartHeight"
      class="cart"
    />

    <line :x1="cartX" :y1="groundY - cartHeight / 2" :x2="poleTip.x" :y2="poleTip.y" class="pole" />
    <circle :cx="poleTip.x" :cy="poleTip.y" r="8" class="bob" />

    <text x="12" y="18" class="label">theta = {{ theta.toFixed(3) }}</text>
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 430px;
  height: auto;
}

.ground {
  stroke: #8ea4c7;
  stroke-width: 3;
}

.cart {
  fill: #325f9e;
  stroke: #1f3d69;
  stroke-width: 1.4;
  rx: 5;
}

.pole {
  stroke: #2f466e;
  stroke-width: 3;
}

.bob {
  fill: #1f6feb;
}

.label {
  font-size: 12px;
  fill: #1d2a44;
}
</style>

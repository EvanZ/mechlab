<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    theta: number;
    length?: number;
  }>(),
  {
    length: 1
  }
);

const width = 320;
const height = 320;
const pivotX = width / 2;
const pivotY = 28;

const radius = computed(() => {
  const scale = 110 / Math.max(0.2, props.length);
  return Math.max(35, Math.min(130, scale * props.length));
});

const bob = computed(() => {
  const x = pivotX + radius.value * Math.sin(props.theta);
  const y = pivotY + radius.value * Math.cos(props.theta);
  return { x, y };
});
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <rect x="0" y="0" :width="width" :height="height" fill="#fbfdff" stroke="#ccd8ea" />
    <line :x1="pivotX" :y1="pivotY" :x2="bob.x" :y2="bob.y" class="rod" />
    <circle :cx="pivotX" :cy="pivotY" r="5" class="pivot" />
    <circle :cx="bob.x" :cy="bob.y" r="14" class="bob" />
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 420px;
  height: auto;
}

.rod {
  stroke: #344d83;
  stroke-width: 3;
}

.pivot {
  fill: #263d67;
}

.bob {
  fill: #1f6feb;
}
</style>

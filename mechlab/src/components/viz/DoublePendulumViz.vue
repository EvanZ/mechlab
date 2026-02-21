<script setup lang="ts">
import { computed } from "vue";
import { strideSample } from "../../compute/decimate";

const props = withDefaults(
  defineProps<{
    states: number[][];
    index: number;
    l1?: number;
    l2?: number;
  }>(),
  {
    l1: 1,
    l2: 1
  }
);

const width = 380;
const height = 320;
const pivotX = width / 2;
const pivotY = 34;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const current = computed(() => props.states[safeIndex.value] ?? [0, 0, 0, 0]);

const worldRadius = computed(() => Math.max(0.2, props.l1 + props.l2));
const pxPerUnit = computed(() => 125 / worldRadius.value);

function mapWorld(x: number, y: number): { x: number; y: number } {
  return {
    x: pivotX + x * pxPerUnit.value,
    y: pivotY + y * pxPerUnit.value
  };
}

function positions(state: number[]): { bob1: { x: number; y: number }; bob2: { x: number; y: number } } {
  const theta1 = state[0] ?? 0;
  const theta2 = state[2] ?? 0;

  const x1 = props.l1 * Math.sin(theta1);
  const y1 = props.l1 * Math.cos(theta1);
  const x2 = x1 + props.l2 * Math.sin(theta2);
  const y2 = y1 + props.l2 * Math.cos(theta2);

  return {
    bob1: mapWorld(x1, y1),
    bob2: mapWorld(x2, y2)
  };
}

const currentPose = computed(() => positions(current.value));

const trailPath = computed(() => {
  const sampledTrail = strideSample(props.states.slice(0, safeIndex.value + 1), 1600);
  if (sampledTrail.length === 0) {
    return "";
  }

  return sampledTrail
    .map((state, index) => {
      const pos = positions(state).bob2;
      return `${index === 0 ? "M" : "L"}${pos.x.toFixed(2)} ${pos.y.toFixed(2)}`;
    })
    .join(" ");
});
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <rect x="0" y="0" :width="width" :height="height" fill="#fbfdff" stroke="#ccd8ea" />

    <path :d="trailPath" class="trail" />

    <circle :cx="pivotX" :cy="pivotY" r="4" class="pivot" />
    <line :x1="pivotX" :y1="pivotY" :x2="currentPose.bob1.x" :y2="currentPose.bob1.y" class="rod" />
    <line
      :x1="currentPose.bob1.x"
      :y1="currentPose.bob1.y"
      :x2="currentPose.bob2.x"
      :y2="currentPose.bob2.y"
      class="rod"
    />

    <circle :cx="currentPose.bob1.x" :cy="currentPose.bob1.y" r="7" class="bob1" />
    <circle :cx="currentPose.bob2.x" :cy="currentPose.bob2.y" r="8" class="bob2" />
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 430px;
  height: auto;
}

.trail {
  fill: none;
  stroke: #7ea5e8;
  stroke-width: 1.4;
}

.pivot {
  fill: #223b65;
}

.rod {
  stroke: #2d4f86;
  stroke-width: 2.5;
}

.bob1 {
  fill: #3f74c8;
}

.bob2 {
  fill: #1f6feb;
}
</style>

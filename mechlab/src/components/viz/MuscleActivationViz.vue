<script setup lang="ts">
import { computed } from "vue";
import { evaluateActiveMuscleForceScale } from "../../systems/ode/muscleCurve";

const props = defineProps<{
  states: number[][];
  index: number;
}>();

const width = 400;
const height = 240;
const anchorX = 52;
const railY = 126;

const safeIndex = computed(() =>
  Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1)))
);
const current = computed(() => props.states[safeIndex.value] ?? [1, 0, 0]);

const lengthNorm = computed(() => current.value[0] ?? 1);
const speed = computed(() => current.value[1] ?? 0);
const activation = computed(() => Math.max(0, Math.min(1, current.value[2] ?? 0)));
const curveScale = computed(() => evaluateActiveMuscleForceScale(lengthNorm.value));

const massX = computed(() => {
  const clamped = Math.max(0.5, Math.min(1.6, lengthNorm.value));
  const ratio = (clamped - 0.5) / 1.1;
  return 160 + ratio * 170;
});

const springPath = computed(() => {
  const turns = 10;
  const startX = anchorX;
  const endX = massX.value - 22;
  const span = Math.max(20, endX - startX);
  const step = span / turns;

  const points: string[] = [`M ${startX} ${railY}`];

  for (let i = 1; i <= turns; i += 1) {
    const xPos = startX + step * i;
    const yPos = i % 2 === 0 ? railY - 12 : railY + 12;
    points.push(`L ${xPos.toFixed(2)} ${yPos.toFixed(2)}`);
  }

  return points.join(" ");
});

const activationBarHeight = computed(() => 130 * activation.value);
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <defs>
      <linearGradient id="muscleBg" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#fffaf4" />
        <stop offset="100%" stop-color="#ffefe2" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" :width="width" :height="height" fill="url(#muscleBg)" stroke="#e5cdb9" />

    <line x1="20" :y1="railY + 28" x2="378" :y2="railY + 28" class="ground" />
    <line :x1="anchorX" :y1="railY - 38" :x2="anchorX" :y2="railY + 32" class="anchor" />

    <path :d="springPath" class="spring" />
    <rect :x="massX - 24" :y="railY - 20" width="48" height="40" class="mass" />

    <rect x="16" y="20" width="16" height="130" class="bar-bg" />
    <rect
      x="16"
      :y="20 + (130 - activationBarHeight)"
      width="16"
      :height="activationBarHeight"
      class="bar-active"
    />
    <text x="12" y="166" class="small">a</text>

    <text x="44" y="22" class="label">l = {{ lengthNorm.toFixed(3) }}</text>
    <text x="44" y="38" class="label">v = {{ speed.toFixed(3) }}</text>
    <text x="44" y="54" class="label">a = {{ activation.toFixed(3) }}</text>
    <text x="44" y="70" class="label">f_l(l) = {{ curveScale.toFixed(3) }}</text>
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 420px;
  height: auto;
}

.ground {
  stroke: #b58a6c;
  stroke-width: 2.5;
}

.anchor {
  stroke: #7e5236;
  stroke-width: 6;
}

.spring {
  fill: none;
  stroke: #d66f25;
  stroke-width: 2.3;
}

.mass {
  fill: #b95a2a;
  stroke: #6e3114;
  stroke-width: 1.5;
  rx: 4;
}

.bar-bg {
  fill: #f2dfd0;
  stroke: #c89d80;
  stroke-width: 1;
}

.bar-active {
  fill: #d9534f;
}

.label {
  font-size: 12px;
  fill: #4d2d1c;
}

.small {
  font-size: 11px;
  fill: #4d2d1c;
}
</style>

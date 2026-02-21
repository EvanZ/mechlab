<script setup lang="ts">
import { computed } from "vue";
import { strideSample } from "../../compute/decimate";
import { compilePotentialExpression } from "../../systems/ode/potentialExpression";

const props = defineProps<{
  states: number[][];
  index: number;
  expression: string;
  mass: number;
}>();

const width = 420;
const height = 280;
const pad = 28;
const sampleCount = 240;

const safeIndex = computed(() =>
  Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1)))
);
const currentState = computed(() => props.states[safeIndex.value] ?? [0, 0]);

const evaluator = computed(() => {
  try {
    return {
      fn: compilePotentialExpression(props.expression),
      error: ""
    };
  } catch (error) {
    return {
      fn: null,
      error: error instanceof Error ? error.message : "Invalid V(x)"
    };
  }
});

const xBounds = computed(() => {
  const xs = props.states
    .map((state) => state[0] ?? Number.NaN)
    .filter((value) => Number.isFinite(value));

  if (xs.length === 0) {
    return { min: -2, max: 2 };
  }

  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const span = Math.max(1e-6, max - min);
  const margin = Math.max(0.8, 0.3 * span);

  return { min: min - margin, max: max + margin };
});

const sampledPotential = computed(() => {
  if (!evaluator.value.fn) {
    return [] as Array<{ x: number; v: number }>;
  }

  const evalPotential = evaluator.value.fn;
  const points: Array<{ x: number; v: number }> = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const ratio = i / Math.max(1, sampleCount - 1);
    const x = xBounds.value.min + ratio * (xBounds.value.max - xBounds.value.min);
    let v: number;
    try {
      v = evalPotential(x);
    } catch {
      continue;
    }
    if (Number.isFinite(v)) {
      points.push({ x, v });
    }
  }
  return points;
});

const yBounds = computed(() => {
  const ys = sampledPotential.value.map((point) => point.v).filter((value) => Number.isFinite(value));

  if (ys.length === 0) {
    return { min: -1, max: 1 };
  }

  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = Math.max(1e-6, max - min);
  const margin = Math.max(0.5, 0.18 * span);
  return { min: min - margin, max: max + margin };
});

function mapX(x: number): number {
  const ratio = (x - xBounds.value.min) / (xBounds.value.max - xBounds.value.min || 1);
  return pad + ratio * (width - 2 * pad);
}

function mapY(y: number): number {
  const ratio = (y - yBounds.value.min) / (yBounds.value.max - yBounds.value.min || 1);
  return height - pad - ratio * (height - 2 * pad);
}

const potentialPath = computed(() => {
  if (sampledPotential.value.length < 2) {
    return "";
  }

  return sampledPotential.value
    .map((point, index) => `${index === 0 ? "M" : "L"}${mapX(point.x).toFixed(2)} ${mapY(point.v).toFixed(2)}`)
    .join(" ");
});

const sampledStates = computed(() => strideSample(props.states.slice(0, safeIndex.value + 1), 1200));

const trailPath = computed(() => {
  if (!evaluator.value.fn || sampledStates.value.length < 2) {
    return "";
  }

  const evalPotential = evaluator.value.fn;
  const segments: string[] = [];
  let hasStarted = false;

  for (const state of sampledStates.value) {
    const x = state[0] ?? 0;
    let potential: number;
    try {
      potential = evalPotential(x);
    } catch {
      hasStarted = false;
      continue;
    }

    const cmd = hasStarted ? "L" : "M";
    segments.push(`${cmd}${mapX(x).toFixed(2)} ${mapY(potential).toFixed(2)}`);
    hasStarted = true;
  }

  return segments.join(" ");
});

const currentPoint = computed(() => {
  if (!evaluator.value.fn) {
    return { x: width / 2, y: height / 2, potential: 0 };
  }

  const evalPotential = evaluator.value.fn;
  const x = currentState.value[0] ?? 0;
  let potential = 0;
  try {
    potential = evalPotential(x);
  } catch {
    return { x: mapX(x), y: height / 2, potential: 0 };
  }

  return {
    x: mapX(x),
    y: mapY(potential),
    potential
  };
});

const energyLevel = computed(() => {
  if (!evaluator.value.fn) {
    return null;
  }

  const evalPotential = evaluator.value.fn;
  const x = currentState.value[0] ?? 0;
  const v = currentState.value[1] ?? 0;
  const mass = Math.max(1e-8, props.mass);
  let potential: number;
  try {
    potential = evalPotential(x);
  } catch {
    return null;
  }
  return 0.5 * mass * v * v + potential;
});

const energyY = computed(() => (energyLevel.value === null ? null : mapY(energyLevel.value)));
const axisY0 = computed(() =>
  yBounds.value.min <= 0 && yBounds.value.max >= 0 ? mapY(0) : null
);
const axisX0 = computed(() =>
  xBounds.value.min <= 0 && xBounds.value.max >= 0 ? mapX(0) : null
);
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <defs>
      <linearGradient id="potentialBg" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#f9fbff" />
        <stop offset="100%" stop-color="#edf4ff" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" :width="width" :height="height" fill="url(#potentialBg)" stroke="#ccd8ea" />

    <line :x1="pad" :y1="height - pad" :x2="width - pad" :y2="height - pad" class="axis" />
    <line :x1="pad" :y1="pad" :x2="pad" :y2="height - pad" class="axis" />

    <line v-if="axisY0 !== null" :x1="pad" :y1="axisY0" :x2="width - pad" :y2="axisY0" class="guide" />
    <line v-if="axisX0 !== null" :x1="axisX0" :y1="pad" :x2="axisX0" :y2="height - pad" class="guide" />

    <path :d="potentialPath" class="potential" />
    <path :d="trailPath" class="trail" />
    <line
      v-if="energyY !== null"
      :x1="pad"
      :y1="energyY"
      :x2="width - pad"
      :y2="energyY"
      class="energy"
    />
    <circle :cx="currentPoint.x" :cy="currentPoint.y" r="6" class="particle" />

    <text x="10" y="16" class="label">x = {{ (currentState[0] ?? 0).toFixed(3) }}</text>
    <text x="10" y="31" class="label">v = {{ (currentState[1] ?? 0).toFixed(3) }}</text>
    <text v-if="energyLevel !== null" x="10" y="46" class="label">E = {{ energyLevel.toFixed(3) }}</text>
    <text x="10" y="height - 10" class="expr">V(x) = {{ expression }}</text>

    <text v-if="evaluator.error" x="10" y="62" class="error">{{ evaluator.error }}</text>
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 440px;
  height: auto;
}

.axis {
  stroke: #5f7398;
  stroke-width: 1.1;
}

.guide {
  stroke: #b7c6de;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.potential {
  fill: none;
  stroke: #1f6feb;
  stroke-width: 2.1;
}

.trail {
  fill: none;
  stroke: #f08b2f;
  stroke-width: 1.7;
}

.energy {
  stroke: #a64e1a;
  stroke-width: 1.2;
  stroke-dasharray: 5 4;
}

.particle {
  fill: #dd4f4f;
  stroke: #8f2a2a;
  stroke-width: 1.2;
}

.label {
  font-size: 12px;
  fill: #1d2a44;
}

.expr {
  font-size: 11px;
  fill: #30415f;
}

.error {
  font-size: 11px;
  fill: #9b1c1c;
}
</style>

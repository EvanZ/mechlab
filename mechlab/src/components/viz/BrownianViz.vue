<script setup lang="ts">
import { computed } from "vue";
import { strideSample } from "../../compute/decimate";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 430;
const height = 300;
const pad = 22;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const current = computed(() => props.states[safeIndex.value] ?? [0, 0, 0]);

const diffusion = computed(() => {
  const value = props.params.D;
  return Number.isFinite(value) ? Math.max(0, value) : 0;
});

const drift = computed(() => {
  const x = Number.isFinite(props.params.driftX) ? props.params.driftX : 0;
  const y = Number.isFinite(props.params.driftY) ? props.params.driftY : 0;
  return { x, y, mag: Math.hypot(x, y) };
});

const bounds = computed(() => {
  const states = props.states.length > 0 ? props.states : [[0, 0, 0]];
  const xs = states.map((state) => state[0] ?? 0);
  const ys = states.map((state) => state[1] ?? 0);

  const xNow = current.value[0] ?? 0;
  const yNow = current.value[1] ?? 0;
  const tNow = Math.max(0, current.value[2] ?? 0);
  const theoryRadius = Math.sqrt(Math.max(0, 4 * diffusion.value * tNow));

  let xMin = Math.min(...xs, xNow - theoryRadius, -1);
  let xMax = Math.max(...xs, xNow + theoryRadius, 1);
  let yMin = Math.min(...ys, yNow - theoryRadius, -1);
  let yMax = Math.max(...ys, yNow + theoryRadius, 1);

  const span = Math.max(xMax - xMin, yMax - yMin, 1e-6);
  const cx = 0.5 * (xMin + xMax);
  const cy = 0.5 * (yMin + yMax);

  xMin = cx - 0.58 * span;
  xMax = cx + 0.58 * span;
  yMin = cy - 0.58 * span;
  yMax = cy + 0.58 * span;

  return { xMin, xMax, yMin, yMax };
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
  const sampled = strideSample(props.states.slice(0, safeIndex.value + 1), 1800);
  if (!sampled.length) {
    return "";
  }

  return sampled
    .map((state, idx) => {
      const x = mapX(state[0] ?? 0);
      const y = mapY(state[1] ?? 0);
      return `${idx === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
});

const currentPoint = computed(() => ({
  x: mapX(current.value[0] ?? 0),
  y: mapY(current.value[1] ?? 0)
}));

const meanSquareRadius = computed(() => {
  const x = current.value[0] ?? 0;
  const y = current.value[1] ?? 0;
  return x * x + y * y;
});

const theoryRmsRadius = computed(() => {
  const tNow = Math.max(0, current.value[2] ?? 0);
  return Math.sqrt(Math.max(0, 4 * diffusion.value * tNow));
});

const theoryCirclePx = computed(() => {
  const x0 = mapX(0);
  const x1 = mapX(theoryRmsRadius.value);
  return Math.max(0, Math.abs(x1 - x0));
});

const origin = computed(() => ({ x: mapX(0), y: mapY(0) }));

const driftArrow = computed(() => {
  const mag = drift.value.mag;
  if (mag <= 1e-9) {
    return null;
  }

  const span = bounds.value.xMax - bounds.value.xMin;
  const lenWorld = 0.24 * span;
  const ux = drift.value.x / mag;
  const uy = drift.value.y / mag;

  const x1 = bounds.value.xMin + 0.16 * span;
  const y1 = bounds.value.yMax - 0.16 * span;
  const x2 = x1 + lenWorld * ux;
  const y2 = y1 + lenWorld * uy;

  return {
    x1: mapX(x1),
    y1: mapY(y1),
    x2: mapX(x2),
    y2: mapY(y2)
  };
});

const timeState = computed(() => Math.max(0, current.value[2] ?? 0));
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <defs>
        <linearGradient id="brownianBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f7fbff" />
          <stop offset="100%" stop-color="#e7f1ff" />
        </linearGradient>
        <marker id="brownian-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="#5d88ca" />
        </marker>
      </defs>

      <rect x="0" y="0" :width="width" :height="height" fill="url(#brownianBg)" stroke="#cad9ee" />

      <line :x1="pad" :y1="height - pad" :x2="width - pad" :y2="height - pad" class="axis" />
      <line :x1="pad" :y1="pad" :x2="pad" :y2="height - pad" class="axis" />

      <circle
        :cx="origin.x"
        :cy="origin.y"
        :r="theoryCirclePx"
        class="theory-circle"
      />

      <line
        v-if="driftArrow"
        :x1="driftArrow.x1"
        :y1="driftArrow.y1"
        :x2="driftArrow.x2"
        :y2="driftArrow.y2"
        class="drift-arrow"
        marker-end="url(#brownian-arrow)"
      />

      <path :d="trailPath" class="trail" />
      <circle :cx="currentPoint.x" :cy="currentPoint.y" r="6" class="particle" />
      <circle :cx="origin.x" :cy="origin.y" r="3" class="origin" />
    </svg>

    <div class="stats">
      <span>D {{ diffusion.toFixed(3) }}</span>
      <span>t {{ timeState.toFixed(2) }}</span>
      <span>r^2 {{ meanSquareRadius.toFixed(3) }}</span>
      <span>sqrt(4Dt) {{ theoryRmsRadius.toFixed(3) }}</span>
    </div>
  </div>
</template>

<style scoped>
.viz-wrap {
  width: 100%;
  max-width: 460px;
  display: grid;
  gap: 0.35rem;
}

.viz {
  width: 100%;
  height: auto;
}

.axis {
  stroke: #6d82a7;
  stroke-width: 1.1;
}

.theory-circle {
  fill: none;
  stroke: #9ab5e1;
  stroke-width: 1.2;
  stroke-dasharray: 5 4;
}

.drift-arrow {
  stroke: #5d88ca;
  stroke-width: 1.7;
}

.trail {
  fill: none;
  stroke: #1f6feb;
  stroke-width: 1.8;
}

.particle {
  fill: #e15151;
  stroke: #8f2c2c;
  stroke-width: 1;
}

.origin {
  fill: #274b7a;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  font-size: 0.74rem;
  color: #334967;
}
</style>

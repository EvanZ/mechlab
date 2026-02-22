<script setup lang="ts">
import { computed } from "vue";
import { strideSample } from "../../compute/decimate";
import { rutherfordCoulombStrength, rutherfordPredictedScatterDeg } from "../../systems/ode/rutherford";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 450;
const height = 320;
const pad = 22;

function normalizeAngleDeg(angleDeg: number): number {
  let wrapped = (angleDeg + 180) % 360;
  if (wrapped < 0) {
    wrapped += 360;
  }
  return wrapped - 180;
}

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const current = computed(() => props.states[safeIndex.value] ?? [0, 0, 0, 0]);
const initial = computed(() => props.states[0] ?? [props.params.xStart ?? -8, props.params.impactParam ?? 1, props.params.beamSpeed ?? 1, 0]);

const bounds = computed(() => {
  const all = props.states.length > 0 ? props.states : [[-8, -2], [8, 2]];
  const xs = all.map((state) => state[0] ?? 0);
  const ys = all.map((state) => state[1] ?? 0);

  let xMin = Math.min(...xs, -8, 0);
  let xMax = Math.max(...xs, 8, 0);
  let yMin = Math.min(...ys, -3, 0);
  let yMax = Math.max(...ys, 3, 0);

  const span = Math.max(xMax - xMin, yMax - yMin, 1e-6);
  const cx = 0.5 * (xMin + xMax);
  const cy = 0.5 * (yMin + yMax);

  xMin = cx - 0.58 * span;
  xMax = cx + 0.58 * span;
  yMin = cy - 0.58 * span;
  yMax = cy + 0.58 * span;

  return { xMin, xMax, yMin, yMax, span };
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
  const sampled = strideSample(props.states.slice(0, safeIndex.value + 1), 1600);
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

const originPoint = computed(() => ({
  x: mapX(0),
  y: mapY(0)
}));

const impactLine = computed(() => {
  const y0 = initial.value[1] ?? 0;
  return {
    x1: mapX(initial.value[0] ?? bounds.value.xMin),
    y1: mapY(y0),
    x2: mapX(0),
    y2: mapY(y0)
  };
});

function unitDir(vx: number, vy: number): { ux: number; uy: number } {
  const mag = Math.hypot(vx, vy);
  if (mag <= 1e-9) {
    return { ux: 1, uy: 0 };
  }
  return { ux: vx / mag, uy: vy / mag };
}

const incomingGuide = computed(() => {
  const [x0, y0, vx0, vy0] = initial.value;
  const { ux, uy } = unitDir(vx0 ?? 1, vy0 ?? 0);
  const len = 0.5 * bounds.value.span;
  return {
    x1: mapX((x0 ?? 0) - 0.08 * len * ux),
    y1: mapY((y0 ?? 0) - 0.08 * len * uy),
    x2: mapX((x0 ?? 0) + len * ux),
    y2: mapY((y0 ?? 0) + len * uy)
  };
});

const outgoingGuide = computed(() => {
  const [x, y, vx, vy] = current.value;
  const { ux, uy } = unitDir(vx ?? 1, vy ?? 0);
  const len = 0.5 * bounds.value.span;
  return {
    x1: mapX(x ?? 0),
    y1: mapY(y ?? 0),
    x2: mapX((x ?? 0) + 0.72 * len * ux),
    y2: mapY((y ?? 0) + 0.72 * len * uy)
  };
});

const scatterDeg = computed(() => {
  const vx = current.value[2] ?? 0;
  const vy = current.value[3] ?? 0;
  return (Math.atan2(vy, vx) * 180) / Math.PI;
});

const predictedDeg = computed(() => rutherfordPredictedScatterDeg(props.params));
const angleErrorDeg = computed(() => normalizeAngleDeg(scatterDeg.value - predictedDeg.value));
const speed = computed(() => Math.hypot(current.value[2] ?? 0, current.value[3] ?? 0));
const kappa = computed(() => rutherfordCoulombStrength(props.params));
const impactParam = computed(() => Number.isFinite(props.params.impactParam) ? props.params.impactParam : 0);
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <defs>
        <linearGradient id="ruthBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f8fbff" />
          <stop offset="100%" stop-color="#eaf2ff" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" :width="width" :height="height" fill="url(#ruthBg)" stroke="#ccdaef" />

      <line :x1="pad" :y1="height - pad" :x2="width - pad" :y2="height - pad" class="axis" />
      <line :x1="pad" :y1="pad" :x2="pad" :y2="height - pad" class="axis" />

      <line :x1="incomingGuide.x1" :y1="incomingGuide.y1" :x2="incomingGuide.x2" :y2="incomingGuide.y2" class="incoming" />
      <line :x1="outgoingGuide.x1" :y1="outgoingGuide.y1" :x2="outgoingGuide.x2" :y2="outgoingGuide.y2" class="outgoing" />
      <line :x1="impactLine.x1" :y1="impactLine.y1" :x2="impactLine.x2" :y2="impactLine.y2" class="impact" />

      <path :d="trailPath" class="trail" />

      <circle :cx="originPoint.x" :cy="originPoint.y" r="8" class="target" />
      <circle :cx="originPoint.x" :cy="originPoint.y" r="14" class="target-halo" />
      <circle :cx="currentPoint.x" :cy="currentPoint.y" r="5.5" class="projectile" />

      <text x="10" y="16" class="label">Rutherford scattering: numeric trajectory vs analytic angle</text>
    </svg>

    <div class="viz-meta">
      <span>b {{ impactParam.toFixed(3) }}</span>
      <span>kappa {{ kappa.toFixed(3) }}</span>
      <span>|v| {{ speed.toFixed(3) }}</span>
      <span>theta_num {{ scatterDeg.toFixed(2) }} deg</span>
      <span>theta_pred {{ predictedDeg.toFixed(2) }} deg</span>
      <span>error {{ angleErrorDeg.toFixed(2) }} deg</span>
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
  stroke: #6f82a3;
  stroke-width: 1.1;
}

.trail {
  fill: none;
  stroke: #1e61c9;
  stroke-width: 2;
}

.incoming {
  stroke: #5776a8;
  stroke-width: 1.2;
  stroke-dasharray: 5 3;
}

.outgoing {
  stroke: #1f8d5b;
  stroke-width: 1.2;
  stroke-dasharray: 4 3;
}

.impact {
  stroke: #a7682a;
  stroke-width: 1.1;
  stroke-dasharray: 3 4;
}

.target {
  fill: #e18f2b;
  stroke: #8d4f13;
  stroke-width: 1;
}

.target-halo {
  fill: none;
  stroke: #e5b87d;
  stroke-width: 1;
  opacity: 0.7;
}

.projectile {
  fill: #2f73d6;
  stroke: #173f7d;
  stroke-width: 1;
}

.label {
  font-size: 11px;
  fill: #20314f;
}

.viz-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.7rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid #c8d6ec;
  border-radius: 8px;
  background: #f8fbff;
  font-size: 0.72rem;
  color: #2a3a56;
  line-height: 1.3;
}
</style>

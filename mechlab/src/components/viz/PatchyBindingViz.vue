<script setup lang="ts">
import { computed } from "vue";
import { strideSample } from "../../compute/decimate";
import { patchyBindingObservablesFromState } from "../../systems/ode/patchybinding";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 460;
const height = 320;
const pad = 22;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const current = computed(() => props.states[safeIndex.value] ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const coreRadius1 = computed(() => Math.max(0.08, Number.isFinite(props.params.coreRadius1) ? props.params.coreRadius1 : 0.7));
const coreRadius2 = computed(() => Math.max(0.08, Number.isFinite(props.params.coreRadius2) ? props.params.coreRadius2 : 0.76));

const obs = computed(() => patchyBindingObservablesFromState(current.value, props.params));

const bounds = computed(() => {
  const all = props.states.length > 0 ? props.states : [[-3, -2, 0, 3, 2, Math.PI]];

  const xs: number[] = [];
  const ys: number[] = [];

  for (const state of all) {
    xs.push(state[0] ?? 0, state[3] ?? 0);
    ys.push(state[1] ?? 0, state[4] ?? 0);
  }

  let xMin = Math.min(...xs, -3);
  let xMax = Math.max(...xs, 3);
  let yMin = Math.min(...ys, -2.5);
  let yMax = Math.max(...ys, 2.5);

  const span = Math.max(xMax - xMin, yMax - yMin, 1e-6);
  const cx = 0.5 * (xMin + xMax);
  const cy = 0.5 * (yMin + yMax);

  xMin = cx - 0.58 * span;
  xMax = cx + 0.58 * span;
  yMin = cy - 0.58 * span;
  yMax = cy + 0.58 * span;

  return {
    xMin,
    xMax,
    yMin,
    yMax,
    span
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

function buildTrailPath(xIndex: number, yIndex: number): string {
  const sampled = strideSample(props.states.slice(0, safeIndex.value + 1), 1600);
  if (!sampled.length) {
    return "";
  }

  return sampled
    .map((state, idx) => {
      const x = mapX(state[xIndex] ?? 0);
      const y = mapY(state[yIndex] ?? 0);
      return `${idx === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

const trail1 = computed(() => buildTrailPath(0, 1));
const trail2 = computed(() => buildTrailPath(3, 4));

const center1 = computed(() => ({ x: mapX(current.value[0] ?? 0), y: mapY(current.value[1] ?? 0) }));
const center2 = computed(() => ({ x: mapX(current.value[3] ?? 0), y: mapY(current.value[4] ?? 0) }));

const pxPerWorld = computed(() => (width - 2 * pad) / (bounds.value.xMax - bounds.value.xMin || 1));
const radius1Px = computed(() => Math.max(7, Math.min(24, coreRadius1.value * pxPerWorld.value)));
const radius2Px = computed(() => Math.max(7, Math.min(24, coreRadius2.value * pxPerWorld.value)));

const patch1 = computed(() => {
  const theta = current.value[2] ?? 0;
  const len = 1.45 * radius1Px.value;
  const x0 = center1.value.x;
  const y0 = center1.value.y;
  const x1 = x0 + len * Math.cos(theta);
  const y1 = y0 - len * Math.sin(theta);
  return { x0, y0, x1, y1 };
});

const patch2 = computed(() => {
  const theta = current.value[5] ?? 0;
  const len = 1.45 * radius2Px.value;
  const x0 = center2.value.x;
  const y0 = center2.value.y;
  const x1 = x0 + len * Math.cos(theta);
  const y1 = y0 - len * Math.sin(theta);
  return { x0, y0, x1, y1 };
});

const haloOpacity = computed(() => 0.08 + 0.6 * Math.max(0, Math.min(1, obs.value.boundProxy)));
const haloX = computed(() => 0.5 * (center1.value.x + center2.value.x));
const haloY = computed(() => 0.5 * (center1.value.y + center2.value.y));
const haloR = computed(() => 0.95 * (radius1Px.value + radius2Px.value));
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <defs>
        <linearGradient id="ppiBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f7fbff" />
          <stop offset="100%" stop-color="#e8f2ff" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" :width="width" :height="height" fill="url(#ppiBg)" stroke="#cbd9ee" />

      <line :x1="pad" :y1="height - pad" :x2="width - pad" :y2="height - pad" class="axis" />
      <line :x1="pad" :y1="pad" :x2="pad" :y2="height - pad" class="axis" />

      <path :d="trail1" class="trail1" />
      <path :d="trail2" class="trail2" />

      <line :x1="center1.x" :y1="center1.y" :x2="center2.x" :y2="center2.y" class="center-line" />

      <circle :cx="haloX" :cy="haloY" :r="haloR" :style="{ opacity: haloOpacity }" class="contact-halo" />

      <circle :cx="center1.x" :cy="center1.y" :r="radius1Px" class="protein1" />
      <line :x1="patch1.x0" :y1="patch1.y0" :x2="patch1.x1" :y2="patch1.y1" class="patch1" />

      <circle :cx="center2.x" :cy="center2.y" :r="radius2Px" class="protein2" />
      <line :x1="patch2.x0" :y1="patch2.y0" :x2="patch2.x1" :y2="patch2.y1" class="patch2" />

      <text x="10" y="16" class="label">Full 2-body patchy protein-protein interaction</text>
    </svg>

    <div class="viz-meta">
      <span>r {{ obs.distance.toFixed(3) }}</span>
      <span>contact {{ obs.contactScore.toFixed(3) }}</span>
      <span>bound {{ obs.boundProxy.toFixed(3) }}</span>
      <span>align_1 {{ obs.align1.toFixed(3) }}</span>
      <span>align_2 {{ obs.align2.toFixed(3) }}</span>
      <span>theta_rel {{ obs.thetaRelDeg.toFixed(1) }} deg</span>
    </div>
  </div>
</template>

<style scoped>
.viz-wrap {
  width: 100%;
  max-width: 480px;
  display: grid;
  gap: 0.35rem;
}

.viz {
  width: 100%;
  height: auto;
}

.axis {
  stroke: #7083a3;
  stroke-width: 1.1;
}

.trail1 {
  fill: none;
  stroke: #2f6fd3;
  stroke-width: 2;
}

.trail2 {
  fill: none;
  stroke: #cb7c25;
  stroke-width: 2;
}

.center-line {
  stroke: #7a8dad;
  stroke-width: 1.1;
  stroke-dasharray: 4 3;
}

.contact-halo {
  fill: #58c7a3;
}

.protein1 {
  fill: #3a78d8;
  stroke: #193d79;
  stroke-width: 1.2;
}

.patch1 {
  stroke: #0f2244;
  stroke-width: 2.2;
  stroke-linecap: round;
}

.protein2 {
  fill: #e6942f;
  stroke: #8a5317;
  stroke-width: 1.2;
}

.patch2 {
  stroke: #4e2d0c;
  stroke-width: 2.2;
  stroke-linecap: round;
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

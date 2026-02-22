<script setup lang="ts">
import { computed } from "vue";
import { strideSample } from "../../compute/decimate";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 440;
const height = 300;
const pad = 24;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const current = computed(() => props.states[safeIndex.value] ?? [0, 0, 0.5, 0.5, 0]);

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

const hbar = computed(() => Math.max(1e-6, finiteOr(props.params.hbar, 1)));

const bounds = computed(() => {
  const states = props.states.length > 0 ? props.states : [[0, 0, 0.5, 0.5, 0]];

  const xCandidates: number[] = [];
  const pCandidates: number[] = [];

  for (const state of states) {
    const xMean = finiteOr(state[0], 0);
    const pMean = finiteOr(state[1], 0);
    const sigmaX = Math.sqrt(Math.max(1e-8, finiteOr(state[2], 0.5)));
    const sigmaP = Math.sqrt(Math.max(1e-8, finiteOr(state[3], 0.5)));

    xCandidates.push(xMean - 2.7 * sigmaX, xMean + 2.7 * sigmaX);
    pCandidates.push(pMean - 2.7 * sigmaP, pMean + 2.7 * sigmaP);
  }

  let xMin = Math.min(...xCandidates, -1.2);
  let xMax = Math.max(...xCandidates, 1.2);
  let pMin = Math.min(...pCandidates, -1.2);
  let pMax = Math.max(...pCandidates, 1.2);

  const xSpan = Math.max(1e-6, xMax - xMin);
  const pSpan = Math.max(1e-6, pMax - pMin);

  xMin -= 0.1 * xSpan;
  xMax += 0.1 * xSpan;
  pMin -= 0.1 * pSpan;
  pMax += 0.1 * pSpan;

  return { xMin, xMax, pMin, pMax };
});

function mapX(x: number): number {
  const ratio = (x - bounds.value.xMin) / (bounds.value.xMax - bounds.value.xMin || 1);
  return pad + ratio * (width - 2 * pad);
}

function mapP(p: number): number {
  const ratio = (p - bounds.value.pMin) / (bounds.value.pMax - bounds.value.pMin || 1);
  return height - pad - ratio * (height - 2 * pad);
}

const meanTrailPath = computed(() => {
  const sampled = strideSample(props.states.slice(0, safeIndex.value + 1), 1800);
  if (!sampled.length) {
    return "";
  }

  return sampled
    .map((state, idx) => {
      const x = mapX(finiteOr(state[0], 0));
      const p = mapP(finiteOr(state[1], 0));
      return `${idx === 0 ? "M" : "L"}${x.toFixed(2)} ${p.toFixed(2)}`;
    })
    .join(" ");
});

const meanPoint = computed(() => ({
  x: mapX(finiteOr(current.value[0], 0)),
  p: mapP(finiteOr(current.value[1], 0))
}));

const uncertaintyEllipse = computed(() => {
  const vxx = Math.max(1e-9, finiteOr(current.value[2], 0.5));
  const vpp = Math.max(1e-9, finiteOr(current.value[3], 0.5));
  const vxp = finiteOr(current.value[4], 0);

  const sx = (width - 2 * pad) / (bounds.value.xMax - bounds.value.xMin || 1);
  const sp = (height - 2 * pad) / (bounds.value.pMax - bounds.value.pMin || 1);

  const a = vxx * sx * sx;
  const b = vxp * sx * sp;
  const c = vpp * sp * sp;

  const trace = a + c;
  const disc = Math.sqrt(Math.max(0, (a - c) * (a - c) + 4 * b * b));
  const lambda1 = Math.max(1e-9, 0.5 * (trace + disc));
  const lambda2 = Math.max(1e-9, 0.5 * (trace - disc));

  const angleRad = 0.5 * Math.atan2(2 * b, a - c);

  // Use a 2-sigma ellipse for visual clarity.
  const rx = 2 * Math.sqrt(lambda1);
  const ry = 2 * Math.sqrt(lambda2);
  const angleDeg = (-angleRad * 180) / Math.PI;

  return {
    cx: meanPoint.value.x,
    cy: meanPoint.value.p,
    rx,
    ry,
    angleDeg
  };
});

const detV = computed(() => {
  const vxx = finiteOr(current.value[2], 0);
  const vpp = finiteOr(current.value[3], 0);
  const vxp = finiteOr(current.value[4], 0);
  return Math.max(0, vxx * vpp - vxp * vxp);
});

const purity = computed(() =>
  Math.min(1, hbar.value / (2 * Math.sqrt(Math.max(detV.value, 1e-12))))
);

const uncertaintyRatio = computed(() => {
  const minDet = (hbar.value * hbar.value) / 4;
  return detV.value / Math.max(minDet, 1e-12);
});

const zeroAxes = computed(() => {
  const inX = bounds.value.xMin <= 0 && 0 <= bounds.value.xMax;
  const inP = bounds.value.pMin <= 0 && 0 <= bounds.value.pMax;
  return {
    x: inX ? mapX(0) : null,
    p: inP ? mapP(0) : null
  };
});
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <defs>
        <linearGradient id="qbmBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f7f3ff" />
          <stop offset="100%" stop-color="#ece4ff" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" :width="width" :height="height" fill="url(#qbmBg)" stroke="#cfcae8" />

      <line :x1="pad" :y1="height - pad" :x2="width - pad" :y2="height - pad" class="frame-axis" />
      <line :x1="pad" :y1="pad" :x2="pad" :y2="height - pad" class="frame-axis" />

      <line
        v-if="zeroAxes.p !== null"
        :x1="pad"
        :y1="zeroAxes.p"
        :x2="width - pad"
        :y2="zeroAxes.p"
        class="zero-axis"
      />
      <line
        v-if="zeroAxes.x !== null"
        :x1="zeroAxes.x"
        :y1="pad"
        :x2="zeroAxes.x"
        :y2="height - pad"
        class="zero-axis"
      />

      <path :d="meanTrailPath" class="mean-trail" />

      <ellipse
        :cx="uncertaintyEllipse.cx"
        :cy="uncertaintyEllipse.cy"
        :rx="uncertaintyEllipse.rx"
        :ry="uncertaintyEllipse.ry"
        :transform="`rotate(${uncertaintyEllipse.angleDeg} ${uncertaintyEllipse.cx} ${uncertaintyEllipse.cy})`"
        class="uncertainty"
      />

      <circle :cx="meanPoint.x" :cy="meanPoint.p" r="5.8" class="mean-point" />
      <circle :cx="mapX(0)" :cy="mapP(0)" r="2.9" class="origin" />
    </svg>

    <div class="stats">
      <span>purity {{ purity.toFixed(3) }}</span>
      <span>det(V)/(hbar^2/4) {{ uncertaintyRatio.toFixed(2) }}</span>
      <span>Vxx {{ Math.max(0, finiteOr(current[2], 0)).toFixed(3) }}</span>
      <span>Vpp {{ Math.max(0, finiteOr(current[3], 0)).toFixed(3) }}</span>
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

.frame-axis {
  stroke: #7a7496;
  stroke-width: 1.1;
}

.zero-axis {
  stroke: #9e98ba;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.mean-trail {
  fill: none;
  stroke: #4f64cc;
  stroke-width: 1.9;
}

.uncertainty {
  fill: rgba(130, 108, 213, 0.18);
  stroke: #7b65c7;
  stroke-width: 1.4;
}

.mean-point {
  fill: #25398b;
  stroke: #101f5f;
  stroke-width: 1;
}

.origin {
  fill: #20213d;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  font-size: 0.74rem;
  color: #3b3560;
}
</style>

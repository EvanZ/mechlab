<script setup lang="ts">
import { computed } from "vue";
import {
  schrodingerAbsorberAtX,
  schrodingerBarrierPotentialAtX,
  schrodingerGridFromParams,
  schrodingerObservablesFromState,
  schrodingerXAt
} from "../../systems/ode/schrodinger1d";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 430;
const height = 280;
const padLeft = 36;
const padRight = 16;
const padTop = 16;
const padBottom = 28;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const state = computed(() => props.states[safeIndex.value] ?? []);
const cfg = computed(() => schrodingerGridFromParams(props.params, state.value.length));

const densityData = computed(() => {
  if (state.value.length === 0) {
    return { x: [] as number[], rho: [] as number[] };
  }

  const n = cfg.value.n;
  const re = state.value.slice(0, n);
  const im = state.value.slice(n);
  const x: number[] = new Array(n);
  const rho: number[] = new Array(n);

  for (let i = 0; i < n; i += 1) {
    x[i] = schrodingerXAt(i, cfg.value);
    rho[i] = re[i] * re[i] + im[i] * im[i];
  }

  return { x, rho };
});

const potentialData = computed(() => {
  const x: number[] = new Array(cfg.value.n);
  const v: number[] = new Array(cfg.value.n);
  const absorber: number[] = new Array(cfg.value.n);

  for (let i = 0; i < cfg.value.n; i += 1) {
    const xi = schrodingerXAt(i, cfg.value);
    x[i] = xi;
    v[i] = schrodingerBarrierPotentialAtX(xi, cfg.value);
    absorber[i] = schrodingerAbsorberAtX(xi, cfg.value);
  }

  return { x, v, absorber };
});

const observables = computed(() => {
  if (state.value.length === 0) {
    return null;
  }
  return schrodingerObservablesFromState(state.value, props.params);
});

const yScale = computed(() => {
  const rhoMax = densityData.value.rho.reduce((acc, value) => Math.max(acc, value), 1e-9);
  const vMaxAbs = potentialData.value.v.reduce((acc, value) => Math.max(acc, Math.abs(value)), 0);
  const vScale = vMaxAbs > 1e-10 ? 0.8 * rhoMax / vMaxAbs : 0;
  const vScaled = potentialData.value.v.map((value) => value * vScale);
  const aScaled = potentialData.value.absorber.map((value) => value * vScale);
  const minY = Math.min(0, ...vScaled, ...aScaled);
  const maxY = Math.max(rhoMax * 1.1, ...vScaled, ...aScaled, 1e-6);

  return { minY, maxY, vScale };
});

function mapX(x: number): number {
  const ratio = (x - cfg.value.xMin) / (cfg.value.xMax - cfg.value.xMin || 1);
  return padLeft + ratio * (width - padLeft - padRight);
}

function mapY(y: number): number {
  const ratio = (y - yScale.value.minY) / (yScale.value.maxY - yScale.value.minY || 1);
  return height - padBottom - ratio * (height - padTop - padBottom);
}

function pathFromSeries(x: number[], y: number[]): string {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return "";
  }

  const parts: string[] = [];
  for (let i = 0; i < x.length; i += 1) {
    const px = mapX(x[i]);
    const py = mapY(y[i]);
    parts.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)}`);
  }
  return parts.join(" ");
}

const densityPath = computed(() => pathFromSeries(densityData.value.x, densityData.value.rho));
const potentialPath = computed(() =>
  pathFromSeries(
    potentialData.value.x,
    potentialData.value.v.map((value) => value * yScale.value.vScale)
  )
);
const absorberPath = computed(() =>
  pathFromSeries(
    potentialData.value.x,
    potentialData.value.absorber.map((value) => value * yScale.value.vScale)
  )
);

const xMeanLineX = computed(() =>
  observables.value ? mapX(observables.value.xMean) : mapX(0)
);
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <defs>
      <linearGradient id="qmBg" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#f7fbff" />
        <stop offset="100%" stop-color="#eaf2ff" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" :width="width" :height="height" fill="url(#qmBg)" stroke="#ccdaef" />

    <line :x1="padLeft" :y1="height - padBottom" :x2="width - padRight" :y2="height - padBottom" class="axis" />
    <line :x1="padLeft" :y1="padTop" :x2="padLeft" :y2="height - padBottom" class="axis" />

    <line :x1="padLeft" :y1="mapY(0)" :x2="width - padRight" :y2="mapY(0)" class="zero-line" />
    <line :x1="xMeanLineX" :y1="padTop" :x2="xMeanLineX" :y2="height - padBottom" class="mean-line" />

    <path :d="absorberPath" class="absorber" />
    <path :d="potentialPath" class="potential" />
    <path :d="densityPath" class="density" />

    <text x="10" y="16" class="label">|psi|^2</text>
    <text x="10" y="31" class="label">Norm {{ (observables?.norm ?? 0).toFixed(4) }}</text>
    <text x="10" y="46" class="label">R {{ (observables?.reflection ?? 0).toFixed(3) }}</text>
    <text x="10" y="61" class="label">T {{ (observables?.transmission ?? 0).toFixed(3) }}</text>
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 450px;
  height: auto;
}

.axis {
  stroke: #6f82a3;
  stroke-width: 1.1;
}

.zero-line {
  stroke: #b4c2d9;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.mean-line {
  stroke: #5b74b1;
  stroke-width: 1;
  stroke-dasharray: 5 3;
}

.density {
  fill: none;
  stroke: #205dc4;
  stroke-width: 2.1;
}

.potential {
  fill: none;
  stroke: #c44f1c;
  stroke-width: 1.7;
}

.absorber {
  fill: none;
  stroke: #8a55a1;
  stroke-width: 1.4;
}

.label {
  font-size: 11px;
  fill: #20314f;
}
</style>

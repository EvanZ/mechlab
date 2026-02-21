<script setup lang="ts">
import { computed } from "vue";
import {
  computeTunnelingScan,
  tunnelingGridFromParams,
  tunnelingObservablesFromState,
  tunnelingPotentialAtX,
  tunnelingTransmissionForEnergy,
  tunnelingXAt
} from "../../systems/ode/tunneling1d";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 460;
const height = 320;

const topLeft = 32;
const topRight = 16;
const topTop = 14;
const topBottom = 196;

const bottomTop = 222;
const bottomBottom = 304;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const state = computed(() => props.states[safeIndex.value] ?? []);
const cfg = computed(() => tunnelingGridFromParams(props.params, state.value.length));

const densityData = computed(() => {
  if (!state.value.length) {
    return { x: [] as number[], rho: [] as number[] };
  }

  const n = cfg.value.n;
  const re = state.value.slice(0, n);
  const im = state.value.slice(n);

  const x = new Array<number>(n);
  const rho = new Array<number>(n);

  for (let i = 0; i < n; i += 1) {
    x[i] = tunnelingXAt(i, cfg.value);
    rho[i] = re[i] * re[i] + im[i] * im[i];
  }

  return { x, rho };
});

const potentialData = computed(() => {
  const x = new Array<number>(cfg.value.n);
  const v = new Array<number>(cfg.value.n);

  for (let i = 0; i < cfg.value.n; i += 1) {
    const xi = tunnelingXAt(i, cfg.value);
    x[i] = xi;
    v[i] = tunnelingPotentialAtX(xi, cfg.value);
  }

  return { x, v };
});

const observables = computed(() => {
  if (!state.value.length) {
    return null;
  }

  return tunnelingObservablesFromState(state.value, props.params);
});

const topScale = computed(() => {
  const rhoMax = densityData.value.rho.reduce((acc, value) => Math.max(acc, value), 1e-9);
  const vMax = potentialData.value.v.reduce((acc, value) => Math.max(acc, value), 0);

  const vScale = vMax > 1e-10 ? 0.74 * rhoMax / vMax : 0;
  const vScaled = potentialData.value.v.map((value) => value * vScale);

  const minY = Math.min(0, ...vScaled);
  const maxY = Math.max(rhoMax * 1.12, ...vScaled, 1e-6);

  return { minY, maxY, vScale };
});

function mapXTop(x: number): number {
  const ratio = (x - cfg.value.xMin) / (cfg.value.xMax - cfg.value.xMin || 1);
  return topLeft + ratio * (width - topLeft - topRight);
}

function mapYTop(y: number): number {
  const ratio = (y - topScale.value.minY) / (topScale.value.maxY - topScale.value.minY || 1);
  return topBottom - ratio * (topBottom - topTop);
}

function pathTop(x: number[], y: number[]): string {
  if (!x.length || !y.length || x.length !== y.length) {
    return "";
  }

  const parts: string[] = [];
  for (let i = 0; i < x.length; i += 1) {
    const px = mapXTop(x[i]);
    const py = mapYTop(y[i]);
    parts.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)}`);
  }

  return parts.join(" ");
}

const densityPath = computed(() => pathTop(densityData.value.x, densityData.value.rho));
const potentialPath = computed(() =>
  pathTop(
    potentialData.value.x,
    potentialData.value.v.map((value) => value * topScale.value.vScale)
  )
);

const scan = computed(() => computeTunnelingScan(props.params));

const packetEnergy = computed(() => {
  const m = Math.max(1e-8, Number.isFinite(props.params.m) ? props.params.m : 1);
  const hbar = Math.max(1e-8, Number.isFinite(props.params.hbar) ? props.params.hbar : 1);
  const k0 = Number.isFinite(props.params.packetK0) ? props.params.packetK0 : 0;
  return (hbar * hbar * k0 * k0) / (2 * m);
});

const packetTransmissionEstimate = computed(() =>
  tunnelingTransmissionForEnergy(packetEnergy.value, props.params)
);

const scanBounds = computed(() => {
  const eMin = scan.value.energy.length ? Math.min(...scan.value.energy) : 0;
  const eMax = scan.value.energy.length ? Math.max(...scan.value.energy) : 1;

  const tMin = 0;
  const tMax = 1;

  return { eMin, eMax, tMin, tMax };
});

function mapXScan(E: number): number {
  const raw = (E - scanBounds.value.eMin) / (scanBounds.value.eMax - scanBounds.value.eMin || 1);
  const ratio = Math.max(0, Math.min(1, raw));
  return topLeft + ratio * (width - topLeft - topRight);
}

function mapYScan(T: number): number {
  const raw = (T - scanBounds.value.tMin) / (scanBounds.value.tMax - scanBounds.value.tMin || 1);
  const ratio = Math.max(0, Math.min(1, raw));
  return bottomBottom - ratio * (bottomBottom - bottomTop);
}

function pathScan(E: number[], T: number[]): string {
  if (!E.length || !T.length || E.length !== T.length) {
    return "";
  }

  const parts: string[] = [];

  for (let i = 0; i < E.length; i += 1) {
    const px = mapXScan(E[i]);
    const py = mapYScan(T[i]);
    parts.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)}`);
  }

  return parts.join(" ");
}

const scanPath = computed(() => pathScan(scan.value.energy, scan.value.transmission));
const packetMarkerX = computed(() => mapXScan(packetEnergy.value));
const packetMarkerY = computed(() => mapYScan(packetTransmissionEstimate.value));
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <rect x="0" y="0" :width="width" :height="height" fill="#f8fbff" stroke="#cbdaee" />

      <rect
        :x="topLeft"
        :y="topTop"
        :width="width - topLeft - topRight"
        :height="topBottom - topTop"
        fill="#ffffff"
        stroke="#cad8ec"
      />

      <line :x1="topLeft" :y1="mapYTop(0)" :x2="width - topRight" :y2="mapYTop(0)" class="zero-line" />

      <path :d="potentialPath" class="potential" />
      <path :d="densityPath" class="density" />

      <rect
        :x="topLeft"
        :y="bottomTop"
        :width="width - topLeft - topRight"
        :height="bottomBottom - bottomTop"
        fill="#ffffff"
        stroke="#cad8ec"
      />

      <line
        :x1="packetMarkerX"
        :y1="bottomTop"
        :x2="packetMarkerX"
        :y2="bottomBottom"
        class="marker-line"
      />
      <path :d="scanPath" class="scan" />
      <circle :cx="packetMarkerX" :cy="packetMarkerY" r="3" class="marker-dot" />

      <text x="10" y="16" class="label">|psi|^2 (blue), barrier V(x) (orange)</text>
      <text x="10" y="214" class="label">Transmission scan T(E)</text>
    </svg>

    <div class="viz-meta">
      <span>Norm {{ (observables?.norm ?? 0).toFixed(4) }}</span>
      <span>P_trans {{ (observables?.transmission ?? 0).toFixed(3) }}</span>
      <span>P_refl {{ (observables?.reflection ?? 0).toFixed(3) }}</span>
      <span>E_packet {{ packetEnergy.toFixed(3) }}</span>
      <span>T(E_packet) {{ packetTransmissionEstimate.toFixed(3) }}</span>
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

.zero-line {
  stroke: #b7c6de;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.density {
  fill: none;
  stroke: #1f63ce;
  stroke-width: 2;
}

.potential {
  fill: none;
  stroke: #c8611d;
  stroke-width: 1.7;
}

.scan {
  fill: none;
  stroke: #1a7c44;
  stroke-width: 1.75;
}

.marker-line {
  stroke: #46649a;
  stroke-width: 1;
  stroke-dasharray: 4 3;
}

.marker-dot {
  fill: #46649a;
}

.label {
  font-size: 11px;
  fill: #27384f;
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

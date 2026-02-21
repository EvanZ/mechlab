<script setup lang="ts">
import { computed } from "vue";
import { twoQubitObservablesFromState } from "../../systems/ode/twoqubit";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 460;
const height = 350;

const sphereRadius = 78;
const leftCx = 120;
const rightCx = 300;
const cy = 106;

const yaw = -Math.PI / 5;
const pitch = Math.PI / 7;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const state = computed(() => props.states[safeIndex.value] ?? []);

interface ProjPoint {
  x: number;
  y: number;
}

function projectPoint(cx: number, px: number, py: number, pz: number): ProjPoint {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  const x1 = px * cosYaw - py * sinYaw;
  const y1 = px * sinYaw + py * cosYaw;
  const z1 = pz;

  const y2 = y1 * cosPitch - z1 * sinPitch;

  return {
    x: cx + sphereRadius * x1,
    y: cy - sphereRadius * y2
  };
}

function circlePath(cx: number, sampleFn: (t: number) => [number, number, number]): string {
  const segments = 120;
  const parts: string[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * 2 * Math.PI;
    const [x, y, z] = sampleFn(t);
    const p = projectPoint(cx, x, y, z);
    parts.push(`${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  }

  return parts.join(" ");
}

const equatorLeft = computed(() => circlePath(leftCx, (t) => [Math.cos(t), Math.sin(t), 0]));
const equatorRight = computed(() => circlePath(rightCx, (t) => [Math.cos(t), Math.sin(t), 0]));
const meridianLeft = computed(() => circlePath(leftCx, (t) => [Math.cos(t), 0, Math.sin(t)]));
const meridianRight = computed(() => circlePath(rightCx, (t) => [Math.cos(t), 0, Math.sin(t)]));

const obs = computed(() => {
  if (state.value.length !== 8) {
    return null;
  }
  return twoQubitObservablesFromState(state.value, props.params);
});

const tip1 = computed(() => {
  const o = obs.value;
  if (!o) {
    return projectPoint(leftCx, 0, 0, 1);
  }
  return projectPoint(leftCx, o.bloch1x, o.bloch1y, o.bloch1z);
});

const tip2 = computed(() => {
  const o = obs.value;
  if (!o) {
    return projectPoint(rightCx, 0, 0, 1);
  }
  return projectPoint(rightCx, o.bloch2x, o.bloch2y, o.bloch2z);
});

function tracePath(which: 1 | 2): string {
  if (props.states.length === 0) {
    return "";
  }

  const last = safeIndex.value;
  const step = Math.max(1, Math.ceil((last + 1) / 340));
  const parts: string[] = [];

  for (let i = 0; i <= last; i += step) {
    const s = props.states[i];
    if (!s || s.length !== 8) {
      continue;
    }

    const o = twoQubitObservablesFromState(s, props.params);
    const p =
      which === 1
        ? projectPoint(leftCx, o.bloch1x, o.bloch1y, o.bloch1z)
        : projectPoint(rightCx, o.bloch2x, o.bloch2y, o.bloch2z);

    parts.push(`${parts.length === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  }

  if (last % step !== 0) {
    const s = props.states[last];
    if (s && s.length === 8) {
      const o = twoQubitObservablesFromState(s, props.params);
      const p =
        which === 1
          ? projectPoint(leftCx, o.bloch1x, o.bloch1y, o.bloch1z)
          : projectPoint(rightCx, o.bloch2x, o.bloch2y, o.bloch2z);

      parts.push(`${parts.length === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
    }
  }

  return parts.join(" ");
}

const trace1 = computed(() => tracePath(1));
const trace2 = computed(() => tracePath(2));

const barBaseY = 328;
const barMaxHeight = 86;

function barHeight(prob: number): number {
  return Math.max(0, Math.min(1, prob)) * barMaxHeight;
}

const probs = computed(() => {
  const o = obs.value;
  return [o?.p00 ?? 0, o?.p01 ?? 0, o?.p10 ?? 0, o?.p11 ?? 0];
});
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <defs>
      <radialGradient id="qubitSphereBg" cx="44%" cy="30%" r="74%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#dce7f8" stop-opacity="0.95" />
      </radialGradient>
      <linearGradient id="entGauge" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="#dbe8ff" />
        <stop offset="100%" stop-color="#3f7de0" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" :width="width" :height="height" fill="#f8fbff" stroke="#cad8ee" />

    <circle :cx="leftCx" :cy="cy" :r="sphereRadius" fill="url(#qubitSphereBg)" class="sphere" />
    <circle :cx="rightCx" :cy="cy" :r="sphereRadius" fill="url(#qubitSphereBg)" class="sphere" />

    <path :d="equatorLeft" class="grid" />
    <path :d="equatorRight" class="grid" />
    <path :d="meridianLeft" class="grid subtle" />
    <path :d="meridianRight" class="grid subtle" />

    <path :d="trace1" class="trace-one" />
    <path :d="trace2" class="trace-two" />

    <line :x1="leftCx" :y1="cy" :x2="tip1.x" :y2="tip1.y" class="vector-one" />
    <line :x1="rightCx" :y1="cy" :x2="tip2.x" :y2="tip2.y" class="vector-two" />

    <circle :cx="tip1.x" :cy="tip1.y" r="4.6" class="tip-one" />
    <circle :cx="tip2.x" :cy="tip2.y" r="4.6" class="tip-two" />

    <text x="75" y="24" class="title">Qubit A Bloch Vector</text>
    <text x="255" y="24" class="title">Qubit B Bloch Vector</text>

    <text x="16" y="206" class="stat">Concurrence C = {{ (obs?.concurrence ?? 0).toFixed(3) }}</text>
    <text x="16" y="224" class="stat">Entropy S = {{ (obs?.entropy ?? 0).toFixed(3) }}</text>
    <text x="16" y="242" class="stat">&lt;Z x Z&gt; = {{ (obs?.czz ?? 0).toFixed(3) }}</text>
    <text x="16" y="260" class="stat">Norm = {{ (obs?.norm ?? 0).toFixed(4) }}</text>

    <rect x="190" y="206" width="238" height="14" rx="7" class="gauge-bg" />
    <rect
      x="190"
      y="206"
      :width="Math.max(0, Math.min(1, obs?.concurrence ?? 0)) * 238"
      height="14"
      rx="7"
      fill="url(#entGauge)"
    />
    <text x="190" y="198" class="label">Entanglement gauge</text>

    <line x1="184" :y1="barBaseY" x2="432" :y2="barBaseY" class="bar-axis" />

    <rect x="198" :y="barBaseY - barHeight(probs[0])" width="36" :height="barHeight(probs[0])" class="bar p00" />
    <rect x="252" :y="barBaseY - barHeight(probs[1])" width="36" :height="barHeight(probs[1])" class="bar p01" />
    <rect x="306" :y="barBaseY - barHeight(probs[2])" width="36" :height="barHeight(probs[2])" class="bar p10" />
    <rect x="360" :y="barBaseY - barHeight(probs[3])" width="36" :height="barHeight(probs[3])" class="bar p11" />

    <text x="203" y="342" class="bar-label">00</text>
    <text x="257" y="342" class="bar-label">01</text>
    <text x="311" y="342" class="bar-label">10</text>
    <text x="365" y="342" class="bar-label">11</text>
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 480px;
  height: auto;
}

.sphere {
  stroke: #90a8ce;
  stroke-width: 1.2;
}

.grid {
  fill: none;
  stroke: #7a93bb;
  stroke-width: 1;
  stroke-dasharray: 4 4;
  opacity: 0.8;
}

.grid.subtle {
  opacity: 0.55;
}

.trace-one {
  fill: none;
  stroke: #5968cc;
  stroke-width: 1.35;
  opacity: 0.85;
}

.trace-two {
  fill: none;
  stroke: #34a174;
  stroke-width: 1.35;
  opacity: 0.85;
}

.vector-one {
  stroke: #4353d1;
  stroke-width: 2;
}

.vector-two {
  stroke: #19875d;
  stroke-width: 2;
}

.tip-one {
  fill: #fff;
  stroke: #4353d1;
  stroke-width: 1.8;
}

.tip-two {
  fill: #fff;
  stroke: #19875d;
  stroke-width: 1.8;
}

.title {
  font-size: 11px;
  fill: #21344f;
  font-weight: 600;
}

.stat {
  font-size: 11px;
  fill: #2b3f5d;
}

.label {
  font-size: 10px;
  fill: #30486a;
}

.gauge-bg {
  fill: #e6eefb;
  stroke: #ccdaef;
}

.bar-axis {
  stroke: #9fb1cd;
  stroke-width: 1;
}

.bar {
  stroke: rgba(25, 37, 62, 0.38);
  stroke-width: 0.8;
}

.p00 {
  fill: #4b7ad4;
}

.p01 {
  fill: #6b97ea;
}

.p10 {
  fill: #57b6b3;
}

.p11 {
  fill: #93d067;
}

.bar-label {
  font-size: 10px;
  fill: #29405f;
}
</style>

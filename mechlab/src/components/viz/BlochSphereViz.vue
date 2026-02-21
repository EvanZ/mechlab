<script setup lang="ts">
import { computed } from "vue";
import { blochSphereObservablesFromState } from "../../systems/ode/blochsphere";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 460;
const height = 330;

const centerX = 170;
const centerY = 165;
const radius = 108;

const yaw = -Math.PI / 5;
const pitch = Math.PI / 8;

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const state = computed(() => props.states[safeIndex.value] ?? []);

interface ProjPoint {
  x: number;
  y: number;
  depth: number;
}

function projectPoint(px: number, py: number, pz: number): ProjPoint {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  const x1 = px * cosYaw - py * sinYaw;
  const y1 = px * sinYaw + py * cosYaw;
  const z1 = pz;

  const y2 = y1 * cosPitch - z1 * sinPitch;
  const z2 = y1 * sinPitch + z1 * cosPitch;

  return {
    x: centerX + radius * x1,
    y: centerY - radius * y2,
    depth: z2
  };
}

function sampleGreatCircle(sampleFn: (t: number) => [number, number, number], segments = 160): string {
  const parts: string[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * 2 * Math.PI;
    const [x, y, z] = sampleFn(t);
    const p = projectPoint(x, y, z);
    parts.push(`${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  }

  return parts.join(" ");
}

const equatorPath = computed(() => sampleGreatCircle((t) => [Math.cos(t), Math.sin(t), 0]));
const meridianXPath = computed(() => sampleGreatCircle((t) => [Math.cos(t), 0, Math.sin(t)]));
const meridianYPath = computed(() => sampleGreatCircle((t) => [0, Math.cos(t), Math.sin(t)]));

const currentObs = computed(() => {
  if (state.value.length !== 4) {
    return null;
  }
  return blochSphereObservablesFromState(state.value, props.params);
});

const currentTip = computed(() => {
  if (!currentObs.value) {
    return projectPoint(0, 0, 1);
  }
  return projectPoint(currentObs.value.sx, currentObs.value.sy, currentObs.value.sz);
});

const axisXPos = computed(() => projectPoint(1, 0, 0));
const axisXNeg = computed(() => projectPoint(-1, 0, 0));
const axisYPos = computed(() => projectPoint(0, 1, 0));
const axisYNeg = computed(() => projectPoint(0, -1, 0));
const axisZPos = computed(() => projectPoint(0, 0, 1));
const axisZNeg = computed(() => projectPoint(0, 0, -1));

const tracePath = computed(() => {
  if (props.states.length === 0) {
    return "";
  }

  const lastIndex = safeIndex.value;
  const total = lastIndex + 1;
  const step = Math.max(1, Math.ceil(total / 520));

  const parts: string[] = [];

  for (let i = 0; i <= lastIndex; i += step) {
    const s = props.states[i];
    if (!s || s.length !== 4) {
      continue;
    }

    const obs = blochSphereObservablesFromState(s, props.params);
    const p = projectPoint(obs.sx, obs.sy, obs.sz);
    parts.push(`${parts.length === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  }

  if (lastIndex % step !== 0) {
    const s = props.states[lastIndex];
    if (s && s.length === 4) {
      const obs = blochSphereObservablesFromState(s, props.params);
      const p = projectPoint(obs.sx, obs.sy, obs.sz);
      parts.push(`${parts.length === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
    }
  }

  return parts.join(" ");
});

function formatSigned(value: number, digits = 3): string {
  if (!Number.isFinite(value)) {
    return "0.000";
  }

  const rounded = value.toFixed(digits);
  return value >= 0 ? `+${rounded}` : rounded;
}

function formatComplex(re: number, im: number): string {
  return `${formatSigned(re)} ${im >= 0 ? "+" : "-"} ${Math.abs(im).toFixed(3)}i`;
}

const amplitudes = computed(() => {
  if (state.value.length !== 4) {
    return {
      a: "+1.000 + 0.000i",
      b: "+0.000 + 0.000i"
    };
  }

  const [ar, ai, br, bi] = state.value;

  return {
    a: formatComplex(ar, ai),
    b: formatComplex(br, bi)
  };
});
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <defs>
        <radialGradient id="blochSphereBg" cx="46%" cy="32%" r="72%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#dbe6f7" stop-opacity="0.95" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" :width="width" :height="height" fill="#f8fbff" stroke="#cad8ee" />

      <line :x1="axisXNeg.x" :y1="axisXNeg.y" :x2="axisXPos.x" :y2="axisXPos.y" class="axis axis-x" />
      <line :x1="axisYNeg.x" :y1="axisYNeg.y" :x2="axisYPos.x" :y2="axisYPos.y" class="axis axis-y" />
      <line :x1="axisZNeg.x" :y1="axisZNeg.y" :x2="axisZPos.x" :y2="axisZPos.y" class="axis axis-z" />

      <circle :cx="centerX" :cy="centerY" :r="radius" fill="url(#blochSphereBg)" class="sphere" />

      <path :d="equatorPath" class="great-circle" />
      <path :d="meridianXPath" class="great-circle" />
      <path :d="meridianYPath" class="great-circle meridian-alt" />

      <path :d="tracePath" class="trace" />

      <line :x1="centerX" :y1="centerY" :x2="currentTip.x" :y2="currentTip.y" class="state-vector" />
      <circle :cx="currentTip.x" :cy="currentTip.y" r="5.2" class="state-tip" />

      <text :x="axisXPos.x + 7" :y="axisXPos.y + 4" class="axis-label">+x</text>
      <text :x="axisYPos.x + 7" :y="axisYPos.y + 4" class="axis-label">+y</text>
      <text :x="axisZPos.x + 7" :y="axisZPos.y + 4" class="axis-label">+z</text>

      <text x="298" y="44" class="info-title">|psi> = a|0> + b|1></text>
      <text x="298" y="66" class="info-line">a = {{ amplitudes.a }}</text>
      <text x="298" y="84" class="info-line">b = {{ amplitudes.b }}</text>
      <text x="298" y="110" class="info-line">P0 = {{ (currentObs?.p0 ?? 0).toFixed(3) }}</text>
      <text x="298" y="128" class="info-line">P1 = {{ (currentObs?.p1 ?? 0).toFixed(3) }}</text>
      <text x="298" y="146" class="info-line">s = ({{ (currentObs?.sx ?? 0).toFixed(3) }}, {{ (currentObs?.sy ?? 0).toFixed(3) }}, {{ (currentObs?.sz ?? 0).toFixed(3) }})</text>
      <text x="298" y="164" class="info-line">theta = {{ (currentObs?.theta ?? 0).toFixed(3) }} rad</text>
      <text x="298" y="182" class="info-line">phi = {{ (currentObs?.phi ?? 0).toFixed(3) }} rad</text>
      <text x="298" y="200" class="info-line">Bloch radius = {{ (currentObs?.radius ?? 0).toFixed(4) }}</text>
      <text x="298" y="218" class="info-line">Norm = {{ (currentObs?.norm ?? 0).toFixed(4) }}</text>
    </svg>
  </div>
</template>

<style scoped>
.viz-wrap {
  width: 100%;
  max-width: 480px;
}

.viz {
  width: 100%;
  height: auto;
}

.sphere {
  stroke: #8ea7cf;
  stroke-width: 1.2;
}

.axis {
  stroke-width: 1.2;
  opacity: 0.7;
}

.axis-x {
  stroke: #526b97;
}

.axis-y {
  stroke: #5a7b51;
}

.axis-z {
  stroke: #915764;
}

.axis-label {
  font-size: 10.5px;
  fill: #324766;
  font-weight: 600;
}

.great-circle {
  fill: none;
  stroke: #748fb8;
  stroke-width: 1;
  stroke-dasharray: 4 4;
  opacity: 0.78;
}

.meridian-alt {
  opacity: 0.58;
}

.trace {
  fill: none;
  stroke: #6f5ab8;
  stroke-width: 1.5;
  opacity: 0.85;
}

.state-vector {
  stroke: #c93353;
  stroke-width: 2.2;
}

.state-tip {
  fill: #ffffff;
  stroke: #c93353;
  stroke-width: 2;
}

.info-title {
  font-size: 12px;
  fill: #20324e;
  font-weight: 600;
}

.info-line {
  font-size: 11px;
  fill: #2c405f;
}
</style>

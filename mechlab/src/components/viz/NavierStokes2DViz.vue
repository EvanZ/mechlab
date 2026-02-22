<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  states: number[][];
  index: number;
  params: Record<string, number>;
}>();

const width = 470;
const height = 330;

const fieldLeft = 18;
const fieldTop = 18;
const fieldWidth = 310;
const fieldHeight = 290;

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const safeIndex = computed(() => Math.max(0, Math.min(props.index, Math.max(0, props.states.length - 1))));
const state = computed(() => props.states[safeIndex.value] ?? []);

interface DecodedField {
  nx: number;
  ny: number;
  obstacleX: number;
  obstacleY: number;
  u: number[];
  v: number[];
  p: number[];
}

function emptyDecodedField(): DecodedField {
  const nx = 24;
  const ny = 16;
  const cells = nx * ny;
  return {
    nx,
    ny,
    obstacleX: finiteOr(props.params.obstacleX, 1.8),
    obstacleY: finiteOr(props.params.obstacleY, 0),
    u: new Array<number>(cells).fill(0),
    v: new Array<number>(cells).fill(0),
    p: new Array<number>(cells).fill(0)
  };
}

const decoded = computed<DecodedField>(() => {
  if (state.value.length < 8) {
    return emptyDecodedField();
  }

  const nx = clamp(Math.round(finiteOr(state.value[0], 24)), 8, 128);
  const ny = clamp(Math.round(finiteOr(state.value[1], 16)), 8, 96);
  const cells = nx * ny;
  const needed = 4 + 3 * cells;

  if (state.value.length < needed) {
    return emptyDecodedField();
  }

  const offset = 4;
  return {
    nx,
    ny,
    obstacleX: finiteOr(state.value[2], finiteOr(props.params.obstacleX, 1.8)),
    obstacleY: finiteOr(state.value[3], finiteOr(props.params.obstacleY, 0)),
    u: state.value.slice(offset, offset + cells),
    v: state.value.slice(offset + cells, offset + 2 * cells),
    p: state.value.slice(offset + 2 * cells, offset + 3 * cells)
  };
});

const domain = computed(() => {
  const xMin = finiteOr(props.params.xMin, -2);
  const xMaxRaw = finiteOr(props.params.xMax, 8);
  const xMax = xMaxRaw > xMin + 1e-6 ? xMaxRaw : xMin + 1;
  const yMin = finiteOr(props.params.yMin, -2.5);
  const yMaxRaw = finiteOr(props.params.yMax, 2.5);
  const yMax = yMaxRaw > yMin + 1e-6 ? yMaxRaw : yMin + 1;
  return { xMin, xMax, yMin, yMax };
});

function worldX(i: number): number {
  return domain.value.xMin + (i / Math.max(1, decoded.value.nx - 1)) * (domain.value.xMax - domain.value.xMin);
}

function worldY(j: number): number {
  return domain.value.yMin + (j / Math.max(1, decoded.value.ny - 1)) * (domain.value.yMax - domain.value.yMin);
}

function mapX(x: number): number {
  const ratio = (x - domain.value.xMin) / (domain.value.xMax - domain.value.xMin || 1);
  return fieldLeft + ratio * fieldWidth;
}

function mapY(y: number): number {
  const ratio = (y - domain.value.yMin) / (domain.value.yMax - domain.value.yMin || 1);
  return fieldTop + (1 - ratio) * fieldHeight;
}

const cellScale = computed(() => {
  const w = fieldWidth / Math.max(1, decoded.value.nx);
  const h = fieldHeight / Math.max(1, decoded.value.ny);
  return { w, h };
});

function idx(i: number, j: number): number {
  return j * decoded.value.nx + i;
}

const maxSpeed = computed(() => {
  let maxVal = 1e-9;
  for (let k = 0; k < decoded.value.u.length; k += 1) {
    const speed = Math.hypot(decoded.value.u[k] ?? 0, decoded.value.v[k] ?? 0);
    maxVal = Math.max(maxVal, speed);
  }
  return maxVal;
});

interface HeatCell {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

function speedColor(speed: number): string {
  const normalized = clamp(speed / Math.max(maxSpeed.value, 1e-9), 0, 1);
  const hue = 220 - 170 * normalized;
  const sat = 78;
  const light = 96 - 52 * normalized;
  return `hsl(${hue.toFixed(1)} ${sat}% ${light.toFixed(1)}%)`;
}

const heatCells = computed<HeatCell[]>(() => {
  const cells: HeatCell[] = [];
  const nx = decoded.value.nx;
  const ny = decoded.value.ny;

  const stepX = Math.max(1, Math.floor(nx / 70));
  const stepY = Math.max(1, Math.floor(ny / 60));

  const obstacleR = Math.max(0.1, finiteOr(props.params.obstacleR, 0.55));
  const obstacleR2 = obstacleR * obstacleR;

  for (let j = 0; j < ny; j += stepY) {
    for (let i = 0; i < nx; i += stepX) {
      const x = worldX(i);
      const y = worldY(j);
      const dxObs = x - decoded.value.obstacleX;
      const dyObs = y - decoded.value.obstacleY;
      if (dxObs * dxObs + dyObs * dyObs <= obstacleR2) {
        continue;
      }

      const k = idx(i, j);
      const speed = Math.hypot(decoded.value.u[k] ?? 0, decoded.value.v[k] ?? 0);

      cells.push({
        x: mapX(x),
        y: mapY(y),
        w: Math.max(0.9, cellScale.value.w * stepX * 1.02),
        h: Math.max(0.9, cellScale.value.h * stepY * 1.02),
        fill: speedColor(speed)
      });
    }
  }

  return cells;
});

interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const streamlines = computed<LineSegment[]>(() => {
  const lines: LineSegment[] = [];
  const nx = decoded.value.nx;
  const ny = decoded.value.ny;

  const sampleX = 16;
  const sampleY = 12;
  const stepLen = 0.35 * Math.min(
    (domain.value.xMax - domain.value.xMin) / sampleX,
    (domain.value.yMax - domain.value.yMin) / sampleY
  );

  for (let row = 0; row < sampleY; row += 1) {
    const y = domain.value.yMin + ((row + 0.5) / sampleY) * (domain.value.yMax - domain.value.yMin);
    for (let col = 0; col < sampleX; col += 1) {
      const x = domain.value.xMin + ((col + 0.5) / sampleX) * (domain.value.xMax - domain.value.xMin);

      const gx = clamp(Math.round(((x - domain.value.xMin) / (domain.value.xMax - domain.value.xMin || 1)) * (nx - 1)), 0, nx - 1);
      const gy = clamp(Math.round(((y - domain.value.yMin) / (domain.value.yMax - domain.value.yMin || 1)) * (ny - 1)), 0, ny - 1);
      const k = idx(gx, gy);
      const u = decoded.value.u[k] ?? 0;
      const v = decoded.value.v[k] ?? 0;
      const mag = Math.hypot(u, v);
      if (mag <= 1e-5) {
        continue;
      }

      const ux = u / mag;
      const uy = v / mag;
      const x2 = x + stepLen * ux;
      const y2 = y + stepLen * uy;

      lines.push({
        x1: mapX(x),
        y1: mapY(y),
        x2: mapX(x2),
        y2: mapY(y2)
      });
    }
  }

  return lines;
});

const obstacleCircle = computed(() => {
  const r = Math.max(0.1, finiteOr(props.params.obstacleR, 0.55));
  const rx = Math.abs(mapX(decoded.value.obstacleX + r) - mapX(decoded.value.obstacleX));
  const ry = Math.abs(mapY(decoded.value.obstacleY + r) - mapY(decoded.value.obstacleY));
  return {
    cx: mapX(decoded.value.obstacleX),
    cy: mapY(decoded.value.obstacleY),
    r: 0.5 * (rx + ry)
  };
});

const summary = computed(() => {
  let meanSpeed = 0;
  for (let k = 0; k < decoded.value.u.length; k += 1) {
    meanSpeed += Math.hypot(decoded.value.u[k] ?? 0, decoded.value.v[k] ?? 0);
  }
  const n = Math.max(1, decoded.value.u.length);
  const nu = Math.max(1e-6, finiteOr(props.params.nu, 0.03));
  const inflowU = finiteOr(props.params.inflowU, 1);
  const obstacleR = Math.max(0.1, finiteOr(props.params.obstacleR, 0.55));
  const reynolds = (Math.abs(inflowU) * 2 * obstacleR) / nu;

  return {
    meanSpeed: meanSpeed / n,
    maxSpeed: maxSpeed.value,
    reynolds
  };
});
</script>

<template>
  <div class="viz-wrap">
    <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
      <defs>
        <linearGradient id="nsBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f8fbff" />
          <stop offset="100%" stop-color="#eaf2ff" />
        </linearGradient>
        <marker id="ns-arrow" markerWidth="6" markerHeight="6" refX="5.4" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill="#7f96bb" />
        </marker>
      </defs>

      <rect x="0" y="0" :width="width" :height="height" fill="url(#nsBg)" stroke="#cad8ed" />
      <rect
        :x="fieldLeft"
        :y="fieldTop"
        :width="fieldWidth"
        :height="fieldHeight"
        fill="#edf3ff"
        stroke="#b8cae6"
      />

      <rect
        v-for="(cell, i) in heatCells"
        :key="`cell-${i}`"
        :x="cell.x"
        :y="cell.y"
        :width="cell.w"
        :height="cell.h"
        :fill="cell.fill"
      />

      <line
        v-for="(line, i) in streamlines"
        :key="`line-${i}`"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        class="stream"
        marker-end="url(#ns-arrow)"
      />

      <circle :cx="obstacleCircle.cx" :cy="obstacleCircle.cy" :r="obstacleCircle.r" class="obstacle" />

      <text x="338" y="34" class="label">Obstacle Flow</text>
      <text x="338" y="54" class="label">Heat = |u|</text>
      <text x="338" y="72" class="label">Lines = stream direction</text>
      <text x="338" y="98" class="label">Re {{ summary.reynolds.toFixed(1) }}</text>
      <text x="338" y="116" class="label">mean |u| {{ summary.meanSpeed.toFixed(3) }}</text>
      <text x="338" y="134" class="label">max |u| {{ summary.maxSpeed.toFixed(3) }}</text>
    </svg>

    <div class="stats">
      <span>Re {{ summary.reynolds.toFixed(1) }}</span>
      <span>mean |u| {{ summary.meanSpeed.toFixed(3) }}</span>
      <span>max |u| {{ summary.maxSpeed.toFixed(3) }}</span>
    </div>
  </div>
</template>

<style scoped>
.viz-wrap {
  width: 100%;
  max-width: 500px;
  display: grid;
  gap: 0.35rem;
}

.viz {
  width: 100%;
  height: auto;
}

.stream {
  stroke: #7f96bb;
  stroke-width: 1;
  opacity: 0.88;
}

.obstacle {
  fill: #2f3d59;
  stroke: #162036;
  stroke-width: 1.1;
}

.label {
  font-size: 11px;
  fill: #22324f;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  font-size: 0.74rem;
  color: #334967;
}
</style>

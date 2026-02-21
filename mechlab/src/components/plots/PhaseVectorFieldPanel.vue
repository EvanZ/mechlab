<script setup lang="ts">
import { computed } from "vue";
import { decimateMinMax } from "../../compute/decimate";
import SvgPlotFrame from "./SvgPlotFrame.vue";

interface SlotGeometry {
  plotLeft: number;
  plotTop: number;
  plotWidth: number;
  plotHeight: number;
}

const props = withDefaults(
  defineProps<{
    title: string;
    xLabel: string;
    yLabel: string;
    rhs: (t: number, y: number[], params: Record<string, number>) => number[];
    params: Record<string, number>;
    baselineState: number[];
    coordStateXIndex: number;
    coordStateYIndex: number;
    vectorDerivativeXIndex: number;
    vectorDerivativeYIndex: number;
    trajectoryX: number[];
    trajectoryY: number[];
    width?: number;
    height?: number;
  }>(),
  {
    width: 460,
    height: 290
  }
);

const gridCols = 17;
const gridRows = 13;
const markerId = "vf-arrow-head";

function expandBounds(min: number, max: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [-1, 1];
  }

  if (min === max) {
    const delta = Math.abs(min) < 1 ? 1 : Math.abs(min) * 0.1;
    return [min - delta, max + delta];
  }

  const pad = (max - min) * 0.1;
  return [min - pad, max + pad];
}

const finiteTrajectory = computed(() => {
  const n = Math.min(props.trajectoryX.length, props.trajectoryY.length);
  const x: number[] = [];
  const y: number[] = [];

  for (let i = 0; i < n; i += 1) {
    const xValue = props.trajectoryX[i];
    const yValue = props.trajectoryY[i];
    if (Number.isFinite(xValue) && Number.isFinite(yValue)) {
      x.push(xValue);
      y.push(yValue);
    }
  }

  return { x, y };
});

const trajectory = computed(() => decimateMinMax(finiteTrajectory.value.x, finiteTrajectory.value.y, props.width * 2));

const bounds = computed(() => {
  if (trajectory.value.x.length < 2 || trajectory.value.y.length < 2) {
    return { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
  }

  const [xMin, xMax] = expandBounds(Math.min(...trajectory.value.x), Math.max(...trajectory.value.x));
  const [yMin, yMax] = expandBounds(Math.min(...trajectory.value.y), Math.max(...trajectory.value.y));

  return { xMin, xMax, yMin, yMax };
});

interface PhaseVector {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const vectors = computed<PhaseVector[]>(() => {
  const list: PhaseVector[] = [];
  const xSpan = bounds.value.xMax - bounds.value.xMin;
  const ySpan = bounds.value.yMax - bounds.value.yMin;

  for (let row = 0; row < gridRows; row += 1) {
    const yr = row / Math.max(1, gridRows - 1);
    const y = bounds.value.yMin + (1 - yr) * ySpan;

    for (let col = 0; col < gridCols; col += 1) {
      const xr = col / Math.max(1, gridCols - 1);
      const x = bounds.value.xMin + xr * xSpan;

      const state = [...props.baselineState];
      state[props.coordStateXIndex] = x;
      state[props.coordStateYIndex] = y;

      const derivative = props.rhs(0, state, props.params);
      const vx = derivative[props.vectorDerivativeXIndex] ?? 0;
      const vy = derivative[props.vectorDerivativeYIndex] ?? 0;

      if (Number.isFinite(vx) && Number.isFinite(vy)) {
        list.push({ x, y, vx, vy });
      }
    }
  }

  return list;
});

const vectorScale = computed(() => {
  const maxMag = vectors.value.reduce((acc, vector) => Math.max(acc, Math.hypot(vector.vx, vector.vy)), 0);

  if (maxMag <= 1e-12) {
    return 0;
  }

  const xSpacing = (bounds.value.xMax - bounds.value.xMin) / Math.max(1, gridCols - 1);
  const ySpacing = (bounds.value.yMax - bounds.value.yMin) / Math.max(1, gridRows - 1);
  const target = 0.5 * Math.min(xSpacing, ySpacing);

  return target / maxMag;
});

function toScreenX(x: number, slot: SlotGeometry): number {
  const ratio = (x - bounds.value.xMin) / (bounds.value.xMax - bounds.value.xMin || 1);
  return slot.plotLeft + ratio * slot.plotWidth;
}

function toScreenY(y: number, slot: SlotGeometry): number {
  const ratio = (y - bounds.value.yMin) / (bounds.value.yMax - bounds.value.yMin || 1);
  return slot.plotTop + slot.plotHeight - ratio * slot.plotHeight;
}

function trajectoryPath(slot: SlotGeometry): string {
  if (trajectory.value.x.length < 2) {
    return "";
  }

  const segments: string[] = [];

  for (let i = 0; i < trajectory.value.x.length; i += 1) {
    const x = toScreenX(trajectory.value.x[i], slot);
    const y = toScreenY(trajectory.value.y[i], slot);
    segments.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return segments.join(" ");
}

function screenVector(vector: PhaseVector, slot: SlotGeometry): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} {
  const x2 = vector.x + vector.vx * vectorScale.value;
  const y2 = vector.y + vector.vy * vectorScale.value;

  return {
    x1: toScreenX(vector.x, slot),
    y1: toScreenY(vector.y, slot),
    x2: toScreenX(x2, slot),
    y2: toScreenY(y2, slot)
  };
}
</script>

<template>
  <div class="panel">
    <SvgPlotFrame
      :title="title"
      :x-label="xLabel"
      :y-label="yLabel"
      :x-min="bounds.xMin"
      :x-max="bounds.xMax"
      :y-min="bounds.yMin"
      :y-max="bounds.yMax"
      :width="width"
      :height="height"
    >
      <template #default="slotProps">
        <defs>
          <marker
            :id="markerId"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L7,3.5 L0,7 z" fill="#7a8eaf" />
          </marker>
        </defs>

        <g>
          <line
            v-for="(vector, index) in vectors"
            :key="`vec-${index}`"
            :x1="screenVector(vector, slotProps).x1"
            :y1="screenVector(vector, slotProps).y1"
            :x2="screenVector(vector, slotProps).x2"
            :y2="screenVector(vector, slotProps).y2"
            stroke="#7a8eaf"
            stroke-width="1"
            :marker-end="`url(#${markerId})`"
            opacity="0.8"
          />
        </g>

        <path :d="trajectoryPath(slotProps)" class="trajectory" />
      </template>
    </SvgPlotFrame>
  </div>
</template>

<style scoped>
.panel {
  background: #fff;
  border: 1px solid #ced9ec;
  border-radius: 10px;
  padding: 0.25rem;
}

.trajectory {
  fill: none;
  stroke: #1f6feb;
  stroke-width: 1.8;
}
</style>

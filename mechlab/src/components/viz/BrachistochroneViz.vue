<script setup lang="ts">
import { computed } from "vue";

interface Point {
  x: number;
  y: number;
}

const props = withDefaults(
  defineProps<{
    points: Point[];
    referencePoints?: Point[];
    beadProgress?: number;
  }>(),
  {
    referencePoints: () => [],
    beadProgress: 0
  }
);

const width = 430;
const height = 300;
const pad = 22;

const bounds = computed(() => {
  const allPoints = [...props.points, ...props.referencePoints];
  if (allPoints.length === 0) {
    return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  }

  const xs = allPoints.map((point) => point.x);
  const ys = allPoints.map((point) => point.y);

  const xMinRaw = Math.min(...xs);
  const xMaxRaw = Math.max(...xs);
  const yMinRaw = Math.min(...ys);
  const yMaxRaw = Math.max(...ys);

  const xSpan = Math.max(1e-6, xMaxRaw - xMinRaw);
  const ySpan = Math.max(1e-6, yMaxRaw - yMinRaw);

  return {
    xMin: xMinRaw - 0.08 * xSpan,
    xMax: xMaxRaw + 0.08 * xSpan,
    yMin: yMinRaw - 0.08 * ySpan,
    yMax: yMaxRaw + 0.08 * ySpan
  };
});

function mapX(x: number): number {
  const ratio = (x - bounds.value.xMin) / (bounds.value.xMax - bounds.value.xMin || 1);
  return pad + ratio * (width - 2 * pad);
}

function mapY(y: number): number {
  const ratio = (y - bounds.value.yMin) / (bounds.value.yMax - bounds.value.yMin || 1);
  return pad + ratio * (height - 2 * pad);
}

function pathFromPoints(points: Point[]): string {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`)
    .join(" ");
}

const optimizedPath = computed(() => pathFromPoints(props.points));
const straightPath = computed(() => pathFromPoints(props.referencePoints));

const bead = computed(() => {
  if (props.points.length === 0) {
    return { x: mapX(0), y: mapY(0) };
  }

  if (props.points.length === 1) {
    return { x: mapX(props.points[0].x), y: mapY(props.points[0].y) };
  }

  const cumulativeLengths = new Array<number>(props.points.length).fill(0);
  for (let i = 1; i < props.points.length; i += 1) {
    const prev = props.points[i - 1];
    const curr = props.points[i];
    cumulativeLengths[i] = cumulativeLengths[i - 1] + Math.hypot(curr.x - prev.x, curr.y - prev.y);
  }

  const totalLength = cumulativeLengths[cumulativeLengths.length - 1];
  if (totalLength <= 0) {
    return { x: mapX(props.points[0].x), y: mapY(props.points[0].y) };
  }

  const target = Math.max(0, Math.min(1, props.beadProgress)) * totalLength;

  let idx = 1;
  while (idx < cumulativeLengths.length && cumulativeLengths[idx] < target) {
    idx += 1;
  }

  const prevIdx = Math.max(0, idx - 1);
  const nextIdx = Math.min(props.points.length - 1, idx);
  const segStart = props.points[prevIdx];
  const segEnd = props.points[nextIdx];
  const segLen = cumulativeLengths[nextIdx] - cumulativeLengths[prevIdx];
  const localRatio = segLen > 0 ? (target - cumulativeLengths[prevIdx]) / segLen : 0;

  const x = segStart.x + (segEnd.x - segStart.x) * localRatio;
  const y = segStart.y + (segEnd.y - segStart.y) * localRatio;

  return { x: mapX(x), y: mapY(y) };
});
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="viz">
    <rect x="0" y="0" :width="width" :height="height" fill="#fbfdff" stroke="#ccd8ea" />

    <line :x1="pad" :y1="pad" :x2="pad" :y2="height - pad" class="axis" />
    <line :x1="pad" :y1="pad" :x2="width - pad" :y2="pad" class="axis" />

    <path :d="straightPath" class="reference" />
    <path :d="optimizedPath" class="curve" />
    <circle :cx="bead.x" :cy="bead.y" r="6" class="bead" />
  </svg>
</template>

<style scoped>
.viz {
  width: 100%;
  max-width: 460px;
  height: auto;
}

.axis {
  stroke: #8a9ab5;
  stroke-width: 1.2;
}

.reference {
  stroke: #9ca9c0;
  stroke-width: 2;
  stroke-dasharray: 5 5;
  fill: none;
}

.curve {
  stroke: #1f6feb;
  stroke-width: 2.2;
  fill: none;
}

.bead {
  fill: #df4a4a;
}
</style>

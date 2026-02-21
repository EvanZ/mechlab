<script setup lang="ts">
import { computed, ref } from "vue";
import {
  defaultHillProfile,
  normalizeHillProfile,
  type HillPoint
} from "../../systems/ode/hillProfile";

const props = withDefaults(
  defineProps<{
    points: HillPoint[];
    width?: number;
    height?: number;
  }>(),
  {
    width: 270,
    height: 150
  }
);

const emit = defineEmits<{
  "update:points": [value: HillPoint[]];
}>();

const xMin = 0;
const xMax = 10;
const yMin = 0;
const yMax = 4;

const drawing = ref(false);
const draft = ref<HillPoint[]>([]);
const stageRef = ref<SVGSVGElement | null>(null);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function xToScreen(x: number): number {
  const ratio = (x - xMin) / (xMax - xMin || 1);
  return ratio * props.width;
}

function yToScreen(y: number): number {
  const ratio = (y - yMin) / (yMax - yMin || 1);
  return props.height - ratio * props.height;
}

function screenToWorld(clientX: number, clientY: number): HillPoint {
  const stage = stageRef.value;
  if (!stage) {
    return { x: xMin, y: yMax };
  }

  const rect = stage.getBoundingClientRect();
  const sx = clamp(clientX - rect.left, 0, rect.width);
  const sy = clamp(clientY - rect.top, 0, rect.height);

  const x = xMin + (sx / Math.max(1e-9, rect.width)) * (xMax - xMin);
  const y = yMin + ((rect.height - sy) / Math.max(1e-9, rect.height)) * (yMax - yMin);

  return { x, y };
}

function pointerDown(event: PointerEvent): void {
  const stage = event.currentTarget as SVGSVGElement;
  stage.setPointerCapture(event.pointerId);
  drawing.value = true;
  draft.value = [screenToWorld(event.clientX, event.clientY)];
}

function pointerMove(event: PointerEvent): void {
  if (!drawing.value) {
    return;
  }
  const point = screenToWorld(event.clientX, event.clientY);
  const last = draft.value[draft.value.length - 1];
  if (!last || Math.abs(last.x - point.x) > 0.015 || Math.abs(last.y - point.y) > 0.015) {
    draft.value = [...draft.value, point];
  }
}

function finishDrawing(event: PointerEvent): void {
  if (!drawing.value) {
    return;
  }

  const stage = event.currentTarget as SVGSVGElement;
  if (stage.hasPointerCapture(event.pointerId)) {
    stage.releasePointerCapture(event.pointerId);
  }

  drawing.value = false;
  const finalized = normalizeHillProfile(draft.value, 120);
  draft.value = [];
  emit("update:points", finalized);
}

function resetToDefault(): void {
  emit("update:points", defaultHillProfile.map((point) => ({ ...point })));
}

const displayPoints = computed(() =>
  drawing.value && draft.value.length > 1 ? draft.value : props.points
);

const pathD = computed(() => {
  if (displayPoints.value.length < 2) {
    return "";
  }

  return displayPoints.value
    .map((point, index) => {
      const x = xToScreen(point.x);
      const y = yToScreen(point.y);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
});
</script>

<template>
  <section class="editor">
    <div class="editor-header">
      <h4>Draw Hill Profile</h4>
      <button type="button" class="reset" @click="resetToDefault">Reset</button>
    </div>

    <svg
      ref="stageRef"
      :viewBox="`0 0 ${width} ${height}`"
      class="stage"
      @pointerdown="pointerDown"
      @pointermove="pointerMove"
      @pointerup="finishDrawing"
      @pointercancel="finishDrawing"
      @pointerleave="finishDrawing"
    >
      <defs>
        <linearGradient id="hillEditorBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f9fbff" />
          <stop offset="100%" stop-color="#ebf2ff" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" :width="width" :height="height" fill="url(#hillEditorBg)" />
      <line :x1="0" :y1="height - 1" :x2="width" :y2="height - 1" class="axis" />
      <line x1="0" y1="0" x2="0" :y2="height" class="axis" />

      <path :d="pathD" class="curve" />
    </svg>

    <p class="hint">Click-drag left to right to sketch the hill. X range: 0-10, Y range: 0-4.</p>
  </section>
</template>

<style scoped>
.editor {
  display: grid;
  gap: 0.35rem;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h4 {
  margin: 0;
  font-size: 0.8rem;
}

.reset {
  border: 1px solid #b8c8e2;
  border-radius: 6px;
  background: #fff;
  padding: 0.12rem 0.45rem;
  font-size: 0.72rem;
  cursor: pointer;
}

.stage {
  width: 100%;
  border: 1px solid #cdd8ea;
  border-radius: 8px;
  touch-action: none;
  cursor: crosshair;
}

.axis {
  stroke: #8095ba;
  stroke-width: 1;
}

.curve {
  fill: none;
  stroke: #1f6feb;
  stroke-width: 2.2;
}

.hint {
  margin: 0;
  font-size: 0.72rem;
  color: #40506b;
}
</style>

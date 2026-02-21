<script setup lang="ts">
import { computed, ref } from "vue";
import {
  defaultMuscleCurve,
  muscleCurveBounds,
  normalizeMuscleCurve,
  type MuscleCurvePoint
} from "../../systems/ode/muscleCurve";

const props = withDefaults(
  defineProps<{
    points: MuscleCurvePoint[];
    width?: number;
    height?: number;
  }>(),
  {
    width: 270,
    height: 150
  }
);

const emit = defineEmits<{
  "update:points": [value: MuscleCurvePoint[]];
}>();

const drawing = ref(false);
const draft = ref<MuscleCurvePoint[]>([]);
const stageRef = ref<SVGSVGElement | null>(null);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lToScreen(l: number): number {
  const ratio = (l - muscleCurveBounds.lMin) / (muscleCurveBounds.lMax - muscleCurveBounds.lMin || 1);
  return ratio * props.width;
}

function fToScreen(f: number): number {
  const ratio = (f - muscleCurveBounds.fMin) / (muscleCurveBounds.fMax - muscleCurveBounds.fMin || 1);
  return props.height - ratio * props.height;
}

function screenToCurve(clientX: number, clientY: number): MuscleCurvePoint {
  const stage = stageRef.value;
  if (!stage) {
    return { l: muscleCurveBounds.lMin, f: 0 };
  }

  const rect = stage.getBoundingClientRect();
  const sx = clamp(clientX - rect.left, 0, rect.width);
  const sy = clamp(clientY - rect.top, 0, rect.height);

  const l =
    muscleCurveBounds.lMin +
    (sx / Math.max(1e-9, rect.width)) * (muscleCurveBounds.lMax - muscleCurveBounds.lMin);
  const f =
    muscleCurveBounds.fMin +
    ((rect.height - sy) / Math.max(1e-9, rect.height)) *
      (muscleCurveBounds.fMax - muscleCurveBounds.fMin);

  return { l, f };
}

function pointerDown(event: PointerEvent): void {
  const stage = event.currentTarget as SVGSVGElement;
  stage.setPointerCapture(event.pointerId);
  drawing.value = true;
  draft.value = [screenToCurve(event.clientX, event.clientY)];
}

function pointerMove(event: PointerEvent): void {
  if (!drawing.value) {
    return;
  }

  const point = screenToCurve(event.clientX, event.clientY);
  const last = draft.value[draft.value.length - 1];
  if (!last || Math.abs(last.l - point.l) > 0.006 || Math.abs(last.f - point.f) > 0.01) {
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
  const curve = normalizeMuscleCurve(draft.value, 110);
  draft.value = [];
  emit("update:points", curve);
}

function resetCurve(): void {
  emit("update:points", defaultMuscleCurve.map((point) => ({ ...point })));
}

const displayPoints = computed(() =>
  drawing.value && draft.value.length > 1 ? draft.value : props.points
);

const curvePath = computed(() => {
  if (displayPoints.value.length < 2) {
    return "";
  }

  return displayPoints.value
    .map((point, index) => {
      const x = lToScreen(point.l);
      const y = fToScreen(point.f);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
});
</script>

<template>
  <section class="editor">
    <div class="editor-header">
      <h4>Draw Length-Tension Curve</h4>
      <button type="button" class="reset" @click="resetCurve">Reset</button>
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
        <linearGradient id="muscleCurveBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#fff9f2" />
          <stop offset="100%" stop-color="#fff0e2" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" :width="width" :height="height" fill="url(#muscleCurveBg)" />
      <line :x1="0" :y1="height - 1" :x2="width" :y2="height - 1" class="axis" />
      <line x1="0" y1="0" x2="0" :y2="height" class="axis" />
      <path :d="curvePath" class="curve" />
    </svg>

    <p class="hint">Horizontal axis: normalized length l. Vertical axis: normalized active force scale f_l(l).</p>
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
  border: 1px solid #e2c3a7;
  border-radius: 6px;
  background: #fff;
  padding: 0.12rem 0.45rem;
  font-size: 0.72rem;
  cursor: pointer;
}

.stage {
  width: 100%;
  border: 1px solid #e4cdb8;
  border-radius: 8px;
  touch-action: none;
  cursor: crosshair;
}

.axis {
  stroke: #b28d6f;
  stroke-width: 1;
}

.curve {
  fill: none;
  stroke: #d66f25;
  stroke-width: 2.2;
}

.hint {
  margin: 0;
  font-size: 0.72rem;
  color: #5f4a36;
}
</style>

<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  index: number;
  max: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:index": [value: number];
}>();

const dialRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);

const safeMax = computed(() => Math.max(0, props.max));
const clampedIndex = computed(() =>
  Math.max(0, Math.min(safeMax.value, Number.isFinite(props.index) ? Math.round(props.index) : 0))
);
const progress = computed(() => (safeMax.value > 0 ? clampedIndex.value / safeMax.value : 0));
const frameLabel = computed(() => `${clampedIndex.value}`);
const ringStyle = computed(() => ({
  "--progress": progress.value.toString()
}));

function emitIndex(nextIndex: number): void {
  const capped = Math.max(0, Math.min(safeMax.value, Math.round(nextIndex)));
  emit("update:index", capped);
}

function updateFromPointer(clientX: number, clientY: number): void {
  const dial = dialRef.value;
  if (!dial || props.disabled) {
    return;
  }

  const rect = dial.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;

  if (dx === 0 && dy === 0) {
    return;
  }

  let angle = Math.atan2(dy, dx) + Math.PI / 2;
  if (angle < 0) {
    angle += Math.PI * 2;
  }

  const normalized = angle / (Math.PI * 2);
  emitIndex(normalized * safeMax.value);
}

function onPointerDown(event: PointerEvent): void {
  if (props.disabled) {
    return;
  }

  isDragging.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  updateFromPointer(event.clientX, event.clientY);
}

function onPointerMove(event: PointerEvent): void {
  if (!isDragging.value || props.disabled) {
    return;
  }
  updateFromPointer(event.clientX, event.clientY);
}

function onPointerUp(event: PointerEvent): void {
  if (!isDragging.value) {
    return;
  }
  isDragging.value = false;
  (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
}

function onDialKeydown(event: KeyboardEvent): void {
  if (props.disabled) {
    return;
  }

  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    emitIndex(clampedIndex.value + 1);
    event.preventDefault();
    return;
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    emitIndex(clampedIndex.value - 1);
    event.preventDefault();
    return;
  }

  if (event.key === "Home") {
    emitIndex(0);
    event.preventDefault();
    return;
  }

  if (event.key === "End") {
    emitIndex(safeMax.value);
    event.preventDefault();
  }
}
</script>

<template>
  <div class="scrubber">
    <div
      ref="dialRef"
      class="dial"
      :class="{ disabled: disabled }"
      role="slider"
      aria-label="time progress"
      :aria-valuemin="0"
      :aria-valuemax="safeMax"
      :aria-valuenow="clampedIndex"
      :aria-disabled="disabled ? 'true' : 'false'"
      tabindex="0"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onDialKeydown"
    >
      <div class="ring" :style="ringStyle" aria-hidden="true">
        <div class="ring-inner" />
      </div>

      <div class="center">
        <span class="display">
          <span class="frame">{{ frameLabel }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrubber {
  display: inline-grid;
  justify-items: center;
  gap: 0.2rem;
}

.dial {
  width: 78px;
  height: 78px;
  position: relative;
  border-radius: 999px;
  cursor: pointer;
  touch-action: none;
  outline: none;
}

.dial:focus-visible {
  box-shadow: 0 0 0 2px rgba(31, 111, 235, 0.35);
}

.dial.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ring {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: conic-gradient(
    #1f6feb calc(var(--progress) * 1turn),
    #d8e2f1 0turn
  );
  display: grid;
  place-items: center;
  transition: background 120ms linear;
}

.ring-inner {
  width: 62px;
  height: 62px;
  border-radius: 999px;
  background: #060a12;
  border: 1px solid #1f2a3f;
}

.center {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.display {
  min-width: 48px;
  padding: 0.14rem 0.28rem;
  border-radius: 4px;
  background: linear-gradient(180deg, #0e1522, #141d2d);
  border: 1px solid #2a354c;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 -1px 2px rgba(0, 0, 0, 0.5);
}

.frame {
  display: block;
  text-align: center;
  font-size: 0.86rem;
  font-weight: 700;
  font-family: "Courier New", "Lucida Console", monospace;
  letter-spacing: 0.05em;
  color: #ff9e2c;
  text-shadow:
    0 0 3px rgba(255, 140, 0, 0.75),
    0 0 7px rgba(255, 140, 0, 0.35);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
</style>

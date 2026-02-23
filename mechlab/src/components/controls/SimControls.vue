<script setup lang="ts">
defineProps<{
  running: boolean;
  canRun: boolean;
}>();

defineEmits<{
  run: [];
  pause: [];
  reset: [];
}>();
</script>

<template>
  <div class="controls" role="group" aria-label="simulation controls">
    <button
      type="button"
      class="icon-btn"
      :disabled="!canRun || running"
      aria-label="Run simulation"
      title="Run"
      @click="$emit('run')"
    >
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    </button>

    <button
      type="button"
      class="icon-btn"
      :disabled="!running"
      aria-label="Pause simulation"
      title="Pause"
      @click="$emit('pause')"
    >
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="7" y="5" width="4" height="14" rx="1" />
        <rect x="13" y="5" width="4" height="14" rx="1" />
      </svg>
    </button>

    <button
      type="button"
      class="icon-btn"
      :disabled="!canRun"
      aria-label="Reset simulation"
      title="Reset"
      @click="$emit('reset')"
    >
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 5a7 7 0 1 1-6.2 3.8"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
        <path d="M3.5 5h5v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  gap: 0.5rem;
}

.icon-btn {
  border: 1px solid #a7b8d1;
  background: #fff;
  border-radius: 6px;
  width: 2.3rem;
  height: 2.1rem;
  display: inline-grid;
  place-items: center;
  color: #2d3f5f;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}

.icon-btn:hover:not(:disabled) {
  background: #f2f7ff;
  border-color: #92abd0;
}

.icon-btn:active:not(:disabled) {
  background: #e6efff;
}

.icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.icon {
  width: 1.05rem;
  height: 1.05rem;
  fill: currentColor;
}
</style>

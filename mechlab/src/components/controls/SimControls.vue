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
  <div class="controls">
    <button type="button" :disabled="!canRun || running" @click="$emit('run')">Run</button>
    <button type="button" :disabled="!running" @click="$emit('pause')">Pause</button>
    <button type="button" :disabled="!canRun" @click="$emit('reset')">Reset</button>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  gap: 0.5rem;
}

button {
  border: 1px solid #a7b8d1;
  background: #fff;
  border-radius: 6px;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>

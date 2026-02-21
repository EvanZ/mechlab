<script setup lang="ts">
defineProps<{
  index: number;
  max: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:index": [value: number];
}>();

function onInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  emit("update:index", Number.parseInt(input.value, 10));
}
</script>

<template>
  <label class="scrubber">
    <span class="label">Time Index</span>
    <input
      type="range"
      :value="index"
      :max="Math.max(0, max)"
      min="0"
      step="1"
      :disabled="disabled"
      @input="onInput"
    />
    <span class="meta">{{ index }} / {{ Math.max(0, max) }}</span>
  </label>
</template>

<style scoped>
.scrubber {
  display: grid;
  gap: 0.3rem;
}

.label {
  font-size: 0.8rem;
  font-weight: 600;
}

.meta {
  font-size: 0.75rem;
  color: #495773;
}
</style>

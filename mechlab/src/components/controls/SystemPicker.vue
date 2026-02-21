<script setup lang="ts">
interface SystemOption {
  id: string;
  name: string;
}

defineProps<{
  systems: SystemOption[];
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function onChange(event: Event): void {
  const select = event.target as HTMLSelectElement;
  emit("update:modelValue", select.value);
}
</script>

<template>
  <label class="field">
    <span class="label">System</span>
    <select :value="modelValue" @change="onChange">
      <option v-for="system in systems" :key="system.id" :value="system.id">
        {{ system.name }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.field {
  display: grid;
  gap: 0.35rem;
}

.label {
  font-size: 0.85rem;
  font-weight: 600;
}
</style>

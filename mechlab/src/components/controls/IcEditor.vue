<script setup lang="ts">
import katex from "katex";
import "katex/dist/katex.min.css";
import { computed } from "vue";
import { getStateTexLabel } from "../../systems/stateTex";

const props = defineProps<{
  systemId?: string | null;
  stateNames: string[];
  values: number[];
  stateHelp?: Record<string, string>;
}>();

const emit = defineEmits<{
  "update:values": [value: number[]];
}>();

function onInput(index: number, event: Event): void {
  const input = event.target as HTMLInputElement;
  const parsed = Number.parseFloat(input.value);

  if (Number.isFinite(parsed)) {
    const next = [...props.values];
    next[index] = parsed;
    emit("update:values", next);
  }
}

function helpFor(name: string): string {
  return props.stateHelp?.[name] ?? "";
}

function renderInlineTex(tex: string): string {
  return katex.renderToString(tex, {
    throwOnError: false,
    strict: "ignore",
    displayMode: false
  });
}

const labelHtmlByName = computed<Record<string, string>>(() => {
  const labels: Record<string, string> = {};

  for (const name of props.stateNames) {
    const tex = getStateTexLabel(props.systemId ?? null, name);
    if (!tex) {
      continue;
    }
    labels[name] = renderInlineTex(tex);
  }

  return labels;
});
</script>

<template>
  <section class="group">
    <h3>Initial Conditions</h3>
    <label v-for="(name, index) in stateNames" :key="name" class="field">
      <span class="field-meta">
        <span v-if="labelHtmlByName[name]" class="field-label field-label-math" v-html="labelHtmlByName[name]" />
        <span v-else class="field-label">{{ name }}</span>
        <span v-if="helpFor(name)" class="help-icon" tabindex="0" aria-label="initial condition help">
          ❓
          <span class="tooltip">{{ helpFor(name) }}</span>
        </span>
      </span>
      <input type="number" :value="values[index]" step="0.01" @input="onInput(index, $event)" />
    </label>
  </section>
</template>

<style scoped>
.group {
  display: grid;
  gap: 0.5rem;
}

h3 {
  margin: 0;
  font-size: 0.95rem;
}

.field {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.82rem;
}

.field-label-math :deep(.katex) {
  font-size: 0.95em;
}

.field-label-math :deep(.katex-html) {
  white-space: nowrap;
}

.field-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.help-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  user-select: none;
  line-height: 1;
}

.tooltip {
  position: absolute;
  top: 135%;
  left: 0;
  width: min(260px, calc(100vw - 2.2rem));
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  background: #24344e;
  color: #fff;
  font-size: 0.72rem;
  line-height: 1.3;
  white-space: normal;
  box-shadow: 0 3px 10px rgba(20, 34, 58, 0.28);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  z-index: 20;
}

.help-icon:hover .tooltip,
.help-icon:focus .tooltip {
  opacity: 1;
  visibility: visible;
}
</style>

<script setup lang="ts">
import { computed } from "vue";
import katex from "katex";
import "katex/dist/katex.min.css";
import { getParamTexLabel } from "../../systems/paramTex";

const props = defineProps<{
  params: Record<string, number>;
  systemId?: string | null;
  paramHelp?: Record<string, string>;
}>();

const emit = defineEmits<{
  "update:params": [value: Record<string, number>];
}>();

const sortedKeys = computed(() => Object.keys(props.params).sort((a, b) => a.localeCompare(b)));

function renderInlineTex(tex: string): string {
  return katex.renderToString(tex, {
    throwOnError: false,
    strict: "ignore",
    displayMode: false
  });
}

const labelHtmlByKey = computed<Record<string, string>>(() => {
  const labels: Record<string, string> = {};

  for (const key of sortedKeys.value) {
    const tex = getParamTexLabel(props.systemId ?? null, key);
    if (!tex) {
      continue;
    }
    labels[key] = renderInlineTex(tex);
  }

  return labels;
});

function onInput(key: string, event: Event): void {
  const input = event.target as HTMLInputElement;
  const next = Number.parseFloat(input.value);

  if (Number.isFinite(next)) {
    emit("update:params", { ...props.params, [key]: next });
  }
}

function helpFor(key: string): string {
  return props.paramHelp?.[key] ?? "";
}
</script>

<template>
  <section class="group">
    <h3>Parameters</h3>
    <label v-for="key in sortedKeys" :key="key" class="field">
      <span class="field-meta">
        <span v-if="labelHtmlByKey[key]" class="field-label field-label-math" v-html="labelHtmlByKey[key]" />
        <span v-else class="field-label">{{ key }}</span>
        <span v-if="helpFor(key)" class="help-icon" tabindex="0" aria-label="parameter help">
          ❓
          <span class="tooltip">{{ helpFor(key) }}</span>
        </span>
      </span>
      <input type="number" :value="params[key]" step="0.01" @input="onInput(key, $event)" />
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
  transform: none;
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

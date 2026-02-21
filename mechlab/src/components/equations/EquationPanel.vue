<script setup lang="ts">
import katex from "katex";
import "katex/dist/katex.min.css";
import { computed, ref, watch } from "vue";
import {
  defaultEquationSpec,
  equationsBySystemId,
  frameworkLabel,
  frameworkOrder,
  type EquationFramework
} from "../../systems/equations";

const props = defineProps<{
  systemId: string | null;
}>();

const spec = computed(() => {
  if (!props.systemId) {
    return defaultEquationSpec;
  }
  return equationsBySystemId[props.systemId] ?? defaultEquationSpec;
});

const activeFramework = ref<EquationFramework>("newtonian");

const availableFrameworks = computed(() =>
  frameworkOrder.filter((framework) => Boolean(spec.value.frameworks[framework]))
);

const activeFrameworkSpec = computed(() => spec.value.frameworks[activeFramework.value] ?? null);

watch(
  [spec, availableFrameworks],
  () => {
    const preferred = spec.value.preferredFramework;

    if (preferred && spec.value.frameworks[preferred]) {
      activeFramework.value = preferred;
      return;
    }

    if (!availableFrameworks.value.includes(activeFramework.value)) {
      activeFramework.value = availableFrameworks.value[0] ?? "newtonian";
    }
  },
  { immediate: true }
);

function renderTex(tex: string): string {
  return katex.renderToString(tex, {
    throwOnError: false,
    strict: "ignore",
    displayMode: true
  });
}
</script>

<template>
  <section class="equations" aria-label="equations panel">
    <header class="equations-header">
      <h3>Equations</h3>
      <p v-if="spec.subtitle" class="subtitle">{{ spec.subtitle }}</p>
    </header>

    <div v-if="availableFrameworks.length" class="tabs" role="tablist" aria-label="equation framework tabs">
      <button
        v-for="framework in availableFrameworks"
        :key="framework"
        type="button"
        class="tab"
        :class="{ active: framework === activeFramework }"
        role="tab"
        :aria-selected="framework === activeFramework"
        @click="activeFramework = framework"
      >
        {{ frameworkLabel[framework] }}
      </button>
    </div>

    <p v-if="activeFrameworkSpec?.description" class="framework-description">
      {{ activeFrameworkSpec.description }}
    </p>

    <div v-if="activeFrameworkSpec && activeFrameworkSpec.sections.length > 0" class="sections">
      <article v-for="section in activeFrameworkSpec.sections" :key="section.title" class="section-card">
        <h4>{{ section.title }}</h4>
        <div v-for="line in section.lines" :key="line" class="eq-line" v-html="renderTex(line)" />
      </article>
    </div>

    <p v-else class="empty">No equations available for this system yet.</p>

    <p v-if="activeFrameworkSpec?.footnote" class="footnote">{{ activeFrameworkSpec.footnote }}</p>
  </section>
</template>

<style scoped>
.equations {
  border: 1px solid #ced9ec;
  border-radius: 10px;
  background: linear-gradient(180deg, #f9fbff, #f2f7ff);
  padding: 0.65rem;
  display: grid;
  gap: 0.55rem;
}

.equations-header {
  display: grid;
  gap: 0.15rem;
}

h3 {
  margin: 0;
  font-size: 0.9rem;
}

.subtitle {
  margin: 0;
  font-size: 0.78rem;
  color: #40506b;
}

.tabs {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.tab {
  border: 1px solid #cdd8eb;
  background: #fff;
  color: #2b3b57;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.73rem;
  font-weight: 600;
  cursor: pointer;
}

.tab.active {
  background: #1f6feb;
  border-color: #1f6feb;
  color: #fff;
}

.framework-description {
  margin: 0;
  font-size: 0.75rem;
  color: #46546f;
}

.sections {
  display: grid;
  gap: 0.45rem;
  max-height: 280px;
  overflow: auto;
  padding-right: 0.1rem;
}

.section-card {
  border: 1px solid #d7e1f1;
  border-radius: 8px;
  background: #ffffff;
  padding: 0.45rem 0.5rem;
  display: grid;
  gap: 0.35rem;
}

h4 {
  margin: 0;
  font-size: 0.78rem;
  color: #2e3e5b;
}

.eq-line {
  margin: 0;
  font-size: 0.73rem;
  color: #1e2b41;
  background: #f7f9fd;
  border: 1px solid #e2e9f4;
  border-radius: 6px;
  padding: 0.2rem 0.35rem;
  overflow-x: auto;
}

.eq-line :deep(.katex-display) {
  margin: 0;
}

.empty,
.footnote {
  margin: 0;
  font-size: 0.74rem;
  color: #4a5872;
}
</style>

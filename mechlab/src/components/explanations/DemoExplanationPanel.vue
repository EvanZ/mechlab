<script setup lang="ts">
import katex from "katex";
import "katex/dist/katex.min.css";
import { computed, ref, watch } from "vue";
import {
  getDemoExplanation,
  type ExplanationLevel
} from "../../systems/explanations";

const props = defineProps<{
  systemId: string | null;
}>();

const level = ref<ExplanationLevel>("eli5");
const explanation = computed(() => getDemoExplanation(props.systemId));
const activeParagraphs = computed(() =>
  level.value === "eli5" ? explanation.value?.eli5 ?? [] : explanation.value?.grad ?? []
);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderParagraph(paragraph: string): string {
  const mathPattern = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let html = "";
  let cursor = 0;
  let match = mathPattern.exec(paragraph);

  while (match) {
    if (match.index > cursor) {
      html += escapeHtml(paragraph.slice(cursor, match.index));
    }

    const displayTex = match[1];
    const inlineTex = match[2];
    const tex = displayTex ?? inlineTex ?? "";
    html += katex.renderToString(tex, {
      throwOnError: false,
      strict: "ignore",
      displayMode: Boolean(displayTex)
    });

    cursor = match.index + match[0].length;
    match = mathPattern.exec(paragraph);
  }

  if (cursor < paragraph.length) {
    html += escapeHtml(paragraph.slice(cursor));
  }

  return html;
}

watch(
  () => props.systemId,
  () => {
    level.value = "eli5";
  }
);
</script>

<template>
  <section class="explanation-panel" aria-label="demo explanation panel">
    <template v-if="explanation">
      <div class="level-toggle" role="tablist" aria-label="explanation level">
        <button
          type="button"
          class="level-btn"
          :class="{ active: level === 'eli5' }"
          role="tab"
          :aria-selected="level === 'eli5'"
          @click="level = 'eli5'"
        >
          ELI5
        </button>
        <button
          type="button"
          class="level-btn"
          :class="{ active: level === 'grad' }"
          role="tab"
          :aria-selected="level === 'grad'"
          @click="level = 'grad'"
        >
          Grad Student
        </button>
      </div>

      <div class="body">
        <p
          v-for="(paragraph, index) in activeParagraphs"
          :key="`${level}-${index}`"
          v-html="renderParagraph(paragraph)"
        />
      </div>
    </template>

    <p v-else class="placeholder">No explanation available for this demo yet.</p>
  </section>
</template>

<style scoped>
.explanation-panel {
  border: 1px solid #ced9ec;
  border-radius: 10px;
  background: linear-gradient(180deg, #f9fbff, #f2f7ff);
  padding: 0.65rem;
  display: grid;
  gap: 0.55rem;
}

.level-toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.level-btn {
  border: 1px solid #cdd8eb;
  background: #fff;
  color: #2b3b57;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.73rem;
  font-weight: 600;
  cursor: pointer;
}

.level-btn.active {
  background: #1f6feb;
  border-color: #1f6feb;
  color: #fff;
}

.body {
  display: grid;
  gap: 0.45rem;
}

.body p {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.35;
  color: #203047;
  background: #ffffff;
  border: 1px solid #d7e1f1;
  border-radius: 8px;
  padding: 0.45rem 0.5rem;
}

.body p :deep(.katex-display) {
  margin: 0.2rem 0;
}

.placeholder {
  margin: 0;
  font-size: 0.78rem;
  color: #4a5872;
}
</style>

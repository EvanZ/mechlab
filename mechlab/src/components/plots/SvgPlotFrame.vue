<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    title: string;
    xLabel: string;
    yLabel: string;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    width?: number;
    height?: number;
  }>(),
  {
    width: 420,
    height: 280
  }
);

const padding = {
  top: 24,
  right: 14,
  bottom: 36,
  left: 44
};

const plotWidth = computed(() => props.width - padding.left - padding.right);
const plotHeight = computed(() => props.height - padding.top - padding.bottom);

function tickValues(min: number, max: number, n: number): Array<{ value: number; ratio: number; label: string }> {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }

  const span = max - min || 1;

  return Array.from({ length: n + 1 }, (_, i) => {
    const ratio = i / n;
    const value = min + span * ratio;

    return {
      value,
      ratio,
      label: Number.isInteger(value) ? `${value}` : value.toFixed(2)
    };
  });
}

const xTicks = computed(() => tickValues(props.xMin, props.xMax, 4));
const yTicks = computed(() => tickValues(props.yMin, props.yMax, 4));
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="plot-svg" aria-label="plot">
    <rect x="0" y="0" :width="width" :height="height" fill="#ffffff" stroke="#ccd8ea" />

    <text :x="width / 2" y="16" text-anchor="middle" class="title">{{ title }}</text>

    <line
      :x1="padding.left"
      :y1="padding.top + plotHeight"
      :x2="padding.left + plotWidth"
      :y2="padding.top + plotHeight"
      class="axis"
    />
    <line
      :x1="padding.left"
      :y1="padding.top"
      :x2="padding.left"
      :y2="padding.top + plotHeight"
      class="axis"
    />

    <g v-for="tick in xTicks" :key="`x-${tick.value}`">
      <line
        :x1="padding.left + tick.ratio * plotWidth"
        :y1="padding.top + plotHeight"
        :x2="padding.left + tick.ratio * plotWidth"
        :y2="padding.top + plotHeight + 5"
        class="tick"
      />
      <text
        :x="padding.left + tick.ratio * plotWidth"
        :y="padding.top + plotHeight + 18"
        text-anchor="middle"
        class="tick-label"
      >
        {{ tick.label }}
      </text>
    </g>

    <g v-for="tick in yTicks" :key="`y-${tick.value}`">
      <line
        :x1="padding.left - 5"
        :y1="padding.top + (1 - tick.ratio) * plotHeight"
        :x2="padding.left"
        :y2="padding.top + (1 - tick.ratio) * plotHeight"
        class="tick"
      />
      <text
        :x="padding.left - 8"
        :y="padding.top + (1 - tick.ratio) * plotHeight + 3"
        text-anchor="end"
        class="tick-label"
      >
        {{ tick.label }}
      </text>
    </g>

    <text :x="padding.left + plotWidth / 2" :y="height - 8" text-anchor="middle" class="axis-label">{{ xLabel }}</text>
    <text
      :x="14"
      :y="padding.top + plotHeight / 2"
      text-anchor="middle"
      class="axis-label"
      transform="rotate(-90 14 140)"
    >
      {{ yLabel }}
    </text>

    <slot
      :plot-left="padding.left"
      :plot-top="padding.top"
      :plot-width="plotWidth"
      :plot-height="plotHeight"
    />
  </svg>
</template>

<style scoped>
.plot-svg {
  width: 100%;
  height: auto;
  display: block;
}

.title {
  font-size: 11px;
  fill: #1e2e49;
  font-weight: 600;
}

.axis,
.tick {
  stroke: #6a7790;
  stroke-width: 1;
}

.tick-label,
.axis-label {
  fill: #3b4860;
  font-size: 9px;
}
</style>

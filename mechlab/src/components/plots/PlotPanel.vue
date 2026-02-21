<script setup lang="ts">
import { computed } from "vue";
import { decimateMinMax } from "../../compute/decimate";
import type { PlotSpec } from "../../systems/types";
import SvgLineSeries from "./SvgLineSeries.vue";
import SvgPlotFrame from "./SvgPlotFrame.vue";

const props = withDefaults(
  defineProps<{
    spec: PlotSpec;
    t: number[];
    y: number[][];
    energy?: number[];
    derived?: Record<string, number[]>;
    width?: number;
    height?: number;
  }>(),
  {
    width: 460,
    height: 290
  }
);

function sourceToArray(source: PlotSpec["x"], states: number[][]): number[] {
  switch (source.kind) {
    case "time":
      return props.t;
    case "state":
      return states.map((row) => row[source.index]);
    case "energy":
      return props.energy ?? [];
    case "derived":
      return props.derived?.[source.key] ?? [];
    default:
      return [];
  }
}

const rawX = computed(() => sourceToArray(props.spec.x, props.y));
const rawY = computed(() => sourceToArray(props.spec.y, props.y));

const trimmed = computed(() => {
  const n = Math.min(rawX.value.length, rawY.value.length);
  const x: number[] = [];
  const y: number[] = [];

  for (let i = 0; i < n; i += 1) {
    const xValue = rawX.value[i];
    const yValue = rawY.value[i];

    if (Number.isFinite(xValue) && Number.isFinite(yValue)) {
      x.push(xValue);
      y.push(yValue);
    }
  }

  return { x, y };
});

const decimated = computed(() => decimateMinMax(trimmed.value.x, trimmed.value.y, props.width * 2));

function expandBounds(min: number, max: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [0, 1];
  }

  if (min === max) {
    const delta = Math.abs(min) < 1 ? 1 : Math.abs(min) * 0.1;
    return [min - delta, max + delta];
  }

  const pad = (max - min) * 0.05;
  return [min - pad, max + pad];
}

const bounds = computed(() => {
  if (decimated.value.x.length === 0 || decimated.value.y.length === 0) {
    return {
      xMin: 0,
      xMax: 1,
      yMin: 0,
      yMax: 1
    };
  }

  const xMinRaw = Math.min(...decimated.value.x);
  const xMaxRaw = Math.max(...decimated.value.x);
  const yMinRaw = Math.min(...decimated.value.y);
  const yMaxRaw = Math.max(...decimated.value.y);

  const [xMin, xMax] = expandBounds(xMinRaw, xMaxRaw);
  const [yMin, yMax] = expandBounds(yMinRaw, yMaxRaw);

  return { xMin, xMax, yMin, yMax };
});
</script>

<template>
  <div class="panel">
    <SvgPlotFrame
      :title="spec.title"
      :x-label="spec.xLabel"
      :y-label="spec.yLabel"
      :x-min="bounds.xMin"
      :x-max="bounds.xMax"
      :y-min="bounds.yMin"
      :y-max="bounds.yMax"
      :width="width"
      :height="height"
    >
      <template #default="slotProps">
        <SvgLineSeries
          :x="decimated.x"
          :y="decimated.y"
          :x-min="bounds.xMin"
          :x-max="bounds.xMax"
          :y-min="bounds.yMin"
          :y-max="bounds.yMax"
          :plot-left="slotProps.plotLeft"
          :plot-top="slotProps.plotTop"
          :plot-width="slotProps.plotWidth"
          :plot-height="slotProps.plotHeight"
        />
      </template>
    </SvgPlotFrame>
  </div>
</template>

<style scoped>
.panel {
  background: #fff;
  border: 1px solid #ced9ec;
  border-radius: 10px;
  padding: 0.25rem;
}
</style>

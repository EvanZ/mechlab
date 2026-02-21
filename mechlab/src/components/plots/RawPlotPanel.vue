<script setup lang="ts">
import { computed } from "vue";
import { decimateMinMax } from "../../compute/decimate";
import SvgLineSeries from "./SvgLineSeries.vue";
import SvgPlotFrame from "./SvgPlotFrame.vue";

const props = withDefaults(
  defineProps<{
    title: string;
    xLabel: string;
    yLabel: string;
    x: number[];
    y: number[];
    width?: number;
    height?: number;
  }>(),
  {
    width: 460,
    height: 290
  }
);

const finiteSeries = computed(() => {
  const n = Math.min(props.x.length, props.y.length);
  const x: number[] = [];
  const y: number[] = [];

  for (let i = 0; i < n; i += 1) {
    const xValue = props.x[i];
    const yValue = props.y[i];
    if (Number.isFinite(xValue) && Number.isFinite(yValue)) {
      x.push(xValue);
      y.push(yValue);
    }
  }

  return { x, y };
});

const decimated = computed(() => decimateMinMax(finiteSeries.value.x, finiteSeries.value.y, props.width * 2));

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
    return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  }

  const [xMin, xMax] = expandBounds(Math.min(...decimated.value.x), Math.max(...decimated.value.x));
  const [yMin, yMax] = expandBounds(Math.min(...decimated.value.y), Math.max(...decimated.value.y));

  return { xMin, xMax, yMin, yMax };
});
</script>

<template>
  <div class="panel">
    <SvgPlotFrame
      :title="title"
      :x-label="xLabel"
      :y-label="yLabel"
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

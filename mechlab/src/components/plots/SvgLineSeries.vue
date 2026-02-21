<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  x: number[];
  y: number[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  plotLeft: number;
  plotTop: number;
  plotWidth: number;
  plotHeight: number;
}>();

function normalize(value: number, min: number, max: number): number {
  if (max === min) {
    return 0.5;
  }
  return (value - min) / (max - min);
}

const pathD = computed(() => {
  if (props.x.length < 2 || props.x.length !== props.y.length) {
    return "";
  }

  const segments: string[] = [];

  for (let i = 0; i < props.x.length; i += 1) {
    const px = props.plotLeft + normalize(props.x[i], props.xMin, props.xMax) * props.plotWidth;
    const py =
      props.plotTop + props.plotHeight - normalize(props.y[i], props.yMin, props.yMax) * props.plotHeight;

    segments.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)}`);
  }

  return segments.join(" ");
});
</script>

<template>
  <path :d="pathD" fill="none" stroke="#1f6feb" stroke-width="1.5" />
</template>

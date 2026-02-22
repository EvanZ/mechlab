<script setup lang="ts">
import { computed } from "vue";
import type { CarouselPreview } from "../../systems/carouselPreview";
import BrachistochroneViz from "../viz/BrachistochroneViz.vue";
import BlochSphereViz from "../viz/BlochSphereViz.vue";
import CartPoleViz from "../viz/CartPoleViz.vue";
import ChargedParticleViz from "../viz/ChargedParticleViz.vue";
import DoubleWellTunnelingViz from "../viz/DoubleWellTunnelingViz.vue";
import DoubleSlitViz from "../viz/DoubleSlitViz.vue";
import DoubleSlit2DViz from "../viz/DoubleSlit2DViz.vue";
import DoublePendulumViz from "../viz/DoublePendulumViz.vue";
import FlowFieldViz from "../viz/FlowFieldViz.vue";
import FluidParticleViz from "../viz/FluidParticleViz.vue";
import OrbitViz from "../viz/OrbitViz.vue";
import OscillatorViz from "../viz/OscillatorViz.vue";
import PendulumViz from "../viz/PendulumViz.vue";
import Potential1DViz from "../viz/Potential1DViz.vue";
import ProjectileViz from "../viz/ProjectileViz.vue";
import QftLatticeViz from "../viz/QftLatticeViz.vue";
import QuantumHarmonicViz from "../viz/QuantumHarmonicViz.vue";
import RutherfordViz from "../viz/RutherfordViz.vue";
import Schrodinger1DViz from "../viz/Schrodinger1DViz.vue";
import SkiJumpViz from "../viz/SkiJumpViz.vue";
import MuscleActivationViz from "../viz/MuscleActivationViz.vue";
import PatchyBindingViz from "../viz/PatchyBindingViz.vue";
import TightBindingViz from "../viz/TightBindingViz.vue";
import Tunneling1DViz from "../viz/Tunneling1DViz.vue";
import TwoQubitViz from "../viz/TwoQubitViz.vue";
import Wave2DViz from "../viz/Wave2DViz.vue";

const props = defineProps<{
  systemId: string;
  preview?: CarouselPreview;
}>();

const odePreview = computed(() => (props.preview?.kind === "ode" ? props.preview : null));
const variationalPreview = computed(() =>
  props.preview?.kind === "variational" ? props.preview : null
);

const states = computed(() => odePreview.value?.states ?? []);
const params = computed(() => odePreview.value?.params ?? {});
const index = computed(() => {
  if (!odePreview.value) {
    return 0;
  }

  const max = Math.max(0, odePreview.value.states.length - 1);
  return Math.max(0, Math.min(odePreview.value.index, max));
});

const oscillatorSeriesX = computed(() => states.value.map((state) => state[0] ?? 0));
const expression = computed(() => odePreview.value?.expression ?? "0.5 * x^2");
const hillProfile = computed(() => odePreview.value?.hillProfile ?? []);

const effectiveLength = computed(() => {
  const value = params.value.l;
  return Number.isFinite(value) && value > 0 ? value : 1;
});

const effectiveL1 = computed(() => {
  const value = params.value.l1;
  return Number.isFinite(value) && value > 0 ? value : 1;
});

const effectiveL2 = computed(() => {
  const value = params.value.l2;
  return Number.isFinite(value) && value > 0 ? value : 1;
});
</script>

<template>
  <div class="thumb-live">
    <div class="thumb-live-inner">
      <PendulumViz
        v-if="systemId === 'pendulum'"
        :theta="states[index]?.[0] ?? 0"
        :length="effectiveLength"
      />

      <OscillatorViz
        v-else-if="systemId === 'oscillator'"
        :x="states[index]?.[0] ?? 0"
        :series-x="oscillatorSeriesX"
      />

      <Potential1DViz
        v-else-if="systemId === 'potential1d'"
        :states="states"
        :index="index"
        :expression="expression"
        :mass="params.m ?? 1"
      />

      <BlochSphereViz
        v-else-if="systemId === 'blochsphere'"
        :states="states"
        :index="index"
        :params="params"
      />

      <TwoQubitViz
        v-else-if="systemId === 'twoqubit'"
        :states="states"
        :index="index"
        :params="params"
      />

      <Schrodinger1DViz
        v-else-if="systemId === 'schrodinger1d'"
        :states="states"
        :index="index"
        :params="params"
      />

      <Tunneling1DViz
        v-else-if="systemId === 'tunneling1d'"
        :states="states"
        :index="index"
        :params="params"
      />

      <DoubleWellTunnelingViz
        v-else-if="systemId === 'doublewell'"
        :states="states"
        :index="index"
        :params="params"
      />

      <DoubleSlitViz
        v-else-if="systemId === 'doubleslit'"
        :states="states"
        :index="index"
        :params="params"
      />

      <DoubleSlit2DViz
        v-else-if="systemId === 'doubleslit2d'"
        :states="states"
        :index="index"
        :params="params"
      />

      <TightBindingViz
        v-else-if="systemId === 'tightbinding'"
        :states="states"
        :index="index"
        :params="params"
      />

      <QftLatticeViz
        v-else-if="systemId === 'qftlattice'"
        :states="states"
        :index="index"
        :params="params"
      />

      <QuantumHarmonicViz
        v-else-if="systemId === 'qho1d'"
        :states="states"
        :index="index"
        :params="params"
      />

      <MuscleActivationViz
        v-else-if="systemId === 'muscleactivation'"
        :states="states"
        :index="index"
      />

      <ProjectileViz
        v-else-if="systemId === 'projectile'"
        :states="states"
        :index="index"
      />

      <SkiJumpViz
        v-else-if="systemId === 'skijump'"
        :states="states"
        :index="index"
        :hill-profile="hillProfile"
      />

      <ChargedParticleViz
        v-else-if="systemId === 'chargedparticle'"
        :states="states"
        :index="index"
        :params="params"
      />

      <RutherfordViz
        v-else-if="systemId === 'rutherford'"
        :states="states"
        :index="index"
        :params="params"
      />

      <PatchyBindingViz
        v-else-if="systemId === 'patchybinding'"
        :states="states"
        :index="index"
        :params="params"
      />

      <Wave2DViz
        v-else-if="systemId === 'wave2d'"
        :states="states"
        :index="index"
        :params="params"
      />

      <OrbitViz
        v-else-if="systemId === 'orbit'"
        :states="states"
        :index="index"
      />

      <FlowFieldViz
        v-else-if="systemId === 'flowfield'"
        :states="states"
        :index="index"
        :params="params"
      />

      <FluidParticleViz
        v-else-if="systemId === 'fluidparticle'"
        :states="states"
        :index="index"
      />

      <CartPoleViz
        v-else-if="systemId === 'cartpole'"
        :states="states"
        :index="index"
        :l="effectiveLength"
      />

      <DoublePendulumViz
        v-else-if="systemId === 'doublependulum'"
        :states="states"
        :index="index"
        :l1="effectiveL1"
        :l2="effectiveL2"
      />

      <BrachistochroneViz
        v-else-if="systemId === 'brachistochrone' && variationalPreview"
        :points="variationalPreview.points"
        :reference-points="variationalPreview.referencePoints"
        :bead-progress="variationalPreview.beadProgress ?? 0.45"
      />

      <div v-else class="thumb-fallback" />
    </div>
  </div>
</template>

<style scoped>
.thumb-live {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.thumb-live-inner {
  width: 122%;
  height: 122%;
  transform: translate(-11%, -11%);
  display: grid;
  align-items: stretch;
  justify-items: stretch;
}

.thumb-live-inner > * {
  width: 100%;
  height: 100%;
}

.thumb-live-inner :deep(.viz-wrap) {
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  display: block !important;
}

.thumb-live-inner :deep(.viz) {
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
}

.thumb-live-inner :deep(svg) {
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
}

.thumb-live-inner :deep(.viz-meta),
.thumb-live-inner :deep(.stats),
.thumb-live-inner :deep(.label),
.thumb-live-inner :deep(.info-title),
.thumb-live-inner :deep(.info-line) {
  display: none !important;
}

.thumb-live-inner :deep(p),
.thumb-live-inner :deep(span),
.thumb-live-inner :deep(h1),
.thumb-live-inner :deep(h2),
.thumb-live-inner :deep(h3),
.thumb-live-inner :deep(h4),
.thumb-live-inner :deep(h5),
.thumb-live-inner :deep(h6),
.thumb-live-inner :deep(small),
.thumb-live-inner :deep(strong) {
  display: none !important;
}

.thumb-live-inner :deep(text) {
  display: none !important;
}

.thumb-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(140deg, #edf4ff, #d2def3);
}
</style>

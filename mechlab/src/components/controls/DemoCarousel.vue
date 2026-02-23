<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import type { CarouselPreviewMap } from "../../systems/carouselPreview";
import DemoThumbViz from "./DemoThumbViz.vue";

interface DemoCarouselItem {
  id: string;
  name: string;
  mode: "ode" | "variational";
}

interface CardTheme {
  badge: string;
  subtitle: string;
  background: string;
}

const props = defineProps<{
  systems: DemoCarouselItem[];
  previewData?: CarouselPreviewMap;
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const cardThemes: Record<string, CardTheme> = {
  pendulum: {
    badge: "PEND",
    subtitle: "Nonlinear Swing",
    background: "linear-gradient(135deg, #e8f0ff, #c8ddff)"
  },
  oscillator: {
    badge: "SHO",
    subtitle: "Hooke Dynamics",
    background: "linear-gradient(135deg, #eaf8f0, #bfe7cf)"
  },
  drivendampedoscillator: {
    badge: "DDS",
    subtitle: "Driven Damping",
    background: "linear-gradient(135deg, #e6f8ef, #bddfcf)"
  },
  potential1d: {
    badge: "V(x)",
    subtitle: "Free-form Force",
    background: "linear-gradient(135deg, #fff6e7, #ffd9a8)"
  },
  blochsphere: {
    badge: "Q1",
    subtitle: "Single Qubit",
    background: "linear-gradient(135deg, #efe9ff, #d7c8ff)"
  },
  twoqubit: {
    badge: "Q2",
    subtitle: "Entanglement",
    background: "linear-gradient(135deg, #eadfff, #c8b2ff)"
  },
  schrodinger1d: {
    badge: "S1D",
    subtitle: "Wavepacket",
    background: "linear-gradient(135deg, #e7f8ff, #b9e4ff)"
  },
  tunneling1d: {
    badge: "TUN",
    subtitle: "Barrier Passage",
    background: "linear-gradient(135deg, #e7f5ff, #b9dcff)"
  },
  doublewell: {
    badge: "DW",
    subtitle: "L-R Tunneling",
    background: "linear-gradient(135deg, #e9f2ff, #c7d9ff)"
  },
  doubleslit: {
    badge: "DS1",
    subtitle: "Interference",
    background: "linear-gradient(135deg, #fff0e8, #ffcdb8)"
  },
  doubleslit2d: {
    badge: "DS2",
    subtitle: "2D Interference",
    background: "linear-gradient(135deg, #ffefe8, #ffc3ad)"
  },
  tightbinding: {
    badge: "TB",
    subtitle: "Lattice Chain",
    background: "linear-gradient(135deg, #edf3ff, #c8d8ff)"
  },
  qftlattice: {
    badge: "QFT",
    subtitle: "Field Lattice",
    background: "linear-gradient(135deg, #e8fff6, #b8ead6)"
  },
  qho1d: {
    badge: "QHO",
    subtitle: "Quantum Oscillator",
    background: "linear-gradient(135deg, #f1ecff, #d8ccff)"
  },
  quantumbrownian: {
    badge: "QBM",
    subtitle: "Open Quantum Bath",
    background: "linear-gradient(135deg, #f4eeff, #dccdff)"
  },
  muscleactivation: {
    badge: "MUS",
    subtitle: "Active Spring",
    background: "linear-gradient(135deg, #ffeceb, #ffc8c4)"
  },
  skijump: {
    badge: "SKI",
    subtitle: "Friction Track",
    background: "linear-gradient(135deg, #edf9ff, #c6e9ff)"
  },
  chargedparticle: {
    badge: "E-F",
    subtitle: "Charge Motion",
    background: "linear-gradient(135deg, #fff4e8, #ffddb9)"
  },
  rutherford: {
    badge: "SCAT",
    subtitle: "Collider Toy",
    background: "linear-gradient(135deg, #fff1e5, #ffd0b2)"
  },
  patchybinding: {
    badge: "PPI",
    subtitle: "Patchy Binding",
    background: "linear-gradient(135deg, #ffeede, #ffccb3)"
  },
  wave2d: {
    badge: "WAVE",
    subtitle: "Stone Drop",
    background: "linear-gradient(135deg, #e8f7ff, #bfe4ff)"
  },
  projectile: {
    badge: "PROJ",
    subtitle: "Parabola",
    background: "linear-gradient(135deg, #f0f5ff, #cfdcff)"
  },
  orbit: {
    badge: "ORB",
    subtitle: "2-Body",
    background: "linear-gradient(135deg, #ebf0ff, #c4d3ff)"
  },
  flowfield: {
    badge: "FLOW",
    subtitle: "Vector Field",
    background: "linear-gradient(135deg, #ebfff6, #c0ead5)"
  },
  percolation: {
    badge: "PERC",
    subtitle: "Critical Clusters",
    background: "linear-gradient(135deg, #eef7ff, #cedef5)"
  },
  navierstokes2d: {
    badge: "NS",
    subtitle: "Obstacle Flow",
    background: "linear-gradient(135deg, #eff8ff, #c8deef)"
  },
  fluidparticle: {
    badge: "FLD",
    subtitle: "Drag/Buoyancy",
    background: "linear-gradient(135deg, #eafcff, #c7efff)"
  },
  brownian: {
    badge: "BRN",
    subtitle: "Thermal Jitter",
    background: "linear-gradient(135deg, #eef8ff, #cfe8ff)"
  },
  cartpole: {
    badge: "CP",
    subtitle: "Inverted Pole",
    background: "linear-gradient(135deg, #fff2ea, #ffd2bd)"
  },
  doublependulum: {
    badge: "DP",
    subtitle: "Chaotic Swing",
    background: "linear-gradient(135deg, #f4ecff, #dbc9ff)"
  },
  brachistochrone: {
    badge: "VAR",
    subtitle: "Fastest Curve",
    background: "linear-gradient(135deg, #f0fff1, #cdebd0)"
  }
};

function cardThemeFor(systemId: string): CardTheme {
  return (
    cardThemes[systemId] ?? {
      badge: "LAB",
      subtitle: "Mechanics Demo",
      background: "linear-gradient(135deg, #eef3ff, #d5e0f5)"
    }
  );
}

const trackRef = ref<HTMLDivElement | null>(null);
const cardRefs = new Map<string, HTMLButtonElement>();

function setCardRef(el: Element | null, id: string): void {
  if (el instanceof HTMLButtonElement) {
    cardRefs.set(id, el);
  } else {
    cardRefs.delete(id);
  }
}

function onSelect(systemId: string): void {
  emit("update:modelValue", systemId);
}

function previewFor(systemId: string) {
  return props.previewData?.[systemId];
}

function centerActiveCard(behavior: ScrollBehavior): void {
  const track = trackRef.value;
  const card = cardRefs.get(props.modelValue);

  if (!track || !card) {
    return;
  }

  const targetLeft = card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2;
  track.scrollTo({
    left: Math.max(0, targetLeft),
    behavior
  });
}

function scrollByCards(direction: -1 | 1): void {
  trackRef.value?.scrollBy({
    left: direction * 280,
    behavior: "smooth"
  });
}

watch(
  () => props.modelValue,
  () => {
    void nextTick(() => centerActiveCard("smooth"));
  }
);

watch(
  () => props.systems.length,
  () => {
    void nextTick(() => centerActiveCard("auto"));
  }
);

onMounted(() => {
  void nextTick(() => centerActiveCard("auto"));
});
</script>

<template>
  <section class="carousel">
    <div class="carousel-header">
      <h2>Demo Carousel</h2>
      <p>Pick a demo by clicking a card.</p>
    </div>

    <div class="carousel-shell">
      <button type="button" class="nav-btn" aria-label="previous demos" @click="scrollByCards(-1)">
        &lt;
      </button>

      <div ref="trackRef" class="track" role="listbox" aria-label="system demos">
        <button
          v-for="system in systems"
          :ref="(el) => setCardRef(el as Element | null, system.id)"
          :key="system.id"
          type="button"
          class="card"
          :class="{ active: system.id === modelValue }"
          role="option"
          :aria-selected="system.id === modelValue"
          @click="onSelect(system.id)"
        >
          <div class="thumb" :style="{ background: cardThemeFor(system.id).background }">
            <DemoThumbViz v-if="previewFor(system.id)" :system-id="system.id" :preview="previewFor(system.id)" />

            <span class="badge">{{ cardThemeFor(system.id).badge }}</span>
            <span class="mode">{{ system.mode === "ode" ? "ODE" : "VAR" }}</span>
          </div>

          <span class="name">{{ system.name }}</span>
          <span class="subtitle">{{ cardThemeFor(system.id).subtitle }}</span>
        </button>
      </div>

      <button type="button" class="nav-btn" aria-label="next demos" @click="scrollByCards(1)">
        &gt;
      </button>
    </div>
  </section>
</template>

<style scoped>
.carousel {
  display: grid;
  gap: 0.5rem;
}

.carousel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

h2 {
  margin: 0;
  font-size: 1rem;
}

p {
  margin: 0;
  font-size: 0.8rem;
  color: #445572;
}

.carousel-shell {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn {
  width: 2rem;
  height: 2rem;
  border: 1px solid #b5c4de;
  background: #f8fbff;
  color: #36517b;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
}

.track {
  display: flex;
  gap: 0.65rem;
  overflow-x: auto;
  padding: 0.3rem 0.2rem 0.45rem;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}

.card {
  min-width: 170px;
  max-width: 170px;
  border: 1px solid #c5d3e8;
  border-radius: 12px;
  background: #fff;
  padding: 0.35rem;
  display: grid;
  gap: 0.3rem;
  text-align: left;
  cursor: pointer;
  scroll-snap-align: center;
  transform: scale(0.94);
  transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
}

.card.active {
  transform: scale(1);
  border-color: #5b7cb7;
  box-shadow: 0 4px 14px rgba(39, 69, 117, 0.18);
}

.card:hover {
  transform: scale(0.975);
}

.thumb {
  position: relative;
  height: 82px;
  border-radius: 9px;
  border: 1px solid rgba(77, 97, 135, 0.25);
  padding: 0;
  overflow: hidden;
}

.badge {
  position: absolute;
  top: 0.3rem;
  left: 0.35rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(51, 67, 95, 0.24);
  background: rgba(255, 255, 255, 0.72);
  color: #2c3d5c;
  border-radius: 999px;
  padding: 0.11rem 0.45rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.mode {
  position: absolute;
  top: 0.3rem;
  right: 0.35rem;
  z-index: 2;
  font-size: 0.62rem;
  font-weight: 700;
  color: #304665;
  border: 1px solid rgba(52, 73, 108, 0.24);
  border-radius: 999px;
  padding: 0.09rem 0.35rem;
  background: rgba(255, 255, 255, 0.7);
}

.name {
  font-size: 0.78rem;
  font-weight: 700;
  color: #1f2f4a;
  line-height: 1.15;
}

.subtitle {
  font-size: 0.69rem;
  color: #465979;
}

@media (max-width: 900px) {
  .card {
    min-width: 150px;
    max-width: 150px;
  }

  .thumb {
    height: 74px;
  }
}
</style>

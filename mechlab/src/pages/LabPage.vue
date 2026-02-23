<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import HillCurveEditor from "../components/controls/HillCurveEditor.vue";
import IcEditor from "../components/controls/IcEditor.vue";
import MuscleCurveEditor from "../components/controls/MuscleCurveEditor.vue";
import ParamEditor from "../components/controls/ParamEditor.vue";
import DemoCarousel from "../components/controls/DemoCarousel.vue";
import SimControls from "../components/controls/SimControls.vue";
import TimeScrubber from "../components/controls/TimeScrubber.vue";
import DemoExplanationPanel from "../components/explanations/DemoExplanationPanel.vue";
import EquationPanel from "../components/equations/EquationPanel.vue";
import PhaseVectorFieldPanel from "../components/plots/PhaseVectorFieldPanel.vue";
import PlotPanel from "../components/plots/PlotPanel.vue";
import RawPlotPanel from "../components/plots/RawPlotPanel.vue";
import BrachistochroneViz from "../components/viz/BrachistochroneViz.vue";
import BlochSphereViz from "../components/viz/BlochSphereViz.vue";
import BrownianViz from "../components/viz/BrownianViz.vue";
import CartPoleViz from "../components/viz/CartPoleViz.vue";
import ChargedParticleViz from "../components/viz/ChargedParticleViz.vue";
import DoubleWellTunnelingViz from "../components/viz/DoubleWellTunnelingViz.vue";
import DoubleSlitViz from "../components/viz/DoubleSlitViz.vue";
import DoubleSlit2DViz from "../components/viz/DoubleSlit2DViz.vue";
import DoublePendulumViz from "../components/viz/DoublePendulumViz.vue";
import FlowFieldViz from "../components/viz/FlowFieldViz.vue";
import FluidParticleViz from "../components/viz/FluidParticleViz.vue";
import OrbitViz from "../components/viz/OrbitViz.vue";
import OscillatorViz from "../components/viz/OscillatorViz.vue";
import PendulumViz from "../components/viz/PendulumViz.vue";
import PercolationViz from "../components/viz/PercolationViz.vue";
import Potential1DViz from "../components/viz/Potential1DViz.vue";
import ProjectileViz from "../components/viz/ProjectileViz.vue";
import QftLatticeViz from "../components/viz/QftLatticeViz.vue";
import RutherfordViz from "../components/viz/RutherfordViz.vue";
import TightBindingViz from "../components/viz/TightBindingViz.vue";
import Tunneling1DViz from "../components/viz/Tunneling1DViz.vue";
import TwoQubitViz from "../components/viz/TwoQubitViz.vue";
import QuantumHarmonicViz from "../components/viz/QuantumHarmonicViz.vue";
import QuantumBrownianViz from "../components/viz/QuantumBrownianViz.vue";
import Schrodinger1DViz from "../components/viz/Schrodinger1DViz.vue";
import SkiJumpViz from "../components/viz/SkiJumpViz.vue";
import MuscleActivationViz from "../components/viz/MuscleActivationViz.vue";
import NavierStokes2DViz from "../components/viz/NavierStokes2DViz.vue";
import PatchyBindingViz from "../components/viz/PatchyBindingViz.vue";
import Wave2DViz from "../components/viz/Wave2DViz.vue";
import type {
  IntegratorType,
  SimulateResult,
  WorkerRequest,
  WorkerResponse
} from "../compute/protocol";
import { integrateRk4 } from "../compute/integrators";
import type { CarouselPreviewMap } from "../systems/carouselPreview";
import {
  getSystemById,
  isOdeSystem,
  isVariationalSystem,
  listSystems
} from "../systems/systems";
import { getParamHelpForSystem } from "../systems/paramHelp";
import { getStateHelpForSystem } from "../systems/stateHelp";
import {
  getActivePotentialExpression,
  setActivePotentialExpression
} from "../systems/ode/potentialExpression";
import { buildBlochSphereInitialState } from "../systems/ode/blochsphere";
import {
  buildBrownianInitialState,
  simulateBrownianTrajectory
} from "../systems/ode/brownian";
import { buildDoubleWellInitialState } from "../systems/ode/doublewell";
import { buildDoubleSlitInitialState } from "../systems/ode/doubleslit";
import { buildDoubleSlit2dInitialState } from "../systems/ode/doubleslit2d";
import { buildQftLatticeInitialState } from "../systems/ode/qftlattice";
import { buildQhoInitialState } from "../systems/ode/qho1d";
import { buildPercolationInitialState } from "../systems/ode/percolation";
import {
  buildNavierStokesInitialState,
  simulateNavierStokes2d
} from "../systems/ode/navierstokes2d";
import { buildRutherfordInitialState } from "../systems/ode/rutherford";
import { buildSchrodingerInitialState } from "../systems/ode/schrodinger1d";
import { buildTightBindingInitialState } from "../systems/ode/tightbinding";
import { buildWave2dInitialState } from "../systems/ode/wave2d";
import {
  applyTwoQubitGate,
  buildBellPhiPlusState,
  buildTwoQubitInitialState,
  type TwoQubitGate
} from "../systems/ode/twoqubit";
import { buildTunnelingInitialState } from "../systems/ode/tunneling1d";
import {
  getActiveMuscleCurve,
  muscleCurveBounds,
  muscleCurveToTuples,
  setActiveMuscleCurve,
  type MuscleCurvePoint
} from "../systems/ode/muscleCurve";
import {
  getActiveHillProfile,
  getActiveHillRange,
  hillProfileToTuples,
  setActiveHillProfile,
  type HillPoint
} from "../systems/ode/hillProfile";
import type {
  OdeSystem,
  VariationalResult,
  VariationalSystem
} from "../systems/types";

const systems = listSystems();
const selectedSystemId = ref(systems[0]?.id ?? "pendulum");
const selectedPreset = ref("custom");
const carouselSystems = computed(() =>
  systems.map((system) => ({
    id: system.id,
    name: system.name,
    mode: system.mode
  }))
);
const carouselPreviewData = ref<CarouselPreviewMap>({});

const activeSystem = computed(() => {
  const system = getSystemById(selectedSystemId.value);
  return system ?? null;
});

const activeOdeSystem = computed(() => {
  const system = activeSystem.value;
  if (!system || !isOdeSystem(system)) {
    return null;
  }
  return system;
});

const activeVariationalSystem = computed(() => {
  const system = activeSystem.value;
  if (!system || !isVariationalSystem(system)) {
    return null;
  }
  return system;
});

const activeSupportedIntegrators = computed<Array<IntegratorType>>(
  () => activeOdeSystem.value?.supportedIntegrators ?? ["rk4"]
);

const supportsVerlet = computed(() => activeSupportedIntegrators.value.includes("verlet"));
const isPotential1d = computed(() => activeOdeSystem.value?.id === "potential1d");
const isBlochSphere = computed(() => activeOdeSystem.value?.id === "blochsphere");
const isTwoQubit = computed(() => activeOdeSystem.value?.id === "twoqubit");
const isSchrodinger1d = computed(() => activeOdeSystem.value?.id === "schrodinger1d");
const isTunneling1d = computed(() => activeOdeSystem.value?.id === "tunneling1d");
const isDoubleWell = computed(() => activeOdeSystem.value?.id === "doublewell");
const isRutherford = computed(() => activeOdeSystem.value?.id === "rutherford");
const isWave2d = computed(() => activeOdeSystem.value?.id === "wave2d");
const isBrownian = computed(() => activeOdeSystem.value?.id === "brownian");
const isPercolation = computed(() => activeOdeSystem.value?.id === "percolation");
const isNavierStokes2d = computed(() => activeOdeSystem.value?.id === "navierstokes2d");
const isDoubleSlit = computed(() => activeOdeSystem.value?.id === "doubleslit");
const isDoubleSlit2d = computed(() => activeOdeSystem.value?.id === "doubleslit2d");
const isTightBinding = computed(() => activeOdeSystem.value?.id === "tightbinding");
const isQftLattice = computed(() => activeOdeSystem.value?.id === "qftlattice");
const isQho1d = computed(() => activeOdeSystem.value?.id === "qho1d");
const isGeneratedQuantumState = computed(
  () =>
    isBlochSphere.value ||
    isTwoQubit.value ||
    isSchrodinger1d.value ||
    isTunneling1d.value ||
    isDoubleWell.value ||
    isDoubleSlit.value ||
    isDoubleSlit2d.value ||
    isTightBinding.value ||
    isQftLattice.value ||
    isQho1d.value
);
const hasGeneratedState = computed(
  () =>
    isGeneratedQuantumState.value ||
    isRutherford.value ||
    isWave2d.value ||
    isBrownian.value ||
    isPercolation.value ||
    isNavierStokes2d.value
);
const isSkiJump = computed(() => activeOdeSystem.value?.id === "skijump");
const isMuscleActivation = computed(() => activeOdeSystem.value?.id === "muscleactivation");

const params = ref<Record<string, number>>({});
const y0 = ref<number[]>([]);
const potentialExpression = ref(getActivePotentialExpression());
const potentialExpressionError = ref("");
const hillProfile = ref<HillPoint[]>(getActiveHillProfile());
const muscleCurve = ref<MuscleCurvePoint[]>(getActiveMuscleCurve());

const dt = ref(0.01);
const duration = ref(20);
const integrator = ref<IntegratorType>("rk4");

const selectedPlotId = ref("");
const simulation = ref<SimulateResult | null>(null);
const variationalResult = ref<VariationalResult | null>(null);
const running = ref(false);
const computing = ref(false);
const needsCompute = ref(true);
const loopPlayback = ref(false);
const currentIndex = ref(0);
const beadProgress = ref(0);
const errorMessage = ref("");

let worker: Worker | null = null;
let rafId: number | null = null;
let pendingSimulationResolve: ((result: SimulateResult) => void) | null = null;
let pendingSolveResolve: ((result: VariationalResult) => void) | null = null;
let pendingReject: ((reason?: unknown) => void) | null = null;
let lastFrameTime = 0;
let accumulatorSeconds = 0;
let previewBuildGeneration = 0;

const beadDurationSeconds = 4;

const maxIndex = computed(() => Math.max(0, (simulation.value?.t.length ?? 1) - 1));

const simSettingHelp = {
  dt: "How much simulated time each step advances. Smaller dt is usually more accurate but slower.",
  duration:
    "Total simulated time to compute. Larger duration shows longer behavior but uses more points.",
  integrator:
    "Numerical stepping method. RK4 is general-purpose; Verlet is best for some conservative systems.",
  loop: "When checked, playback restarts automatically when it reaches the end."
} as const;

const twoQubitGateButtons: Array<{ gate: TwoQubitGate; label: string }> = [
  { gate: "h1", label: "H1" },
  { gate: "h2", label: "H2" },
  { gate: "x1", label: "X1" },
  { gate: "x2", label: "X2" },
  { gate: "y1", label: "Y1" },
  { gate: "y2", label: "Y2" },
  { gate: "z1", label: "Z1" },
  { gate: "z2", label: "Z2" },
  { gate: "s1", label: "S1" },
  { gate: "s2", label: "S2" },
  { gate: "cnot12", label: "CNOT 1->2" },
  { gate: "cz", label: "CZ" }
];

const quantumRoadmapPlaceholders = [
  "RG Flow Visualizer (QFT Toy)",
  "Topological Phase Toy Model"
] as const;

function buildGeneratedInitialState(
  systemId: string,
  nextParams: Record<string, number>
): number[] | null {
  if (systemId === "blochsphere") {
    return buildBlochSphereInitialState(nextParams);
  }

  if (systemId === "twoqubit") {
    return buildTwoQubitInitialState(nextParams);
  }

  if (systemId === "schrodinger1d") {
    return buildSchrodingerInitialState(nextParams);
  }

  if (systemId === "tunneling1d") {
    return buildTunnelingInitialState(nextParams);
  }

  if (systemId === "doublewell") {
    return buildDoubleWellInitialState(nextParams);
  }

  if (systemId === "rutherford") {
    return buildRutherfordInitialState(nextParams);
  }

  if (systemId === "brownian") {
    return buildBrownianInitialState(nextParams);
  }

  if (systemId === "percolation") {
    return buildPercolationInitialState(nextParams);
  }

  if (systemId === "navierstokes2d") {
    return buildNavierStokesInitialState(nextParams);
  }

  if (systemId === "wave2d") {
    return buildWave2dInitialState(nextParams);
  }

  if (systemId === "doubleslit") {
    return buildDoubleSlitInitialState(nextParams);
  }

  if (systemId === "doubleslit2d") {
    return buildDoubleSlit2dInitialState(nextParams);
  }

  if (systemId === "tightbinding") {
    return buildTightBindingInitialState(nextParams);
  }

  if (systemId === "qftlattice") {
    return buildQftLatticeInitialState(nextParams);
  }

  if (systemId === "qho1d") {
    return buildQhoInitialState(nextParams);
  }

  return null;
}

function previewStepsForStateLength(stateLength: number): number {
  const bounded = Math.max(4, stateLength);
  const estimated = Math.round(14000 / bounded);
  return Math.max(6, Math.min(48, estimated));
}

function buildOdePreview(system: OdeSystem): CarouselPreviewMap[string] {
  const paramsForPreview = { ...system.params };
  const defaultY0 =
    buildGeneratedInitialState(system.id, paramsForPreview) ?? [...system.state.y0];
  const y0ForPreview = defaultY0.length > 0 ? defaultY0 : [...system.state.y0];

  const durationDefault = system.simulationDefaults?.duration ?? 20;
  let durationForPreview = Math.max(0.3, Math.min(durationDefault, 4));
  let steps = previewStepsForStateLength(y0ForPreview.length);

  if (system.id === "wave2d") {
    durationForPreview = Math.max(0.3, Math.min(durationDefault, 1.2));
    steps = 32;
  }

  const dtPreview = durationForPreview / steps;

  const simulatedY =
    system.id === "brownian"
      ? simulateBrownianTrajectory({
          t0: 0,
          y0: y0ForPreview,
          dt: dtPreview,
          steps,
          params: paramsForPreview
        }).y
      : system.id === "percolation"
        ? [buildPercolationInitialState(paramsForPreview)]
      : system.id === "navierstokes2d"
        ? simulateNavierStokes2d({
            t0: 0,
            y0: y0ForPreview,
            dt: dtPreview,
            steps: Math.min(10, steps),
            params: paramsForPreview
          }).y
      : integrateRk4(system.rhs, {
          t0: 0,
          y0: y0ForPreview,
          dt: dtPreview,
          steps,
          params: paramsForPreview
        }).y;

  return {
    kind: "ode",
    states: simulatedY,
    index: Math.max(0, simulatedY.length - 1),
    params: paramsForPreview,
    expression: system.id === "potential1d" ? getActivePotentialExpression() : undefined,
    hillProfile:
      system.id === "skijump" ? getActiveHillProfile().map((point) => ({ ...point })) : undefined
  };
}

function buildVariationalPreview(system: VariationalSystem): CarouselPreviewMap[string] {
  const result = system.solve({ ...system.params });
  return {
    kind: "variational",
    points: result.points.map((point) => ({ ...point })),
    referencePoints: result.referencePoints?.map((point) => ({ ...point })),
    beadProgress: 0.45
  };
}

async function buildCarouselPreviews(): Promise<void> {
  const buildId = ++previewBuildGeneration;
  carouselPreviewData.value = {};

  for (const system of systems) {
    if (buildId !== previewBuildGeneration) {
      return;
    }

    let preview: CarouselPreviewMap[string] | null = null;
    try {
      preview = isOdeSystem(system)
        ? buildOdePreview(system)
        : buildVariationalPreview(system);
    } catch {
      preview = null;
    }

    if (preview) {
      carouselPreviewData.value = {
        ...carouselPreviewData.value,
        [system.id]: preview
      };
    }

    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 0);
    });
  }
}

const activePlot = computed(() => {
  const system = activeOdeSystem.value;
  if (!system) {
    return null;
  }

  return system.plotSpec.find((plot) => plot.id === selectedPlotId.value) ?? system.plotSpec[0] ?? null;
});

const activeParamHelp = computed(() => getParamHelpForSystem(activeSystem.value?.id ?? null));
const activeStateHelp = computed(() => getStateHelpForSystem(activeSystem.value?.id ?? null));
const showIcEditor = computed(() => Boolean(activeOdeSystem.value && !hasGeneratedState.value));

const stateAtIndex = computed(() => {
  if (!simulation.value) {
    return y0.value;
  }

  return simulation.value.y[currentIndex.value] ?? y0.value;
});

const statesForViz = computed<number[][]>(() => {
  if (activeOdeSystem.value) {
    return simulation.value?.y ?? [y0.value];
  }
  return [];
});

const oscillatorSeriesX = computed(() => statesForViz.value.map((state) => state[0] ?? 0));

const currentTheta = computed(() => stateAtIndex.value[0] ?? 0);

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

const brachPointsX = computed(() => variationalResult.value?.points.map((point) => point.x) ?? []);
const brachPointsY = computed(() => variationalResult.value?.points.map((point) => point.y) ?? []);
const brachIterationX = computed(() => variationalResult.value?.series?.iteration ?? []);
const brachIterationTime = computed(() => variationalResult.value?.series?.time ?? []);

interface VectorFieldConfig {
  coordStateXIndex: number;
  coordStateYIndex: number;
  vectorDerivativeXIndex: number;
  vectorDerivativeYIndex: number;
  trajectoryX: number[];
  trajectoryY: number[];
  titleSuffix?: string;
}

function stateSeries(stateIndex: number): number[] {
  return simulation.value?.y.map((state) => state[stateIndex] ?? 0) ?? [];
}

const vectorFieldConfig = computed<VectorFieldConfig | null>(() => {
  if (!activeOdeSystem.value || !activePlot.value || !simulation.value) {
    return null;
  }

  if (
    (activeOdeSystem.value.id === "pendulum" ||
      activeOdeSystem.value.id === "oscillator" ||
      activeOdeSystem.value.id === "drivendampedoscillator" ||
      activeOdeSystem.value.id === "potential1d" ||
      activeOdeSystem.value.id === "muscleactivation") &&
    activePlot.value.id === "phase"
  ) {
    return {
      coordStateXIndex: 0,
      coordStateYIndex: 1,
      vectorDerivativeXIndex: 0,
      vectorDerivativeYIndex: 1,
      trajectoryX: stateSeries(0),
      trajectoryY: stateSeries(1)
    };
  }

  if (activeOdeSystem.value.id === "quantumbrownian" && activePlot.value.id === "mean-phase") {
    return {
      coordStateXIndex: 0,
      coordStateYIndex: 1,
      vectorDerivativeXIndex: 0,
      vectorDerivativeYIndex: 1,
      trajectoryX: stateSeries(0),
      trajectoryY: stateSeries(1),
      titleSuffix: "Mean Drift Field"
    };
  }

  if (activeOdeSystem.value.id === "orbit" && activePlot.value.id === "trajectory") {
    return {
      coordStateXIndex: 0,
      coordStateYIndex: 1,
      vectorDerivativeXIndex: 2,
      vectorDerivativeYIndex: 3,
      trajectoryX: stateSeries(0),
      trajectoryY: stateSeries(1),
      titleSuffix: "Acceleration Field"
    };
  }

  if (activeOdeSystem.value.id === "flowfield" && activePlot.value.id === "trajectory") {
    return {
      coordStateXIndex: 0,
      coordStateYIndex: 1,
      vectorDerivativeXIndex: 0,
      vectorDerivativeYIndex: 1,
      trajectoryX: stateSeries(0),
      trajectoryY: stateSeries(1),
      titleSuffix: "Flow Field"
    };
  }

  if (activeOdeSystem.value.id === "fluidparticle" && activePlot.value.id === "velocity-phase") {
    return {
      coordStateXIndex: 2,
      coordStateYIndex: 3,
      vectorDerivativeXIndex: 2,
      vectorDerivativeYIndex: 3,
      trajectoryX: stateSeries(2),
      trajectoryY: stateSeries(3),
      titleSuffix: "Velocity-Space Field"
    };
  }

  if (activeOdeSystem.value.id === "chargedparticle" && activePlot.value.id === "trajectory") {
    return {
      coordStateXIndex: 0,
      coordStateYIndex: 1,
      vectorDerivativeXIndex: 2,
      vectorDerivativeYIndex: 3,
      trajectoryX: stateSeries(0),
      trajectoryY: stateSeries(1),
      titleSuffix: "Acceleration Field"
    };
  }

  if (activeOdeSystem.value.id === "rutherford" && activePlot.value.id === "trajectory") {
    return {
      coordStateXIndex: 0,
      coordStateYIndex: 1,
      vectorDerivativeXIndex: 2,
      vectorDerivativeYIndex: 3,
      trajectoryX: stateSeries(0),
      trajectoryY: stateSeries(1),
      titleSuffix: "Acceleration Field"
    };
  }

  if (activeOdeSystem.value.id === "patchybinding" && activePlot.value.id === "trajectory") {
    return {
      coordStateXIndex: 0,
      coordStateYIndex: 1,
      vectorDerivativeXIndex: 6,
      vectorDerivativeYIndex: 7,
      trajectoryX: stateSeries(0),
      trajectoryY: stateSeries(1),
      titleSuffix: "Acceleration Field"
    };
  }

  return null;
});

function validatePotentialExpression(): boolean {
  if (!isPotential1d.value) {
    potentialExpressionError.value = "";
    return true;
  }

  try {
    setActivePotentialExpression(potentialExpression.value);
    potentialExpressionError.value = "";
    return true;
  } catch (error) {
    potentialExpressionError.value =
      error instanceof Error ? error.message : "Invalid V(x) expression.";
    return false;
  }
}

function validateHillProfileInputs(): boolean {
  if (!isSkiJump.value) {
    return true;
  }

  const range = getActiveHillRange();
  const x = y0.value[0] ?? range.xMin;
  const v = y0.value[1] ?? 0;

  if (!Number.isFinite(x) || !Number.isFinite(v)) {
    errorMessage.value = "For ski-jump, initial x and v_t must be finite numbers.";
    return false;
  }

  if (x < range.xMin || x > range.xMax) {
    errorMessage.value = `For ski-jump, initial x must be between ${range.xMin.toFixed(2)} and ${range.xMax.toFixed(2)}.`;
    return false;
  }

  return true;
}

function validateMuscleInputs(): boolean {
  if (!isMuscleActivation.value) {
    return true;
  }

  const l = y0.value[0] ?? 1;
  const v = y0.value[1] ?? 0;
  const a = y0.value[2] ?? 0;

  if (!Number.isFinite(l) || !Number.isFinite(v) || !Number.isFinite(a)) {
    errorMessage.value = "For muscle activation, initial l, v, a must be finite numbers.";
    return false;
  }

  if (l < muscleCurveBounds.lMin || l > muscleCurveBounds.lMax) {
    errorMessage.value = `For muscle activation, initial l must be between ${muscleCurveBounds.lMin.toFixed(2)} and ${muscleCurveBounds.lMax.toFixed(2)}.`;
    return false;
  }

  if (a < 0 || a > 1) {
    errorMessage.value = "For muscle activation, initial activation a must be in [0, 1].";
    return false;
  }

  return true;
}

watch(
  activeSystem,
  (system) => {
    if (!system) {
      return;
    }

    params.value = { ...system.params };
    selectedPreset.value = "custom";

    if (isOdeSystem(system)) {
      y0.value = [...system.state.y0];
      selectedPlotId.value = system.plotSpec[0]?.id ?? "";
      dt.value = system.simulationDefaults?.dt ?? 0.01;
      duration.value = system.simulationDefaults?.duration ?? 20;
      if (system.id === "potential1d") {
        potentialExpression.value = getActivePotentialExpression();
        validatePotentialExpression();
      } else {
        potentialExpressionError.value = "";
      }
      const generatedY0 = buildGeneratedInitialState(system.id, params.value);
      if (generatedY0) {
        y0.value = generatedY0;
      }
      if (system.id === "skijump") {
        hillProfile.value = getActiveHillProfile();
        const range = getActiveHillRange();
        y0.value = [range.xMin, y0.value[1] ?? 0];
      }
      if (system.id === "muscleactivation") {
        muscleCurve.value = getActiveMuscleCurve();
        y0.value = [
          Math.max(
            muscleCurveBounds.lMin,
            Math.min(muscleCurveBounds.lMax, y0.value[0] ?? 1)
          ),
          y0.value[1] ?? 0,
          Math.max(0, Math.min(1, y0.value[2] ?? 0))
        ];
      }
      const supported = system.supportedIntegrators ?? ["rk4"];
      if (!supported.includes(integrator.value)) {
        integrator.value = "rk4";
      }
    } else {
      y0.value = [];
      selectedPlotId.value = "";
    }

    clearComputationState();
  },
  { immediate: true }
);

watch(
  [params, y0, dt, duration, integrator],
  () => {
    needsCompute.value = true;
  },
  { deep: true }
);

watch(
  potentialExpression,
  () => {
    if (!isPotential1d.value) {
      return;
    }
    validatePotentialExpression();
    needsCompute.value = true;
  },
  { flush: "sync" }
);

watch(
  params,
  () => {
    if (!hasGeneratedState.value) {
      return;
    }
    const activeId = activeOdeSystem.value?.id;
    if (!activeId) {
      return;
    }
    const generatedY0 = buildGeneratedInitialState(activeId, params.value);
    if (generatedY0) {
      y0.value = generatedY0;
    }
    needsCompute.value = true;
  },
  { deep: true }
);

function initializeWorker(): void {
  worker = new Worker(new URL("../compute/worker.ts", import.meta.url), { type: "module" });

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;

    if (response.type === "simulate:result") {
      simulation.value = response;
      variationalResult.value = null;
      currentIndex.value = 0;
      needsCompute.value = false;
      computing.value = false;
      pendingSimulationResolve?.(response);
      pendingSimulationResolve = null;
      pendingSolveResolve = null;
      pendingReject = null;
      return;
    }

    if (response.type === "solve:result") {
      variationalResult.value = response.result;
      simulation.value = null;
      beadProgress.value = 0;
      needsCompute.value = false;
      computing.value = false;
      pendingSolveResolve?.(response.result);
      pendingSimulationResolve = null;
      pendingSolveResolve = null;
      pendingReject = null;
      return;
    }

    if (response.type === "error") {
      errorMessage.value = response.message;
      computing.value = false;
      running.value = false;
      stopAnimationLoop();
      pendingReject?.(new Error(response.message));
      pendingSimulationResolve = null;
      pendingSolveResolve = null;
      pendingReject = null;
    }
  };
}

initializeWorker();

onMounted(() => {
  void buildCarouselPreviews();
});

onBeforeUnmount(() => {
  previewBuildGeneration += 1;
  stopAnimationLoop();
  worker?.terminate();
  worker = null;
});

function clearComputationState(): void {
  running.value = false;
  computing.value = false;
  needsCompute.value = true;
  currentIndex.value = 0;
  beadProgress.value = 0;
  simulation.value = null;
  variationalResult.value = null;
  errorMessage.value = "";
  stopAnimationLoop();
}

function resetFrameClock(): void {
  lastFrameTime = 0;
  accumulatorSeconds = 0;
}

function stopAnimationLoop(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  resetFrameClock();
}

function startAnimationLoop(): void {
  if (rafId !== null) {
    return;
  }

  const frame = (timestamp: number) => {
    if (!running.value) {
      rafId = null;
      return;
    }

    if (lastFrameTime === 0) {
      lastFrameTime = timestamp;
    }

    const elapsedSeconds = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    if (activeOdeSystem.value && simulation.value) {
      accumulatorSeconds += elapsedSeconds;

      const sampleDt =
        simulation.value.t.length > 1 ? simulation.value.t[1] - simulation.value.t[0] : Math.max(dt.value, 1e-3);

      while (accumulatorSeconds >= sampleDt) {
        accumulatorSeconds -= sampleDt;
        if (currentIndex.value < maxIndex.value) {
          currentIndex.value += 1;
        } else {
          if (loopPlayback.value && maxIndex.value > 0) {
            currentIndex.value = 0;
          } else {
            running.value = false;
            stopAnimationLoop();
            return;
          }
        }
      }
    } else if (activeVariationalSystem.value && variationalResult.value) {
      beadProgress.value += elapsedSeconds / beadDurationSeconds;
      if (beadProgress.value >= 1) {
        if (loopPlayback.value) {
          beadProgress.value = beadProgress.value % 1;
        } else {
          beadProgress.value = 1;
          running.value = false;
          stopAnimationLoop();
          return;
        }
      }
    } else {
      running.value = false;
      stopAnimationLoop();
      return;
    }

    rafId = requestAnimationFrame(frame);
  };

  resetFrameClock();
  rafId = requestAnimationFrame(frame);
}

function choosePreset(presetName: string): void {
  selectedPreset.value = presetName;

  if (presetName === "custom") {
    return;
  }

  const system = activeOdeSystem.value;
  const preset = system?.presets?.find((item) => item.name === presetName);
  if (!preset) {
    return;
  }

  y0.value = [...preset.y0];
  if (preset.params) {
    params.value = { ...params.value, ...preset.params };
  }
  if (isPotential1d.value && preset.expression) {
    potentialExpression.value = preset.expression;
  }

  if (hasGeneratedState.value) {
    const activeId = activeOdeSystem.value?.id;
    if (activeId) {
      const generatedY0 = buildGeneratedInitialState(activeId, params.value);
      if (generatedY0) {
        y0.value = generatedY0;
      }
    }
  }

  if (isSkiJump.value) {
    const range = getActiveHillRange();
    y0.value = [range.xMin, y0.value[1] ?? 0];
  }
}

function validateInputs(): boolean {
  if (activeOdeSystem.value) {
    if (!(dt.value > 0) || !(duration.value > 0)) {
      errorMessage.value = "dt and duration must be positive values.";
      return false;
    }

    if (!validatePotentialExpression()) {
      errorMessage.value = potentialExpressionError.value || "Invalid V(x) expression.";
      return false;
    }

    if (!validateHillProfileInputs()) {
      return false;
    }

    if (!validateMuscleInputs()) {
      return false;
    }

    errorMessage.value = "";
    return true;
  }

  if (activeVariationalSystem.value) {
    const x0 = params.value.x0;
    const x1 = params.value.x1;
    const y0Value = params.value.y0;
    const y1 = params.value.y1;
    const segments = params.value.segments;
    const iterations = params.value.iterations;

    if (!(x1 > x0)) {
      errorMessage.value = "For brachistochrone, x1 must be greater than x0.";
      return false;
    }

    if (!(y1 > y0Value)) {
      errorMessage.value = "For brachistochrone, y1 must be greater than y0 (downward-positive).";
      return false;
    }

    if (!(segments >= 8) || !(iterations >= 1)) {
      errorMessage.value = "segments must be >= 8 and iterations must be >= 1.";
      return false;
    }

    errorMessage.value = "";
    return true;
  }

  errorMessage.value = "No active system selected.";
  return false;
}

async function requestSimulation(): Promise<SimulateResult> {
  if (!worker) {
    throw new Error("Worker is not initialized.");
  }

  const system = activeOdeSystem.value;
  if (!system) {
    throw new Error("ODE system not found.");
  }

  const steps = Math.max(1, Math.round(duration.value / dt.value));
  const request: WorkerRequest = {
    type: "simulate",
    systemId: system.id,
    params: { ...params.value },
    y0: [...y0.value],
    t0: 0,
    dt: dt.value,
    steps,
    integrator: integrator.value,
    expression: isPotential1d.value ? potentialExpression.value : undefined,
    hillProfile: isSkiJump.value ? hillProfileToTuples(hillProfile.value) : undefined,
    muscleCurve: isMuscleActivation.value ? muscleCurveToTuples(muscleCurve.value) : undefined
  };

  computing.value = true;

  return new Promise<SimulateResult>((resolve, reject) => {
    pendingSimulationResolve = resolve;
    pendingReject = reject;
    worker?.postMessage(request);
  });
}

async function requestSolve(): Promise<VariationalResult> {
  if (!worker) {
    throw new Error("Worker is not initialized.");
  }

  const system = activeVariationalSystem.value;
  if (!system) {
    throw new Error("Variational system not found.");
  }

  const request: WorkerRequest = {
    type: "solve",
    systemId: system.id as "brachistochrone",
    params: { ...params.value }
  };

  computing.value = true;

  return new Promise<VariationalResult>((resolve, reject) => {
    pendingSolveResolve = resolve;
    pendingReject = reject;
    worker?.postMessage(request);
  });
}

async function run(): Promise<void> {
  if (computing.value || !validateInputs()) {
    return;
  }

  const shouldCompute =
    needsCompute.value || (activeOdeSystem.value ? !simulation.value : !variationalResult.value);

  if (shouldCompute) {
    try {
      if (activeOdeSystem.value) {
        await requestSimulation();
      } else {
        await requestSolve();
      }
    } catch {
      return;
    }
  }

  running.value = true;
  startAnimationLoop();
}

function pause(): void {
  running.value = false;
  stopAnimationLoop();
}

function reset(): void {
  running.value = false;
  if (activeOdeSystem.value) {
    currentIndex.value = 0;
  } else {
    beadProgress.value = 0;
  }
  stopAnimationLoop();
}

function onScrubIndex(index: number): void {
  if (!activeOdeSystem.value) {
    return;
  }
  pause();
  currentIndex.value = Math.max(0, Math.min(index, maxIndex.value));
}

function markTwoQubitStateChanged(): void {
  pause();
  currentIndex.value = 0;
  simulation.value = null;
  needsCompute.value = true;
  errorMessage.value = "";
}

function onTwoQubitGate(gate: TwoQubitGate): void {
  if (!isTwoQubit.value) {
    return;
  }

  try {
    y0.value = applyTwoQubitGate(y0.value, gate);
    selectedPreset.value = "custom";
    markTwoQubitStateChanged();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Failed to apply two-qubit gate.";
  }
}

function onSetBellPhiPlus(): void {
  if (!isTwoQubit.value) {
    return;
  }

  y0.value = buildBellPhiPlusState();
  selectedPreset.value = "custom";
  markTwoQubitStateChanged();
}

function onSystemChange(systemId: string): void {
  selectedSystemId.value = systemId;
}

function onParamsChange(next: Record<string, number>): void {
  params.value = next;
}

function onPotentialExpressionInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  potentialExpression.value = input.value;
}

function onHillProfileChange(next: HillPoint[]): void {
  hillProfile.value = next;
  setActiveHillProfile(next);
  if (isSkiJump.value) {
    const range = getActiveHillRange();
    y0.value = [Math.max(range.xMin, Math.min(range.xMax, y0.value[0] ?? range.xMin)), y0.value[1] ?? 0];
    needsCompute.value = true;
  }
}

function onMuscleCurveChange(next: MuscleCurvePoint[]): void {
  muscleCurve.value = next;
  setActiveMuscleCurve(next);
  if (isMuscleActivation.value) {
    y0.value = [
      Math.max(muscleCurveBounds.lMin, Math.min(muscleCurveBounds.lMax, y0.value[0] ?? 1)),
      y0.value[1] ?? 0,
      Math.max(0, Math.min(1, y0.value[2] ?? 0))
    ];
    needsCompute.value = true;
  }
}

function onInitialConditionsChange(next: number[]): void {
  y0.value = next;
}

function onPresetChange(event: Event): void {
  const select = event.target as HTMLSelectElement;
  choosePreset(select.value);
}
</script>

<template>
  <main class="layout">
    <section class="panel carousel-panel">
      <DemoCarousel
        :systems="carouselSystems"
        :preview-data="carouselPreviewData"
        :model-value="selectedSystemId"
        @update:model-value="onSystemChange"
      />
    </section>

    <section class="panel controls-panel">
      <h2>MechLab</h2>

      <label class="field" v-if="activeOdeSystem?.presets?.length">
        <span class="label">Preset</span>
        <select :value="selectedPreset" @change="onPresetChange">
          <option value="custom">Custom</option>
          <option v-for="preset in activeOdeSystem.presets" :key="preset.name" :value="preset.name">
            {{ preset.name }}
          </option>
        </select>
      </label>

      <ParamEditor
        :params="params"
        :system-id="activeSystem?.id ?? null"
        :param-help="activeParamHelp"
        @update:params="onParamsChange"
      />

      <section class="group" v-if="isPotential1d">
        <h3>Potential</h3>

        <label class="field">
          <span class="field-label">V(x)</span>
          <input
            type="text"
            :value="potentialExpression"
            spellcheck="false"
            placeholder="0.5 * x^2"
            @input="onPotentialExpressionInput"
          />
        </label>

        <p class="status">Use variable <code>x</code>. Example: <code>0.25 * x^4 - 0.5 * x^2</code>.</p>
        <p class="error" v-if="potentialExpressionError">{{ potentialExpressionError }}</p>
      </section>

      <section class="group" v-if="isGeneratedQuantumState">
        <h3>Quantum/QFT Placemarkers</h3>
        <p class="status">
          Implemented: Bloch Sphere (single qubit), Two-Qubit Entanglement Playground, 1D Schrodinger wavepacket, Resonant Tunneling, Quantum Double-Well Tunneling, 1D + 2D Double-Slit Interference, Tight-Binding Chain, QFT Lattice (1+1D), Quantum Harmonic Oscillator.
        </p>
        <p class="status">Planned demos for future milestones:</p>
        <ul class="roadmap-list">
          <li v-for="item in quantumRoadmapPlaceholders" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="group" v-if="isTwoQubit">
        <h3>Gate Playground</h3>
        <div class="gate-grid">
          <button
            v-for="item in twoQubitGateButtons"
            :key="item.gate"
            type="button"
            class="gate-btn"
            @click="onTwoQubitGate(item.gate)"
          >
            {{ item.label }}
          </button>
        </div>
        <button type="button" class="gate-btn bell-btn" @click="onSetBellPhiPlus">
          Set Bell |Phi+>
        </button>
        <p class="status">
          Gates apply to the current initial state and then you can run to simulate from that state.
        </p>
      </section>

      <section class="group" v-if="isSkiJump">
        <h3>Hill Geometry</h3>
        <HillCurveEditor :points="hillProfile" @update:points="onHillProfileChange" />
      </section>

      <section class="group" v-if="isMuscleActivation">
        <h3>Active Length-Tension</h3>
        <MuscleCurveEditor :points="muscleCurve" @update:points="onMuscleCurveChange" />
      </section>

      <IcEditor
        v-if="showIcEditor"
        :system-id="activeSystem?.id ?? null"
        :state-names="activeOdeSystem?.state.names ?? []"
        :values="y0"
        :state-help="activeStateHelp"
        @update:values="onInitialConditionsChange"
      />

      <section class="group" v-if="activeOdeSystem">
        <h3>Simulation</h3>

        <label class="field">
          <span class="field-label-wrap">
            <span class="field-label">dt</span>
            <span class="help-icon-inline" tabindex="0" aria-label="dt help">
              ❓
              <span class="help-tooltip">{{ simSettingHelp.dt }}</span>
            </span>
          </span>
          <input v-model.number="dt" type="number" min="0.0001" step="0.001" />
        </label>

        <label class="field">
          <span class="field-label-wrap">
            <span class="field-label">duration</span>
            <span class="help-icon-inline" tabindex="0" aria-label="duration help">
              ❓
              <span class="help-tooltip">{{ simSettingHelp.duration }}</span>
            </span>
          </span>
          <input v-model.number="duration" type="number" min="0.1" step="0.5" />
        </label>

        <label class="field">
          <span class="field-label-wrap">
            <span class="field-label">integrator</span>
            <span class="help-icon-inline" tabindex="0" aria-label="integrator help">
              ❓
              <span class="help-tooltip">{{ simSettingHelp.integrator }}</span>
            </span>
          </span>
          <select v-model="integrator">
            <option value="rk4">rk4</option>
            <option value="verlet" :disabled="!supportsVerlet">
              verlet{{ supportsVerlet ? "" : " (not supported)" }}
            </option>
          </select>
        </label>
      </section>

      <p class="status" v-if="computing">
        {{ activeOdeSystem ? "Computing simulation in worker..." : "Solving variational problem in worker..." }}
      </p>
      <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
    </section>

    <section class="panel viz-panel">
      <h2>Visualization</h2>

      <DemoExplanationPanel :system-id="activeSystem?.id ?? null" />

      <section class="sim-toolbar">
        <SimControls
          :running="running"
          :can-run="Boolean(activeSystem) && !computing"
          @run="run"
          @pause="pause"
          @reset="reset"
        />

        <TimeScrubber
          v-if="activeOdeSystem"
          :index="currentIndex"
          :max="maxIndex"
          :disabled="!simulation"
          @update:index="onScrubIndex"
        />

        <label class="loop-toggle">
          <input v-model="loopPlayback" type="checkbox" />
          <span class="field-label-wrap">
            <span>Loop</span>
            <span class="help-icon-inline" tabindex="0" aria-label="loop playback help">
              ❓
              <span class="help-tooltip">{{ simSettingHelp.loop }}</span>
            </span>
          </span>
        </label>
      </section>

      <div class="viz-stage">
        <PendulumViz
          v-if="activeOdeSystem?.vizSpec.type === 'pendulum'"
          :theta="currentTheta"
          :length="effectiveLength"
        />

        <OscillatorViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'oscillator'"
          :x="stateAtIndex[0] ?? 0"
          :series-x="oscillatorSeriesX"
        />

        <Potential1DViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'potential1d'"
          :states="statesForViz"
          :index="currentIndex"
          :expression="potentialExpression"
          :mass="params.m ?? 1"
        />

        <BlochSphereViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'blochsphere'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <TwoQubitViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'twoqubit'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <Schrodinger1DViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'schrodinger1d'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <Tunneling1DViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'tunneling1d'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <DoubleWellTunnelingViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'doublewell'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <DoubleSlitViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'doubleslit'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <DoubleSlit2DViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'doubleslit2d'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <TightBindingViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'tightbinding'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <QftLatticeViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'qftlattice'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <QuantumHarmonicViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'qho1d'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <QuantumBrownianViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'quantumbrownian'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <MuscleActivationViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'muscleactivation'"
          :states="statesForViz"
          :index="currentIndex"
        />

        <ProjectileViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'projectile'"
          :states="statesForViz"
          :index="currentIndex"
        />

        <SkiJumpViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'skijump'"
          :states="statesForViz"
          :index="currentIndex"
          :hill-profile="hillProfile"
        />

        <ChargedParticleViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'chargedparticle'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <RutherfordViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'rutherford'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <PatchyBindingViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'patchybinding'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <Wave2DViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'wave2d'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <OrbitViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'orbit'"
          :states="statesForViz"
          :index="currentIndex"
        />

        <FlowFieldViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'flowfield'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <PercolationViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'percolation'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <NavierStokes2DViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'navierstokes2d'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <FluidParticleViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'fluidparticle'"
          :states="statesForViz"
          :index="currentIndex"
        />

        <BrownianViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'brownian'"
          :states="statesForViz"
          :index="currentIndex"
          :params="params"
        />

        <CartPoleViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'cartpole'"
          :states="statesForViz"
          :index="currentIndex"
          :l="effectiveLength"
        />

        <DoublePendulumViz
          v-else-if="activeOdeSystem?.vizSpec.type === 'doublependulum'"
          :states="statesForViz"
          :index="currentIndex"
          :l1="effectiveL1"
          :l2="effectiveL2"
        />

        <BrachistochroneViz
          v-else-if="activeVariationalSystem && variationalResult"
          :points="variationalResult.points"
          :reference-points="variationalResult.referencePoints"
          :bead-progress="beadProgress"
        />

        <p v-else class="placeholder">
          {{ activeVariationalSystem ? "Run solve to render the brachistochrone." : "Visualization unavailable." }}
        </p>
      </div>

      <EquationPanel :system-id="activeSystem?.id ?? null" />
    </section>

    <section class="panel plots-panel">
      <h2>Plots</h2>

      <div class="plots-content">
        <template v-if="activeOdeSystem">
          <label class="field" v-if="activeOdeSystem.plotSpec.length > 1">
            <span class="label">Plot</span>
            <select v-model="selectedPlotId">
              <option v-for="plot in activeOdeSystem.plotSpec" :key="plot.id" :value="plot.id">
                {{ plot.title }}
              </option>
            </select>
          </label>

          <PhaseVectorFieldPanel
            v-if="activePlot && simulation && vectorFieldConfig"
            :title="`${activePlot.title} ${vectorFieldConfig.titleSuffix ?? 'Vector Field'}`"
            :x-label="activePlot.xLabel"
            :y-label="activePlot.yLabel"
            :rhs="activeOdeSystem.rhs"
            :params="params"
            :baseline-state="y0"
            :coord-state-x-index="vectorFieldConfig.coordStateXIndex"
            :coord-state-y-index="vectorFieldConfig.coordStateYIndex"
            :vector-derivative-x-index="vectorFieldConfig.vectorDerivativeXIndex"
            :vector-derivative-y-index="vectorFieldConfig.vectorDerivativeYIndex"
            :trajectory-x="vectorFieldConfig.trajectoryX"
            :trajectory-y="vectorFieldConfig.trajectoryY"
          />

          <PlotPanel
            v-else-if="activePlot && simulation"
            :spec="activePlot"
            :t="simulation.t"
            :y="simulation.y"
            :energy="simulation.energy"
            :derived="simulation.derived"
          />

          <p v-else class="placeholder">Run a simulation to render the plot.</p>
        </template>

        <template v-else-if="activeVariationalSystem">
          <div class="stats" v-if="variationalResult">
            <p>
              <strong>Optimized Time:</strong>
              {{ (variationalResult.meta.descentTime ?? Number.NaN).toFixed(5) }}
            </p>
            <p>
              <strong>Straight-Line Time:</strong>
              {{ (variationalResult.meta.straightLineTime ?? Number.NaN).toFixed(5) }}
            </p>
            <p>
              <strong>Improvement:</strong>
              {{ (variationalResult.meta.improvementPct ?? 0).toFixed(2) }}%
            </p>
          </div>

          <RawPlotPanel
            v-if="variationalResult"
            title="Brachistochrone Curve y(x)"
            x-label="x"
            y-label="y"
            :x="brachPointsX"
            :y="brachPointsY"
          />

          <RawPlotPanel
            v-if="variationalResult && brachIterationX.length > 1 && brachIterationTime.length > 1"
            title="Travel Time vs Iteration"
            x-label="iteration"
            y-label="time"
            :x="brachIterationX"
            :y="brachIterationTime"
          />

          <p v-if="!variationalResult" class="placeholder">Run solve to render curve and optimization plots.</p>
        </template>
      </div>
    </section>
  </main>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(230px, 300px) minmax(260px, 1fr) minmax(340px, 500px);
  gap: 0.85rem;
  padding: 0.85rem;
}

.carousel-panel {
  grid-column: 1 / -1;
  padding: 0.7rem 0.8rem;
}

.panel {
  background: #fdfefe;
  border: 1px solid #c8d5ea;
  border-radius: 12px;
  padding: 0.85rem;
  box-shadow: 0 1px 2px rgba(10, 20, 40, 0.06);
}

h2 {
  margin: 0 0 0.8rem;
  font-size: 1.05rem;
}

h3 {
  margin: 0;
  font-size: 0.95rem;
}

.group {
  display: grid;
  gap: 0.5rem;
}

.field {
  display: grid;
  gap: 0.3rem;
}

.field-label,
.label {
  font-size: 0.82rem;
  font-weight: 600;
}

.field-label-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.help-icon-inline {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  user-select: none;
  line-height: 1;
}

.help-tooltip {
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
  z-index: 30;
}

.help-icon-inline:hover .help-tooltip,
.help-icon-inline:focus .help-tooltip {
  opacity: 1;
  visibility: visible;
}

input,
select {
  width: 100%;
  border: 1px solid #aebed8;
  border-radius: 6px;
  padding: 0.35rem 0.45rem;
  background: #fff;
}

.controls-panel {
  display: grid;
  align-content: start;
  gap: 0.85rem;
}

.viz-panel {
  display: grid;
  align-content: start;
  gap: 0.6rem;
}

.sim-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.55rem 0.75rem;
  border: 1px solid #d3ddef;
  border-radius: 10px;
  background: #f9fbff;
  padding: 0.5rem;
}

.loop-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #30415f;
  width: fit-content;
}

.loop-toggle input {
  width: auto;
  margin: 0;
}

.viz-stage {
  min-height: 250px;
  border: 1px solid #d3ddef;
  border-radius: 10px;
  background: #f9fbff;
  display: grid;
  place-items: center;
  padding: 0.35rem;
  overflow: hidden;
}

.plots-panel {
  display: grid;
  align-content: start;
  gap: 0.75rem;
}

.plots-content {
  display: grid;
  align-content: start;
  gap: 0.75rem;
  min-height: 250px;
}

.stats {
  border: 1px solid #ced9ec;
  background: #fff;
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  display: grid;
  gap: 0.2rem;
}

.stats p {
  margin: 0;
  font-size: 0.85rem;
}

.status {
  margin: 0;
  font-size: 0.82rem;
  color: #35507e;
}

.roadmap-list {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.22rem;
  font-size: 0.79rem;
  color: #364968;
}

.gate-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
}

.gate-btn {
  border: 1px solid #aec1df;
  background: #f7faff;
  color: #2a3d5d;
  border-radius: 7px;
  padding: 0.3rem 0.4rem;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
}

.gate-btn:hover {
  background: #ebf2ff;
}

.bell-btn {
  justify-self: start;
}

.error {
  margin: 0;
  font-size: 0.82rem;
  color: #9b1c1c;
}

.placeholder {
  margin: 0;
  color: #4c5872;
  font-size: 0.9rem;
}

@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>

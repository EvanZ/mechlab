import type { OdeSystem } from "../types";

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export const drivenDampedOscillatorSystem: OdeSystem = {
  id: "drivendampedoscillator",
  name: "Driven Damped Oscillator",
  mode: "ode",
  state: {
    names: ["x", "v"],
    y0: [0, 0]
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 40
  },
  supportedIntegrators: ["rk4"],
  params: {
    m: 1,
    k: 1,
    c: 0.2,
    F0: 0.8,
    omegaDrive: 1,
    phiDrive: 0
  },
  rhs: (t, y, p) => {
    const x = finiteOr(y[0], 0);
    const v = finiteOr(y[1], 0);

    const m = Math.max(1e-6, finiteOr(p.m, 1));
    const k = Math.max(0, finiteOr(p.k, 1));
    const c = Math.max(0, finiteOr(p.c, 0.2));
    const f0 = finiteOr(p.F0, 0.8);
    const omegaDrive = Math.max(0, finiteOr(p.omegaDrive, 1));
    const phiDrive = finiteOr(p.phiDrive, 0);

    const drive = f0 * Math.cos(omegaDrive * t + phiDrive);
    const a = (drive - c * v - k * x) / m;

    return [v, a];
  },
  energy: (y, p) => {
    const x = finiteOr(y[0], 0);
    const v = finiteOr(y[1], 0);
    const m = Math.max(1e-6, finiteOr(p.m, 1));
    const k = Math.max(0, finiteOr(p.k, 1));
    return 0.5 * m * v * v + 0.5 * k * x * x;
  },
  derived: (y, p) => {
    const x = finiteOr(y[0], 0);
    const v = finiteOr(y[1], 0);
    const c = Math.max(0, finiteOr(p.c, 0.2));

    return {
      speed: Math.abs(v),
      dampingPower: c * v * v,
      displacementAbs: Math.abs(x)
    };
  },
  presets: [
    {
      name: "Near Resonance",
      y0: [0, 0],
      params: {
        c: 0.15,
        F0: 1,
        omegaDrive: 1
      }
    },
    {
      name: "Off Resonance",
      y0: [0, 0],
      params: {
        c: 0.15,
        F0: 1,
        omegaDrive: 1.7
      }
    },
    {
      name: "Heavy Damping",
      y0: [0, 0],
      params: {
        c: 0.9,
        F0: 1,
        omegaDrive: 1
      }
    },
    {
      name: "Impulse Start + Drive",
      y0: [0, 1.5],
      params: {
        c: 0.2,
        F0: 0.6,
        omegaDrive: 1.05
      }
    }
  ],
  plotSpec: [
    {
      id: "x-time",
      title: "Position vs Time",
      xLabel: "t",
      yLabel: "x",
      x: { kind: "time" },
      y: { kind: "state", index: 0 }
    },
    {
      id: "v-time",
      title: "Velocity vs Time",
      xLabel: "t",
      yLabel: "v",
      x: { kind: "time" },
      y: { kind: "state", index: 1 }
    },
    {
      id: "phase",
      title: "Phase Portrait",
      xLabel: "x",
      yLabel: "v",
      x: { kind: "state", index: 0 },
      y: { kind: "state", index: 1 }
    },
    {
      id: "energy",
      title: "Mechanical Energy vs Time",
      xLabel: "t",
      yLabel: "E",
      x: { kind: "time" },
      y: { kind: "energy" }
    },
    {
      id: "damping-power",
      title: "Damping Dissipation c v^2",
      xLabel: "t",
      yLabel: "P_damp",
      x: { kind: "time" },
      y: { kind: "derived", key: "dampingPower" }
    }
  ],
  vizSpec: {
    type: "oscillator"
  }
};

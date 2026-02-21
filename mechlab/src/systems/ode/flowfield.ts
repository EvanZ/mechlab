import type { OdeSystem } from "../types";

export function flowFieldVelocity(x: number, y: number, p: Record<string, number>): { u: number; v: number } {
  const uniformU = p.uniformU;
  const uniformV = p.uniformV;
  const sourceStrength = p.sourceStrength;
  const vortexStrength = p.vortexStrength;
  const coreRadius = Math.max(1e-4, p.coreRadius);

  const r2 = x * x + y * y + coreRadius * coreRadius;
  const twoPi = 2 * Math.PI;

  const sourceU = (sourceStrength / twoPi) * (x / r2);
  const sourceV = (sourceStrength / twoPi) * (y / r2);

  const vortexU = -(vortexStrength / twoPi) * (y / r2);
  const vortexV = (vortexStrength / twoPi) * (x / r2);

  return {
    u: uniformU + sourceU + vortexU,
    v: uniformV + sourceV + vortexV
  };
}

export const flowFieldSystem: OdeSystem = {
  id: "flowfield",
  name: "Flow Field Tracer",
  mode: "ode",
  state: {
    names: ["x", "y"],
    y0: [-1.5, 0.5]
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 16
  },
  supportedIntegrators: ["rk4"],
  params: {
    uniformU: 0.8,
    uniformV: 0,
    sourceStrength: 0,
    vortexStrength: 0,
    coreRadius: 0.12
  },
  rhs: (_t, y, p) => {
    const [x, yPos] = y;
    const { u, v } = flowFieldVelocity(x, yPos, p);
    return [u, v];
  },
  derived: (y, p) => {
    const [x, yPos] = y;
    const { u, v } = flowFieldVelocity(x, yPos, p);
    return {
      speed: Math.hypot(u, v),
      u,
      v
    };
  },
  presets: [
    {
      name: "Uniform Stream",
      y0: [-1.6, 0.35],
      params: {
        uniformU: 0.9,
        uniformV: 0,
        sourceStrength: 0,
        vortexStrength: 0
      }
    },
    {
      name: "Point Source",
      y0: [0.15, 0],
      params: {
        uniformU: 0,
        uniformV: 0,
        sourceStrength: 1.6,
        vortexStrength: 0
      }
    },
    {
      name: "Pure Vortex",
      y0: [1.0, 0],
      params: {
        uniformU: 0,
        uniformV: 0,
        sourceStrength: 0,
        vortexStrength: 4.2
      }
    },
    {
      name: "Spiral Source",
      y0: [0.25, 0.15],
      params: {
        uniformU: 0.25,
        uniformV: 0,
        sourceStrength: 1.1,
        vortexStrength: 2.2
      }
    }
  ],
  plotSpec: [
    {
      id: "trajectory",
      title: "Tracer Path (x, y)",
      xLabel: "x",
      yLabel: "y",
      x: { kind: "state", index: 0 },
      y: { kind: "state", index: 1 }
    },
    {
      id: "x-time",
      title: "x vs Time",
      xLabel: "t",
      yLabel: "x",
      x: { kind: "time" },
      y: { kind: "state", index: 0 }
    },
    {
      id: "y-time",
      title: "y vs Time",
      xLabel: "t",
      yLabel: "y",
      x: { kind: "time" },
      y: { kind: "state", index: 1 }
    },
    {
      id: "speed-time",
      title: "Local Flow Speed vs Time",
      xLabel: "t",
      yLabel: "|v|",
      x: { kind: "time" },
      y: { kind: "derived", key: "speed" }
    }
  ],
  vizSpec: {
    type: "flowfield"
  }
};

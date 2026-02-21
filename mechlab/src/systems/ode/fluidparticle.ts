import type { OdeSystem } from "../types";

function massFromParams(p: Record<string, number>): number {
  const radius = Math.max(1e-6, p.radius);
  const rhoParticle = Math.max(1e-6, p.rhoParticle);
  const volume = (4 / 3) * Math.PI * radius * radius * radius;
  return rhoParticle * volume;
}

function linearDragCoefficient(p: Record<string, number>): number {
  const radius = Math.max(1e-6, p.radius);
  const mu = Math.max(0, p.mu);
  return 6 * Math.PI * mu * radius;
}

function quadraticDragCoefficient(p: Record<string, number>): number {
  const radius = Math.max(1e-6, p.radius);
  const rhoFluid = Math.max(0, p.rhoFluid);
  const cd = Math.max(0, p.cd);
  const area = Math.PI * radius * radius;
  return 0.5 * rhoFluid * cd * area;
}

function netGravityAccel(p: Record<string, number>): number {
  const g = Math.max(0, p.g);
  const rhoFluid = Math.max(0, p.rhoFluid);
  const rhoParticle = Math.max(1e-6, p.rhoParticle);

  return g * (1 - rhoFluid / rhoParticle);
}

export const fluidParticleSystem: OdeSystem = {
  id: "fluidparticle",
  name: "Particle In Fluid",
  mode: "ode",
  state: {
    names: ["x", "y", "vx", "vy"],
    y0: [0, 0, 0.2, 0]
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 12
  },
  supportedIntegrators: ["rk4"],
  params: {
    g: 9.81,
    mu: 0.001,
    rhoFluid: 1000,
    rhoParticle: 1150,
    radius: 0.01,
    cd: 0.47
  },
  rhs: (_t, y, p) => {
    const [, , vx, vy] = y;

    const mass = massFromParams(p);
    const cLin = linearDragCoefficient(p);
    const cQuad = quadraticDragCoefficient(p);
    const gNet = netGravityAccel(p);

    const speed = Math.hypot(vx, vy);
    const dragX = cLin * vx + cQuad * speed * vx;
    const dragY = cLin * vy + cQuad * speed * vy;

    const ax = -dragX / mass;
    const ay = -gNet - dragY / mass;

    return [vx, vy, ax, ay];
  },
  derived: (y, p) => {
    const [, , vx, vy] = y;

    const mass = massFromParams(p);
    const cLin = linearDragCoefficient(p);
    const cQuad = quadraticDragCoefficient(p);
    const gNet = netGravityAccel(p);

    const speed = Math.hypot(vx, vy);
    const dragX = -(cLin * vx + cQuad * speed * vx);
    const dragY = -(cLin * vy + cQuad * speed * vy);

    const dragMag = Math.hypot(dragX, dragY);
    const terminalSpeedLinear = cLin > 0 ? gNet * mass / cLin : Number.POSITIVE_INFINITY;

    return {
      speed,
      dragMag,
      gNet,
      mass,
      terminalSpeedLinear
    };
  },
  presets: [
    {
      name: "Steel Bead In Water",
      y0: [0, 0, 0, 0],
      params: {
        mu: 0.001,
        rhoFluid: 1000,
        rhoParticle: 7800,
        radius: 0.006,
        cd: 0.47
      }
    },
    {
      name: "Plastic Bead In Water (Rises)",
      y0: [0, -0.4, 0, 0],
      params: {
        mu: 0.001,
        rhoFluid: 1000,
        rhoParticle: 920,
        radius: 0.008,
        cd: 0.47
      }
    },
    {
      name: "Sphere In Air",
      y0: [0, 0, 0, 0],
      params: {
        mu: 1.8e-5,
        rhoFluid: 1.2,
        rhoParticle: 1200,
        radius: 0.015,
        cd: 0.47
      }
    },
    {
      name: "Viscous Syrup",
      y0: [0, 0, 0, 0],
      params: {
        mu: 1.2,
        rhoFluid: 1350,
        rhoParticle: 2500,
        radius: 0.008,
        cd: 0.47
      }
    }
  ],
  plotSpec: [
    {
      id: "trajectory",
      title: "Trajectory (x, y)",
      xLabel: "x",
      yLabel: "y",
      x: { kind: "state", index: 0 },
      y: { kind: "state", index: 1 }
    },
    {
      id: "speed-time",
      title: "Speed vs Time",
      xLabel: "t",
      yLabel: "|v|",
      x: { kind: "time" },
      y: { kind: "derived", key: "speed" }
    },
    {
      id: "vy-time",
      title: "Vertical Velocity vs Time",
      xLabel: "t",
      yLabel: "vy",
      x: { kind: "time" },
      y: { kind: "state", index: 3 }
    },
    {
      id: "velocity-phase",
      title: "Velocity Space (vx, vy)",
      xLabel: "vx",
      yLabel: "vy",
      x: { kind: "state", index: 2 },
      y: { kind: "state", index: 3 }
    },
    {
      id: "drag-time",
      title: "Drag Magnitude vs Time",
      xLabel: "t",
      yLabel: "|F_drag|",
      x: { kind: "time" },
      y: { kind: "derived", key: "dragMag" }
    }
  ],
  vizSpec: {
    type: "fluidparticle"
  }
};

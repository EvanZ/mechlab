import type { OdeSystem } from "../types";

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeAngleRad(angle: number): number {
  const twoPi = 2 * Math.PI;
  let wrapped = (angle + Math.PI) % twoPi;
  if (wrapped < 0) {
    wrapped += twoPi;
  }
  return wrapped - Math.PI;
}

function normalizeAngleDeg(angleDeg: number): number {
  return (normalizeAngleRad((angleDeg * Math.PI) / 180) * 180) / Math.PI;
}

function safeParams(p: Record<string, number>) {
  const m = Math.max(1e-8, finiteOr(p.m, 1));
  const qProj = finiteOr(p.qProj, 1);
  const qTarget = finiteOr(p.qTarget, 1);
  const kC = finiteOr(p.kC, 1);
  const coreRadius = Math.max(1e-4, finiteOr(p.coreRadius, 0.18));
  const xStart = finiteOr(p.xStart, -8);
  const impactParam = finiteOr(p.impactParam, 1.2);
  const beamSpeed = Math.max(1e-6, Math.abs(finiteOr(p.beamSpeed, 2.4)));

  return {
    m,
    qProj,
    qTarget,
    kC,
    coreRadius,
    xStart,
    impactParam,
    beamSpeed
  };
}

function coulombStrength(p: Record<string, number>): number {
  const s = safeParams(p);
  return s.kC * s.qProj * s.qTarget;
}

function safeImpactForFormula(b: number): number {
  if (Math.abs(b) >= 1e-6) {
    return b;
  }
  return b >= 0 ? 1e-6 : -1e-6;
}

function predictedScatterAngleRad(p: Record<string, number>): number {
  const s = safeParams(p);
  const kappa = coulombStrength(p);
  const b = safeImpactForFormula(s.impactParam);
  return 2 * Math.atan2(kappa, s.m * s.beamSpeed * s.beamSpeed * b);
}

export function rutherfordCoulombStrength(p: Record<string, number>): number {
  return coulombStrength(p);
}

export function rutherfordPredictedScatterDeg(p: Record<string, number>): number {
  return (normalizeAngleRad(predictedScatterAngleRad(p)) * 180) / Math.PI;
}

export function buildRutherfordInitialState(p: Record<string, number>): number[] {
  const s = safeParams(p);
  return [s.xStart, s.impactParam, s.beamSpeed, 0];
}

export const rutherfordSystem: OdeSystem = {
  id: "rutherford",
  name: "Rutherford Scattering",
  mode: "ode",
  state: {
    names: [],
    y0: buildRutherfordInitialState({
      m: 1,
      qProj: 1,
      qTarget: 1,
      kC: 1,
      coreRadius: 0.18,
      xStart: -8,
      impactParam: 1.2,
      beamSpeed: 2.4
    })
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 8
  },
  supportedIntegrators: ["rk4", "verlet"],
  params: {
    m: 1,
    qProj: 1,
    qTarget: 1,
    kC: 1,
    coreRadius: 0.18,
    xStart: -8,
    impactParam: 1.2,
    beamSpeed: 2.4
  },
  rhs: (_t, y, p) => {
    const [x, yPos, vx, vy] = y;
    const s = safeParams(p);
    const kappa = coulombStrength(p);

    const r2 = x * x + yPos * yPos + s.coreRadius * s.coreRadius;
    const r = Math.sqrt(r2);
    const invR3 = r === 0 ? 0 : 1 / (r2 * r);

    const ax = (kappa * x * invR3) / s.m;
    const ay = (kappa * yPos * invR3) / s.m;

    return [vx, vy, ax, ay];
  },
  energy: (y, p) => {
    const [x, yPos, vx, vy] = y;
    const s = safeParams(p);
    const kappa = coulombStrength(p);
    const r = Math.sqrt(x * x + yPos * yPos + s.coreRadius * s.coreRadius);
    const kinetic = 0.5 * s.m * (vx * vx + vy * vy);

    return kinetic + kappa / r;
  },
  derived: (y, p) => {
    const [x, yPos, vx, vy] = y;
    const s = safeParams(p);
    const kappa = coulombStrength(p);

    const r = Math.sqrt(x * x + yPos * yPos + s.coreRadius * s.coreRadius);
    const speed = Math.hypot(vx, vy);
    const headingRad = Math.atan2(vy, vx);
    const scatterRad = normalizeAngleRad(headingRad);
    const scatterDeg = (scatterRad * 180) / Math.PI;
    const predictedRad = normalizeAngleRad(predictedScatterAngleRad(p));
    const predictedDeg = (predictedRad * 180) / Math.PI;
    const angleErrorDeg = normalizeAngleDeg(scatterDeg - predictedDeg);
    const lz = s.m * (x * vy - yPos * vx);

    return {
      r,
      speed,
      scatterDeg,
      predictedDeg,
      angleErrorDeg,
      lz,
      impactParam: s.impactParam,
      kappa,
      headingDeg: (headingRad * 180) / Math.PI
    };
  },
  presets: [
    {
      name: "Repulsive Moderate Deflection",
      y0: buildRutherfordInitialState({
        m: 1,
        qProj: 1,
        qTarget: 1,
        kC: 1,
        coreRadius: 0.18,
        xStart: -8,
        impactParam: 1.2,
        beamSpeed: 2.4
      })
    },
    {
      name: "Repulsive Large-Angle",
      y0: buildRutherfordInitialState({
        m: 1,
        qProj: 1,
        qTarget: 1,
        kC: 1,
        coreRadius: 0.18,
        xStart: -8,
        impactParam: 0.38,
        beamSpeed: 2.2
      }),
      params: {
        impactParam: 0.38,
        beamSpeed: 2.2
      }
    },
    {
      name: "High-Energy Forward Scattering",
      y0: buildRutherfordInitialState({
        m: 1,
        qProj: 1,
        qTarget: 1,
        kC: 1,
        coreRadius: 0.18,
        xStart: -8,
        impactParam: 1.2,
        beamSpeed: 4.2
      }),
      params: {
        beamSpeed: 4.2
      }
    },
    {
      name: "Attractive Coulomb",
      y0: buildRutherfordInitialState({
        m: 1,
        qProj: 1,
        qTarget: -1,
        kC: 1,
        coreRadius: 0.18,
        xStart: -8,
        impactParam: 1.2,
        beamSpeed: 2.4
      }),
      params: {
        qTarget: -1
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
      id: "scatter-time",
      title: "Scattering Angle vs Time",
      xLabel: "t",
      yLabel: "theta [deg]",
      x: { kind: "time" },
      y: { kind: "derived", key: "scatterDeg" }
    },
    {
      id: "angle-error-time",
      title: "Angle Error (Numeric - Rutherford) vs Time",
      xLabel: "t",
      yLabel: "Delta theta [deg]",
      x: { kind: "time" },
      y: { kind: "derived", key: "angleErrorDeg" }
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
      id: "lz-time",
      title: "Angular Momentum Lz vs Time",
      xLabel: "t",
      yLabel: "Lz",
      x: { kind: "time" },
      y: { kind: "derived", key: "lz" }
    },
    {
      id: "energy",
      title: "Energy vs Time",
      xLabel: "t",
      yLabel: "E",
      x: { kind: "time" },
      y: { kind: "energy" }
    }
  ],
  vizSpec: {
    type: "rutherford"
  }
};

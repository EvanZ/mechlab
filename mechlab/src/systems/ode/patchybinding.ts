import type { OdeSystem } from "../types";

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function positive(value: number, fallback: number): number {
  return Math.max(1e-8, finiteOr(value, fallback));
}

function normalizeAngleRad(theta: number): number {
  const twoPi = 2 * Math.PI;
  let wrapped = (theta + Math.PI) % twoPi;
  if (wrapped < 0) {
    wrapped += twoPi;
  }
  return wrapped - Math.PI;
}

function normalizeAngleDeg(theta: number): number {
  return (normalizeAngleRad(theta) * 180) / Math.PI;
}

interface PatchyParams {
  m1: number;
  m2: number;
  I1: number;
  I2: number;
  drag1: number;
  drag2: number;
  rotDrag1: number;
  rotDrag2: number;
  kRep: number;
  kAttr: number;
  bindRadius: number;
  bindWidth: number;
  kTorque: number;
  patchSharpness: number;
  coreRadius1: number;
  coreRadius2: number;
}

function patchyParams(p: Record<string, number>): PatchyParams {
  return {
    m1: positive(p.m1, 1),
    m2: positive(p.m2, 1.2),
    I1: positive(p.I1, 0.35),
    I2: positive(p.I2, 0.45),
    drag1: Math.max(0, finiteOr(p.drag1, 1.0)),
    drag2: Math.max(0, finiteOr(p.drag2, 1.1)),
    rotDrag1: Math.max(0, finiteOr(p.rotDrag1, 1.1)),
    rotDrag2: Math.max(0, finiteOr(p.rotDrag2, 1.2)),
    kRep: Math.max(0, finiteOr(p.kRep, 36)),
    kAttr: Math.max(0, finiteOr(p.kAttr, 12)),
    bindRadius: Math.max(0.15, finiteOr(p.bindRadius, 1.42)),
    bindWidth: Math.max(0.03, finiteOr(p.bindWidth, 0.24)),
    kTorque: Math.max(0, finiteOr(p.kTorque, 11)),
    patchSharpness: clamp(Math.round(finiteOr(p.patchSharpness, 3)), 1, 8),
    coreRadius1: Math.max(0.08, finiteOr(p.coreRadius1, 0.70)),
    coreRadius2: Math.max(0.08, finiteOr(p.coreRadius2, 0.76))
  };
}

interface TwoBodyState {
  x1: number;
  y1: number;
  theta1: number;
  x2: number;
  y2: number;
  theta2: number;
  vx1: number;
  vy1: number;
  omega1: number;
  vx2: number;
  vy2: number;
  omega2: number;
}

export interface PatchyInitSpec {
  x1: number;
  y1: number;
  theta1: number;
  x2: number;
  y2: number;
  theta2: number;
  vx1: number;
  vy1: number;
  omega1: number;
  vx2: number;
  vy2: number;
  omega2: number;
}

export function buildPatchyBindingInitialState(overrides: Partial<PatchyInitSpec> = {}): number[] {
  const defaults: PatchyInitSpec = {
    x1: -2.8,
    y1: 0.85,
    theta1: 0.15,
    x2: 2.5,
    y2: -0.70,
    theta2: Math.PI - 0.2,
    vx1: 1.9,
    vy1: -0.05,
    omega1: 0,
    vx2: -1.3,
    vy2: 0.14,
    omega2: 0
  };

  const s = { ...defaults, ...overrides };

  return [
    s.x1,
    s.y1,
    s.theta1,
    s.x2,
    s.y2,
    s.theta2,
    s.vx1,
    s.vy1,
    s.omega1,
    s.vx2,
    s.vy2,
    s.omega2
  ];
}

function unpackState(y: number[]): TwoBodyState {
  if (y.length !== 12) {
    throw new Error(`Patchy-binding state length mismatch: expected 12, got ${y.length}.`);
  }

  return {
    x1: y[0],
    y1: y[1],
    theta1: y[2],
    x2: y[3],
    y2: y[4],
    theta2: y[5],
    vx1: y[6],
    vy1: y[7],
    omega1: y[8],
    vx2: y[9],
    vy2: y[10],
    omega2: y[11]
  };
}

function gaussianDistanceEnvelope(r: number, bindRadius: number, bindWidth: number): number {
  const z = (r - bindRadius) / bindWidth;
  return Math.exp(-0.5 * z * z);
}

interface PairGeometry {
  rx: number;
  ry: number;
  r: number;
  rHatX: number;
  rHatY: number;
}

function pairGeometry(s: TwoBodyState): PairGeometry {
  const rx = s.x2 - s.x1;
  const ry = s.y2 - s.y1;
  const r = Math.hypot(rx, ry);
  const rSafe = Math.max(1e-9, r);

  return {
    rx,
    ry,
    r,
    rHatX: rx / rSafe,
    rHatY: ry / rSafe
  };
}

interface OrientationMetrics {
  align1: number;
  align2: number;
  gate: number;
  cross1: number;
  cross2: number;
}

function orientationMetrics(s: TwoBodyState, g: PairGeometry, cfg: PatchyParams): OrientationMetrics {
  const u1x = Math.cos(s.theta1);
  const u1y = Math.sin(s.theta1);
  const u2x = Math.cos(s.theta2);
  const u2y = Math.sin(s.theta2);

  // Protein 1 patch should face toward protein 2 (+rhat).
  const dot1 = u1x * g.rHatX + u1y * g.rHatY;
  // Protein 2 patch should face toward protein 1 (-rhat).
  const dot2 = u2x * -g.rHatX + u2y * -g.rHatY;

  const align1 = Math.max(0, dot1);
  const align2 = Math.max(0, dot2);

  const n = cfg.patchSharpness;
  const gate = Math.pow(align1, n) * Math.pow(align2, n);

  const cross1 = u1x * g.rHatY - u1y * g.rHatX;
  const cross2 = u2x * -g.rHatY - u2y * -g.rHatX;

  return {
    align1,
    align2,
    gate,
    cross1,
    cross2
  };
}

interface PatchyForces {
  fx1: number;
  fy1: number;
  fx2: number;
  fy2: number;
  torque1: number;
  torque2: number;
  radialForcePair: number;
  radialEnvelope: number;
  distance: number;
  contactScore: number;
  align1: number;
  align2: number;
}

function patchyForcesFromState(y: number[], p: Record<string, number>): PatchyForces {
  const s = unpackState(y);
  const cfg = patchyParams(p);
  const geom = pairGeometry(s);
  const orient = orientationMetrics(s, geom, cfg);

  const g = gaussianDistanceEnvelope(geom.r, cfg.bindRadius, cfg.bindWidth);

  const coreDistance = cfg.coreRadius1 + cfg.coreRadius2;
  const penetration = Math.max(0, coreDistance - geom.r);
  const repulsivePair = cfg.kRep * penetration;

  const attractivePair =
    -cfg.kAttr * orient.gate * ((geom.r - cfg.bindRadius) / (cfg.bindWidth * cfg.bindWidth)) * g;

  const radialForcePair = repulsivePair + attractivePair;

  // Pair force direction: +rhat on protein 2, -rhat on protein 1.
  const fxPairX = radialForcePair * geom.rHatX;
  const fxPairY = radialForcePair * geom.rHatY;

  const fx1 = -fxPairX - cfg.drag1 * s.vx1;
  const fy1 = -fxPairY - cfg.drag1 * s.vy1;
  const fx2 = +fxPairX - cfg.drag2 * s.vx2;
  const fy2 = +fxPairY - cfg.drag2 * s.vy2;

  const n = cfg.patchSharpness;
  const torque1 =
    -cfg.kTorque * g * Math.pow(Math.max(orient.align2, 1e-6), n) * orient.cross1 -
    cfg.rotDrag1 * s.omega1;
  const torque2 =
    -cfg.kTorque * g * Math.pow(Math.max(orient.align1, 1e-6), n) * orient.cross2 -
    cfg.rotDrag2 * s.omega2;

  return {
    fx1,
    fy1,
    fx2,
    fy2,
    torque1,
    torque2,
    radialForcePair,
    radialEnvelope: g,
    distance: geom.r,
    contactScore: orient.gate * g,
    align1: orient.align1,
    align2: orient.align2
  };
}

export interface PatchyBindingObservables {
  distance: number;
  relativeSpeed: number;
  contactScore: number;
  boundProxy: number;
  align1: number;
  align2: number;
  theta1Deg: number;
  theta2Deg: number;
  thetaRelDeg: number;
  comX: number;
  comY: number;
  relX: number;
  relY: number;
}

export function patchyBindingObservablesFromState(
  y: number[],
  p: Record<string, number>
): PatchyBindingObservables {
  const s = unpackState(y);
  const cfg = patchyParams(p);
  const forces = patchyForcesFromState(y, p);

  const relVx = s.vx2 - s.vx1;
  const relVy = s.vy2 - s.vy1;
  const boundProxy = clamp((forces.contactScore - 0.18) / 0.62, 0, 1);

  const mTot = cfg.m1 + cfg.m2;
  const comX = (cfg.m1 * s.x1 + cfg.m2 * s.x2) / mTot;
  const comY = (cfg.m1 * s.y1 + cfg.m2 * s.y2) / mTot;

  return {
    distance: forces.distance,
    relativeSpeed: Math.hypot(relVx, relVy),
    contactScore: forces.contactScore,
    boundProxy,
    align1: forces.align1,
    align2: forces.align2,
    theta1Deg: normalizeAngleDeg(s.theta1),
    theta2Deg: normalizeAngleDeg(s.theta2),
    thetaRelDeg: normalizeAngleDeg(s.theta1 - s.theta2),
    comX,
    comY,
    relX: s.x2 - s.x1,
    relY: s.y2 - s.y1
  };
}

function patchyPotentialEnergy(y: number[], p: Record<string, number>): number {
  const cfg = patchyParams(p);
  const s = unpackState(y);
  const geom = pairGeometry(s);
  const orient = orientationMetrics(s, geom, cfg);

  const g = gaussianDistanceEnvelope(geom.r, cfg.bindRadius, cfg.bindWidth);
  const coreDistance = cfg.coreRadius1 + cfg.coreRadius2;
  const penetration = Math.max(0, coreDistance - geom.r);

  const repulsive = 0.5 * cfg.kRep * penetration * penetration;
  const attractive = -cfg.kAttr * orient.gate * g;

  return repulsive + attractive;
}

function patchyEnergy(y: number[], p: Record<string, number>): number {
  const s = unpackState(y);
  const cfg = patchyParams(p);

  const kineticTrans = 0.5 * cfg.m1 * (s.vx1 * s.vx1 + s.vy1 * s.vy1) + 0.5 * cfg.m2 * (s.vx2 * s.vx2 + s.vy2 * s.vy2);
  const kineticRot = 0.5 * cfg.I1 * s.omega1 * s.omega1 + 0.5 * cfg.I2 * s.omega2 * s.omega2;

  return kineticTrans + kineticRot + patchyPotentialEnergy(y, p);
}

const defaultParams = {
  m1: 1,
  m2: 1.2,
  I1: 0.35,
  I2: 0.45,
  drag1: 1.0,
  drag2: 1.1,
  rotDrag1: 1.1,
  rotDrag2: 1.2,
  kRep: 36,
  kAttr: 12,
  bindRadius: 1.42,
  bindWidth: 0.24,
  kTorque: 11,
  patchSharpness: 3,
  coreRadius1: 0.70,
  coreRadius2: 0.76
};

export const patchyBindingSystem: OdeSystem = {
  id: "patchybinding",
  name: "Patchy Protein-Protein Binding (Full 2-Body)",
  mode: "ode",
  state: {
    names: [
      "x1",
      "y1",
      "theta1",
      "x2",
      "y2",
      "theta2",
      "vx1",
      "vy1",
      "omega1",
      "vx2",
      "vy2",
      "omega2"
    ],
    y0: buildPatchyBindingInitialState()
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 10
  },
  supportedIntegrators: ["rk4"],
  params: { ...defaultParams },
  rhs: (_t, y, p) => {
    const s = unpackState(y);
    const cfg = patchyParams(p);
    const f = patchyForcesFromState(y, p);

    const ax1 = f.fx1 / cfg.m1;
    const ay1 = f.fy1 / cfg.m1;
    const ax2 = f.fx2 / cfg.m2;
    const ay2 = f.fy2 / cfg.m2;
    const alpha1 = f.torque1 / cfg.I1;
    const alpha2 = f.torque2 / cfg.I2;

    return [
      s.vx1,
      s.vy1,
      s.omega1,
      s.vx2,
      s.vy2,
      s.omega2,
      ax1,
      ay1,
      alpha1,
      ax2,
      ay2,
      alpha2
    ];
  },
  energy: (y, p) => patchyEnergy(y, p),
  derived: (y, p) => {
    const obs = patchyBindingObservablesFromState(y, p);
    const f = patchyForcesFromState(y, p);

    return {
      distance: obs.distance,
      relativeSpeed: obs.relativeSpeed,
      contactScore: obs.contactScore,
      boundProxy: obs.boundProxy,
      align1: obs.align1,
      align2: obs.align2,
      theta1Deg: obs.theta1Deg,
      theta2Deg: obs.theta2Deg,
      thetaRelDeg: obs.thetaRelDeg,
      comX: obs.comX,
      comY: obs.comY,
      relX: obs.relX,
      relY: obs.relY,
      radialForcePair: f.radialForcePair,
      radialEnvelope: f.radialEnvelope
    };
  },
  presets: [
    {
      name: "Productive Encounter",
      y0: buildPatchyBindingInitialState()
    },
    {
      name: "Wrong Orientation",
      y0: buildPatchyBindingInitialState({
        theta1: Math.PI * 0.9,
        theta2: 0.2
      })
    },
    {
      name: "Near-Miss Flyby",
      y0: buildPatchyBindingInitialState({
        y1: 1.75,
        y2: -1.6,
        vx1: 2.2,
        vx2: -1.6
      })
    },
    {
      name: "Sticky Interface",
      y0: buildPatchyBindingInitialState({
        theta1: 0.1,
        theta2: Math.PI - 0.1,
        vx1: 1.7,
        vx2: -1.2
      }),
      params: {
        kAttr: 16,
        kTorque: 15,
        patchSharpness: 2,
        bindWidth: 0.29
      }
    },
    {
      name: "Weak Interface",
      y0: buildPatchyBindingInitialState({
        theta1: 0.2,
        theta2: Math.PI - 0.25
      }),
      params: {
        kAttr: 6,
        kTorque: 6,
        patchSharpness: 4,
        bindWidth: 0.2
      }
    }
  ],
  plotSpec: [
    {
      id: "trajectory",
      title: "Protein 1 Trajectory (x1, y1)",
      xLabel: "x1",
      yLabel: "y1",
      x: { kind: "state", index: 0 },
      y: { kind: "state", index: 1 }
    },
    {
      id: "trajectory2",
      title: "Protein 2 Trajectory (x2, y2)",
      xLabel: "x2",
      yLabel: "y2",
      x: { kind: "state", index: 3 },
      y: { kind: "state", index: 4 }
    },
    {
      id: "distance-time",
      title: "Inter-Protein Distance vs Time",
      xLabel: "t",
      yLabel: "r",
      x: { kind: "time" },
      y: { kind: "derived", key: "distance" }
    },
    {
      id: "contact-time",
      title: "Contact Score vs Time",
      xLabel: "t",
      yLabel: "contact",
      x: { kind: "time" },
      y: { kind: "derived", key: "contactScore" }
    },
    {
      id: "bound-time",
      title: "Bound Proxy vs Time",
      xLabel: "t",
      yLabel: "bound",
      x: { kind: "time" },
      y: { kind: "derived", key: "boundProxy" }
    },
    {
      id: "alignment-time",
      title: "Patch Alignment (Protein 1) vs Time",
      xLabel: "t",
      yLabel: "align_1",
      x: { kind: "time" },
      y: { kind: "derived", key: "align1" }
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
    type: "patchybinding"
  }
};

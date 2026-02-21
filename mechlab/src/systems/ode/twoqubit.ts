import type { OdeSystem } from "../types";

interface Complex {
  re: number;
  im: number;
}

interface TwoQubitConfig {
  hbar: number;
  omega1x: number;
  omega1y: number;
  omega1z: number;
  omega2x: number;
  omega2y: number;
  omega2z: number;
  jzz: number;
  theta1: number;
  phi1: number;
  theta2: number;
  phi2: number;
}

export type TwoQubitGate =
  | "h1"
  | "h2"
  | "x1"
  | "x2"
  | "y1"
  | "y2"
  | "z1"
  | "z2"
  | "s1"
  | "s2"
  | "cnot12"
  | "cz";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function wrapAngle(angle: number): number {
  if (!Number.isFinite(angle)) {
    return 0;
  }

  return ((angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
}

export function twoQubitFromParams(p: Record<string, number>): TwoQubitConfig {
  return {
    hbar: Math.max(1e-8, finiteOr(p.hbar, 1)),
    omega1x: finiteOr(p.omega1x, 0),
    omega1y: finiteOr(p.omega1y, 0),
    omega1z: finiteOr(p.omega1z, 0),
    omega2x: finiteOr(p.omega2x, 0),
    omega2y: finiteOr(p.omega2y, 0),
    omega2z: finiteOr(p.omega2z, 0),
    jzz: finiteOr(p.jzz, 1.6),
    theta1: clamp(finiteOr(p.theta1, 0), 0, Math.PI),
    phi1: wrapAngle(finiteOr(p.phi1, 0)),
    theta2: clamp(finiteOr(p.theta2, 0), 0, Math.PI),
    phi2: wrapAngle(finiteOr(p.phi2, 0))
  };
}

function splitState(y: number[]): { re: number[]; im: number[] } {
  if (y.length !== 8) {
    throw new Error(`Two-qubit state length mismatch: expected 8, got ${y.length}.`);
  }

  return {
    re: y.slice(0, 4),
    im: y.slice(4)
  };
}

function mergeState(re: number[], im: number[]): number[] {
  return [...re, ...im];
}

function complexMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  };
}

function complexConj(a: Complex): Complex {
  return { re: a.re, im: -a.im };
}

function complexAdd(a: Complex, b: Complex): Complex {
  return {
    re: a.re + b.re,
    im: a.im + b.im
  };
}

function ampAt(re: number[], im: number[], i: number): Complex {
  return {
    re: re[i] ?? 0,
    im: im[i] ?? 0
  };
}

function normOfState(re: number[], im: number[]): number {
  let norm = 0;
  for (let i = 0; i < 4; i += 1) {
    norm += (re[i] ?? 0) * (re[i] ?? 0) + (im[i] ?? 0) * (im[i] ?? 0);
  }
  return norm;
}

function normalizeState(re: number[], im: number[]): { re: number[]; im: number[] } {
  const norm = normOfState(re, im);
  const scale = norm > 1e-14 ? 1 / Math.sqrt(norm) : 1;

  return {
    re: re.map((value) => value * scale),
    im: im.map((value) => value * scale)
  };
}

function singleQubitFromAngles(theta: number, phi: number): { a: Complex; b: Complex } {
  const a = {
    re: Math.cos(0.5 * theta),
    im: 0
  };

  const bMag = Math.sin(0.5 * theta);
  const b = {
    re: bMag * Math.cos(phi),
    im: bMag * Math.sin(phi)
  };

  return { a, b };
}

export function buildTwoQubitInitialState(p: Record<string, number>): number[] {
  const cfg = twoQubitFromParams(p);

  const q1 = singleQubitFromAngles(cfg.theta1, cfg.phi1);
  const q2 = singleQubitFromAngles(cfg.theta2, cfg.phi2);

  const amp00 = complexMul(q1.a, q2.a);
  const amp01 = complexMul(q1.a, q2.b);
  const amp10 = complexMul(q1.b, q2.a);
  const amp11 = complexMul(q1.b, q2.b);

  const normalized = normalizeState(
    [amp00.re, amp01.re, amp10.re, amp11.re],
    [amp00.im, amp01.im, amp10.im, amp11.im]
  );

  return mergeState(normalized.re, normalized.im);
}

export function buildBellPhiPlusState(): number[] {
  const invSqrt2 = Math.SQRT1_2;
  return [invSqrt2, 0, 0, invSqrt2, 0, 0, 0, 0];
}

function applySingleQubitMatrix(
  re: number[],
  im: number[],
  qubit: 1 | 2,
  m00: Complex,
  m01: Complex,
  m10: Complex,
  m11: Complex
): void {
  const pairs: Array<[number, number]> =
    qubit === 1
      ? [
          [0, 2],
          [1, 3]
        ]
      : [
          [0, 1],
          [2, 3]
        ];

  for (const [i0, i1] of pairs) {
    const a = ampAt(re, im, i0);
    const b = ampAt(re, im, i1);

    const out0 = complexAdd(complexMul(m00, a), complexMul(m01, b));
    const out1 = complexAdd(complexMul(m10, a), complexMul(m11, b));

    re[i0] = out0.re;
    im[i0] = out0.im;
    re[i1] = out1.re;
    im[i1] = out1.im;
  }
}

export function applyTwoQubitGate(y: number[], gate: TwoQubitGate): number[] {
  const { re, im } = splitState(y);

  const i: Complex = { re: 0, im: 1 };
  const minusI: Complex = { re: 0, im: -1 };

  if (gate === "x1") {
    applySingleQubitMatrix(
      re,
      im,
      1,
      { re: 0, im: 0 },
      { re: 1, im: 0 },
      { re: 1, im: 0 },
      { re: 0, im: 0 }
    );
  } else if (gate === "x2") {
    applySingleQubitMatrix(
      re,
      im,
      2,
      { re: 0, im: 0 },
      { re: 1, im: 0 },
      { re: 1, im: 0 },
      { re: 0, im: 0 }
    );
  } else if (gate === "y1") {
    applySingleQubitMatrix(
      re,
      im,
      1,
      { re: 0, im: 0 },
      minusI,
      i,
      { re: 0, im: 0 }
    );
  } else if (gate === "y2") {
    applySingleQubitMatrix(
      re,
      im,
      2,
      { re: 0, im: 0 },
      minusI,
      i,
      { re: 0, im: 0 }
    );
  } else if (gate === "z1") {
    applySingleQubitMatrix(
      re,
      im,
      1,
      { re: 1, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: -1, im: 0 }
    );
  } else if (gate === "z2") {
    applySingleQubitMatrix(
      re,
      im,
      2,
      { re: 1, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: -1, im: 0 }
    );
  } else if (gate === "s1") {
    applySingleQubitMatrix(
      re,
      im,
      1,
      { re: 1, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      i
    );
  } else if (gate === "s2") {
    applySingleQubitMatrix(
      re,
      im,
      2,
      { re: 1, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      i
    );
  } else if (gate === "h1") {
    const h = Math.SQRT1_2;
    applySingleQubitMatrix(
      re,
      im,
      1,
      { re: h, im: 0 },
      { re: h, im: 0 },
      { re: h, im: 0 },
      { re: -h, im: 0 }
    );
  } else if (gate === "h2") {
    const h = Math.SQRT1_2;
    applySingleQubitMatrix(
      re,
      im,
      2,
      { re: h, im: 0 },
      { re: h, im: 0 },
      { re: h, im: 0 },
      { re: -h, im: 0 }
    );
  } else if (gate === "cnot12") {
    const aRe = re[2];
    const aIm = im[2];
    re[2] = re[3];
    im[2] = im[3];
    re[3] = aRe;
    im[3] = aIm;
  } else if (gate === "cz") {
    re[3] = -re[3];
    im[3] = -im[3];
  }

  const normalized = normalizeState(re, im);
  return mergeState(normalized.re, normalized.im);
}

function addScaledComplex(targetRe: number[], targetIm: number[], index: number, source: Complex, scale: number): void {
  targetRe[index] += scale * source.re;
  targetIm[index] += scale * source.im;
}

function applyHamiltonian(re: number[], im: number[], cfg: TwoQubitConfig): { re: number[]; im: number[] } {
  const hRe = [0, 0, 0, 0];
  const hIm = [0, 0, 0, 0];

  const sx1 = 0.5 * cfg.omega1x;
  const sy1 = 0.5 * cfg.omega1y;
  const sz1 = 0.5 * cfg.omega1z;
  const sx2 = 0.5 * cfg.omega2x;
  const sy2 = 0.5 * cfg.omega2y;
  const sz2 = 0.5 * cfg.omega2z;
  const zz = 0.25 * cfg.jzz;

  if (sx1 !== 0) {
    addScaledComplex(hRe, hIm, 0, ampAt(re, im, 2), sx1);
    addScaledComplex(hRe, hIm, 1, ampAt(re, im, 3), sx1);
    addScaledComplex(hRe, hIm, 2, ampAt(re, im, 0), sx1);
    addScaledComplex(hRe, hIm, 3, ampAt(re, im, 1), sx1);
  }

  if (sy1 !== 0) {
    const a2 = ampAt(re, im, 2);
    const a3 = ampAt(re, im, 3);
    const a0 = ampAt(re, im, 0);
    const a1 = ampAt(re, im, 1);

    addScaledComplex(hRe, hIm, 0, { re: a2.im, im: -a2.re }, sy1);
    addScaledComplex(hRe, hIm, 1, { re: a3.im, im: -a3.re }, sy1);
    addScaledComplex(hRe, hIm, 2, { re: -a0.im, im: a0.re }, sy1);
    addScaledComplex(hRe, hIm, 3, { re: -a1.im, im: a1.re }, sy1);
  }

  if (sz1 !== 0) {
    addScaledComplex(hRe, hIm, 0, ampAt(re, im, 0), sz1);
    addScaledComplex(hRe, hIm, 1, ampAt(re, im, 1), sz1);
    addScaledComplex(hRe, hIm, 2, ampAt(re, im, 2), -sz1);
    addScaledComplex(hRe, hIm, 3, ampAt(re, im, 3), -sz1);
  }

  if (sx2 !== 0) {
    addScaledComplex(hRe, hIm, 0, ampAt(re, im, 1), sx2);
    addScaledComplex(hRe, hIm, 1, ampAt(re, im, 0), sx2);
    addScaledComplex(hRe, hIm, 2, ampAt(re, im, 3), sx2);
    addScaledComplex(hRe, hIm, 3, ampAt(re, im, 2), sx2);
  }

  if (sy2 !== 0) {
    const a1 = ampAt(re, im, 1);
    const a0 = ampAt(re, im, 0);
    const a3 = ampAt(re, im, 3);
    const a2 = ampAt(re, im, 2);

    addScaledComplex(hRe, hIm, 0, { re: a1.im, im: -a1.re }, sy2);
    addScaledComplex(hRe, hIm, 1, { re: -a0.im, im: a0.re }, sy2);
    addScaledComplex(hRe, hIm, 2, { re: a3.im, im: -a3.re }, sy2);
    addScaledComplex(hRe, hIm, 3, { re: -a2.im, im: a2.re }, sy2);
  }

  if (sz2 !== 0) {
    addScaledComplex(hRe, hIm, 0, ampAt(re, im, 0), sz2);
    addScaledComplex(hRe, hIm, 1, ampAt(re, im, 1), -sz2);
    addScaledComplex(hRe, hIm, 2, ampAt(re, im, 2), sz2);
    addScaledComplex(hRe, hIm, 3, ampAt(re, im, 3), -sz2);
  }

  if (zz !== 0) {
    addScaledComplex(hRe, hIm, 0, ampAt(re, im, 0), zz);
    addScaledComplex(hRe, hIm, 1, ampAt(re, im, 1), -zz);
    addScaledComplex(hRe, hIm, 2, ampAt(re, im, 2), -zz);
    addScaledComplex(hRe, hIm, 3, ampAt(re, im, 3), zz);
  }

  return {
    re: hRe,
    im: hIm
  };
}

export interface TwoQubitObservables {
  norm: number;
  p00: number;
  p01: number;
  p10: number;
  p11: number;
  bloch1x: number;
  bloch1y: number;
  bloch1z: number;
  bloch2x: number;
  bloch2y: number;
  bloch2z: number;
  concurrence: number;
  entropy: number;
  czz: number;
}

export function twoQubitObservablesFromState(y: number[], _p: Record<string, number>): TwoQubitObservables {
  const { re, im } = splitState(y);

  const a00 = ampAt(re, im, 0);
  const a01 = ampAt(re, im, 1);
  const a10 = ampAt(re, im, 2);
  const a11 = ampAt(re, im, 3);

  const p00Raw = a00.re * a00.re + a00.im * a00.im;
  const p01Raw = a01.re * a01.re + a01.im * a01.im;
  const p10Raw = a10.re * a10.re + a10.im * a10.im;
  const p11Raw = a11.re * a11.re + a11.im * a11.im;

  const norm = p00Raw + p01Raw + p10Raw + p11Raw;
  const normSafe = norm > 1e-14 ? norm : 1;

  const p00 = p00Raw / normSafe;
  const p01 = p01Raw / normSafe;
  const p10 = p10Raw / normSafe;
  const p11 = p11Raw / normSafe;

  const rhoA01 = complexAdd(complexMul(a00, complexConj(a10)), complexMul(a01, complexConj(a11)));
  const rhoB01 = complexAdd(complexMul(a00, complexConj(a01)), complexMul(a10, complexConj(a11)));

  const bloch1x = (2 * rhoA01.re) / normSafe;
  const bloch1y = (-2 * rhoA01.im) / normSafe;
  const bloch1z = p00 + p01 - p10 - p11;

  const bloch2x = (2 * rhoB01.re) / normSafe;
  const bloch2y = (-2 * rhoB01.im) / normSafe;
  const bloch2z = p00 - p01 + p10 - p11;

  const det = complexAdd(complexMul(a00, a11), {
    re: -complexMul(a01, a10).re,
    im: -complexMul(a01, a10).im
  });
  const concurrence = Math.max(0, Math.min(1, (2 * Math.hypot(det.re, det.im)) / normSafe));

  const r1 = Math.min(1, Math.max(0, Math.hypot(bloch1x, bloch1y, bloch1z)));
  const lambdaPlus = clamp(0.5 * (1 + r1), 0, 1);
  const lambdaMinus = clamp(0.5 * (1 - r1), 0, 1);

  const entropyTerm = (x: number): number => (x > 1e-12 ? -x * Math.log2(x) : 0);
  const entropy = entropyTerm(lambdaPlus) + entropyTerm(lambdaMinus);

  const czz = p00 - p01 - p10 + p11;

  return {
    norm,
    p00,
    p01,
    p10,
    p11,
    bloch1x,
    bloch1y,
    bloch1z,
    bloch2x,
    bloch2y,
    bloch2z,
    concurrence,
    entropy,
    czz
  };
}

export function twoQubitEnergyFromState(y: number[], p: Record<string, number>): number {
  const cfg = twoQubitFromParams(p);
  const { re, im } = splitState(y);
  const hPsi = applyHamiltonian(re, im, cfg);

  let dotRe = 0;
  let dotIm = 0;
  let norm = 0;

  for (let i = 0; i < 4; i += 1) {
    const ar = re[i];
    const ai = im[i];
    const hr = hPsi.re[i];
    const hi = hPsi.im[i];

    dotRe += ar * hr + ai * hi;
    dotIm += ar * hi - ai * hr;
    norm += ar * ar + ai * ai;
  }

  if (norm <= 1e-14) {
    return 0;
  }

  return dotRe / norm;
}

const defaultParams = {
  hbar: 1,
  omega1x: 0,
  omega1y: 0,
  omega1z: 0,
  omega2x: 0,
  omega2y: 0,
  omega2z: 0,
  jzz: 1.6,
  theta1: 0,
  phi1: 0,
  theta2: 0,
  phi2: 0
};

export const twoQubitSystem: OdeSystem = {
  id: "twoqubit",
  name: "Two-Qubit Entanglement Playground",
  mode: "ode",
  state: {
    names: [],
    y0: buildTwoQubitInitialState(defaultParams)
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 16
  },
  supportedIntegrators: ["rk4"],
  params: { ...defaultParams },
  rhs: (_t, y, p) => {
    const cfg = twoQubitFromParams(p);
    const { re, im } = splitState(y);
    const hPsi = applyHamiltonian(re, im, cfg);

    const dRe = new Array<number>(4);
    const dIm = new Array<number>(4);

    for (let i = 0; i < 4; i += 1) {
      dRe[i] = hPsi.im[i] / cfg.hbar;
      dIm[i] = -hPsi.re[i] / cfg.hbar;
    }

    return [...dRe, ...dIm];
  },
  energy: (y, p) => twoQubitEnergyFromState(y, p),
  derived: (y, p) => {
    const obs = twoQubitObservablesFromState(y, p);

    return {
      norm: obs.norm,
      p00: obs.p00,
      p01: obs.p01,
      p10: obs.p10,
      p11: obs.p11,
      bloch1x: obs.bloch1x,
      bloch1y: obs.bloch1y,
      bloch1z: obs.bloch1z,
      bloch2x: obs.bloch2x,
      bloch2y: obs.bloch2y,
      bloch2z: obs.bloch2z,
      concurrence: obs.concurrence,
      entropy: obs.entropy,
      czz: obs.czz
    };
  },
  presets: [
    {
      name: "Separable |00>",
      y0: buildTwoQubitInitialState({
        ...defaultParams,
        theta1: 0,
        phi1: 0,
        theta2: 0,
        phi2: 0,
        jzz: 0
      }),
      params: {
        theta1: 0,
        phi1: 0,
        theta2: 0,
        phi2: 0,
        jzz: 0,
        omega1x: 0,
        omega1y: 0,
        omega1z: 0,
        omega2x: 0,
        omega2y: 0,
        omega2z: 0
      }
    },
    {
      name: "ZZ Entangling from |++>",
      y0: buildTwoQubitInitialState({
        ...defaultParams,
        theta1: Math.PI / 2,
        phi1: 0,
        theta2: Math.PI / 2,
        phi2: 0,
        jzz: 1.6,
        omega1x: 0,
        omega1y: 0,
        omega1z: 0,
        omega2x: 0,
        omega2y: 0,
        omega2z: 0
      }),
      params: {
        theta1: Math.PI / 2,
        phi1: 0,
        theta2: Math.PI / 2,
        phi2: 0,
        jzz: 1.6,
        omega1x: 0,
        omega1y: 0,
        omega1z: 0,
        omega2x: 0,
        omega2y: 0,
        omega2z: 0
      }
    },
    {
      name: "Driven + Coupled",
      y0: buildTwoQubitInitialState({
        ...defaultParams,
        theta1: 0.4,
        phi1: 0,
        theta2: 1.1,
        phi2: 0.2,
        omega1x: 1.2,
        omega2y: 1,
        omega1z: 0.3,
        omega2z: -0.2,
        jzz: 0.9
      }),
      params: {
        theta1: 0.4,
        phi1: 0,
        theta2: 1.1,
        phi2: 0.2,
        omega1x: 1.2,
        omega2y: 1,
        omega1z: 0.3,
        omega2z: -0.2,
        jzz: 0.9
      }
    }
  ],
  plotSpec: [
    {
      id: "concurrence-time",
      title: "Concurrence vs Time",
      xLabel: "t",
      yLabel: "C",
      x: { kind: "time" },
      y: { kind: "derived", key: "concurrence" }
    },
    {
      id: "entropy-time",
      title: "Entanglement Entropy vs Time",
      xLabel: "t",
      yLabel: "S_A",
      x: { kind: "time" },
      y: { kind: "derived", key: "entropy" }
    },
    {
      id: "pop11-time",
      title: "Population P(|11>) vs Time",
      xLabel: "t",
      yLabel: "P11",
      x: { kind: "time" },
      y: { kind: "derived", key: "p11" }
    },
    {
      id: "bloch1z-time",
      title: "Qubit 1 Bloch z",
      xLabel: "t",
      yLabel: "s1_z",
      x: { kind: "time" },
      y: { kind: "derived", key: "bloch1z" }
    },
    {
      id: "bloch2z-time",
      title: "Qubit 2 Bloch z",
      xLabel: "t",
      yLabel: "s2_z",
      x: { kind: "time" },
      y: { kind: "derived", key: "bloch2z" }
    },
    {
      id: "corrzz-time",
      title: "Correlation <Z x Z>",
      xLabel: "t",
      yLabel: "Czz",
      x: { kind: "time" },
      y: { kind: "derived", key: "czz" }
    },
    {
      id: "norm-time",
      title: "Norm ||psi||^2",
      xLabel: "t",
      yLabel: "norm",
      x: { kind: "time" },
      y: { kind: "derived", key: "norm" }
    }
  ],
  vizSpec: {
    type: "twoqubit"
  }
};

export type DerivativeFunction = (
  t: number,
  y: number[],
  params: Record<string, number>
) => number[];

export interface IntegrationOptions {
  t0: number;
  y0: number[];
  dt: number;
  steps: number;
  params: Record<string, number>;
}

export interface IntegrationResult {
  t: number[];
  y: number[][];
}

function addScaled(base: number[], delta: number[], scale: number): number[] {
  return base.map((value, index) => value + delta[index] * scale);
}

export function rk4Step(
  rhs: DerivativeFunction,
  t: number,
  y: number[],
  dt: number,
  params: Record<string, number>
): number[] {
  const k1 = rhs(t, y, params);
  const k2 = rhs(t + dt / 2, addScaled(y, k1, dt / 2), params);
  const k3 = rhs(t + dt / 2, addScaled(y, k2, dt / 2), params);
  const k4 = rhs(t + dt, addScaled(y, k3, dt), params);

  return y.map(
    (value, index) => value + (dt / 6) * (k1[index] + 2 * k2[index] + 2 * k3[index] + k4[index])
  );
}

export function integrateRk4(
  rhs: DerivativeFunction,
  options: IntegrationOptions
): IntegrationResult {
  const { t0, y0, dt, steps, params } = options;

  const t = new Array<number>(steps + 1);
  const y = new Array<number[]>(steps + 1);

  t[0] = t0;
  y[0] = [...y0];

  for (let i = 0; i < steps; i += 1) {
    const nextT = t[i] + dt;
    const nextY = rk4Step(rhs, t[i], y[i], dt, params);

    t[i + 1] = nextT;
    y[i + 1] = nextY;
  }

  return { t, y };
}

function extractAcceleration(
  rhs: DerivativeFunction,
  t: number,
  state: number[],
  params: Record<string, number>,
  positionCount: number
): number[] {
  const derivative = rhs(t, state, params);
  if (derivative.length !== state.length) {
    throw new Error("RHS derivative length does not match state length.");
  }
  return derivative.slice(positionCount);
}

export function verletStep(
  rhs: DerivativeFunction,
  t: number,
  y: number[],
  dt: number,
  params: Record<string, number>
): number[] {
  if (y.length % 2 !== 0) {
    throw new Error("Velocity Verlet requires even-length state vector y=[q..., v...].");
  }

  const n = y.length / 2;
  const q = y.slice(0, n);
  const v = y.slice(n);

  const aNow = extractAcceleration(rhs, t, y, params, n);
  const vHalf = v.map((value, index) => value + 0.5 * dt * aNow[index]);
  const qNext = q.map((value, index) => value + dt * vHalf[index]);

  const stateMid = [...qNext, ...vHalf];
  const aNext = extractAcceleration(rhs, t + dt, stateMid, params, n);
  const vNext = vHalf.map((value, index) => value + 0.5 * dt * aNext[index]);

  return [...qNext, ...vNext];
}

export function integrateVelocityVerlet(
  rhs: DerivativeFunction,
  options: IntegrationOptions
): IntegrationResult {
  const { t0, y0, dt, steps, params } = options;

  if (y0.length % 2 !== 0) {
    throw new Error("Velocity Verlet requires even-length state vector y=[q..., v...].");
  }

  const t = new Array<number>(steps + 1);
  const y = new Array<number[]>(steps + 1);

  t[0] = t0;
  y[0] = [...y0];

  for (let i = 0; i < steps; i += 1) {
    const nextT = t[i] + dt;
    const nextY = verletStep(rhs, t[i], y[i], dt, params);

    t[i + 1] = nextT;
    y[i + 1] = nextY;
  }

  return { t, y };
}

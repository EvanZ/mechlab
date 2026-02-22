import type { OdeSystem } from "../types";

interface NsConfig {
  nx: number;
  ny: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  dx: number;
  dy: number;
  nu: number;
  inflowU: number;
  obstacleX: number;
  obstacleY: number;
  obstacleR: number;
  obstacleSoft: number;
  iterations: number;
}

interface NsFields {
  u: Float64Array;
  v: Float64Array;
  p: Float64Array;
}

export interface NsSimulationOptions {
  t0: number;
  y0: number[];
  dt: number;
  steps: number;
  params: Record<string, number>;
}

export interface NsSimulationResult {
  t: number[];
  y: number[][];
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  return Math.round(clamp(finiteOr(value, fallback), min, max));
}

function parseConfig(
  params: Record<string, number>,
  stateLength?: number
): NsConfig {
  const xMin = finiteOr(params.xMin, -2);
  const xMaxRaw = finiteOr(params.xMax, 8);
  const xMax = xMaxRaw > xMin + 1e-6 ? xMaxRaw : xMin + 1;

  const yMin = finiteOr(params.yMin, -2.5);
  const yMaxRaw = finiteOr(params.yMax, 2.5);
  const yMax = yMaxRaw > yMin + 1e-6 ? yMaxRaw : yMin + 1;

  let nx = clampInt(params.gridX, 24, 88, 52);
  let ny = clampInt(params.gridY, 16, 64, 34);

  if (Number.isFinite(stateLength) && stateLength && stateLength > 8) {
    const total = Math.round((stateLength - 4) / 3);
    if (total > 0) {
      const guess = Math.max(1, Math.round(Math.sqrt(total * ((xMax - xMin) / Math.max(1e-6, yMax - yMin)))));
      let foundNx = 0;

      for (let delta = 0; delta <= total; delta += 1) {
        const lower = guess - delta;
        if (lower >= 1 && total % lower === 0) {
          foundNx = lower;
          break;
        }

        const upper = guess + delta;
        if (upper >= 1 && total % upper === 0) {
          foundNx = upper;
          break;
        }
      }

      if (foundNx > 0) {
        nx = foundNx;
        ny = Math.max(1, total / foundNx);
      }
    }
  }

  const dx = (xMax - xMin) / Math.max(1, nx - 1);
  const dy = (yMax - yMin) / Math.max(1, ny - 1);

  return {
    nx,
    ny,
    xMin,
    xMax,
    yMin,
    yMax,
    dx,
    dy,
    nu: Math.max(1e-5, finiteOr(params.nu, 0.03)),
    inflowU: finiteOr(params.inflowU, 1),
    obstacleX: finiteOr(params.obstacleX, 1.8),
    obstacleY: finiteOr(params.obstacleY, 0),
    obstacleR: Math.max(0.1, finiteOr(params.obstacleR, 0.55)),
    obstacleSoft: Math.max(0, finiteOr(params.obstacleSoft, 0.025)),
    iterations: clampInt(params.pressureIters, 15, 120, 48)
  };
}

function idx(i: number, j: number, cfg: NsConfig): number {
  return j * cfg.nx + i;
}

function xAt(i: number, cfg: NsConfig): number {
  return cfg.xMin + i * cfg.dx;
}

function yAt(j: number, cfg: NsConfig): number {
  return cfg.yMin + j * cfg.dy;
}

function obstacleMask(cfg: NsConfig): Uint8Array {
  const mask = new Uint8Array(cfg.nx * cfg.ny);
  const rEff = Math.max(0.05, cfg.obstacleR + cfg.obstacleSoft);
  const r2 = rEff * rEff;

  for (let j = 0; j < cfg.ny; j += 1) {
    const y = yAt(j, cfg);
    for (let i = 0; i < cfg.nx; i += 1) {
      const x = xAt(i, cfg);
      const dx = x - cfg.obstacleX;
      const dy = y - cfg.obstacleY;
      if (dx * dx + dy * dy <= r2) {
        mask[idx(i, j, cfg)] = 1;
      }
    }
  }

  return mask;
}

function parseState(y: number[], cfg: NsConfig): NsFields {
  const cells = cfg.nx * cfg.ny;
  const expected = 4 + 3 * cells;

  if (y.length === expected) {
    const offset = 4;
    return {
      u: Float64Array.from(y.slice(offset, offset + cells)),
      v: Float64Array.from(y.slice(offset + cells, offset + 2 * cells)),
      p: Float64Array.from(y.slice(offset + 2 * cells, offset + 3 * cells))
    };
  }

  const u = new Float64Array(cells);
  const v = new Float64Array(cells);
  const p = new Float64Array(cells);

  for (let j = 0; j < cfg.ny; j += 1) {
    const rowWeight = 1 - Math.pow((2 * j) / Math.max(1, cfg.ny - 1) - 1, 8);
    for (let i = 0; i < cfg.nx; i += 1) {
      const k = idx(i, j, cfg);
      u[k] = cfg.inflowU * rowWeight;
      v[k] = 0;
      p[k] = 0;
    }
  }

  return { u, v, p };
}

function packState(cfg: NsConfig, fields: NsFields, mask: Uint8Array): number[] {
  const cells = cfg.nx * cfg.ny;
  const packed = new Array<number>(4 + 3 * cells);

  packed[0] = cfg.nx;
  packed[1] = cfg.ny;
  packed[2] = cfg.obstacleX;
  packed[3] = cfg.obstacleY;

  let offset = 4;
  for (let k = 0; k < cells; k += 1) {
    packed[offset + k] = mask[k] ? 0 : fields.u[k];
  }
  offset += cells;
  for (let k = 0; k < cells; k += 1) {
    packed[offset + k] = mask[k] ? 0 : fields.v[k];
  }
  offset += cells;
  for (let k = 0; k < cells; k += 1) {
    packed[offset + k] = fields.p[k];
  }

  return packed;
}

function bilerp(
  field: Float64Array,
  x: number,
  y: number,
  cfg: NsConfig
): number {
  const gx = (x - cfg.xMin) / cfg.dx;
  const gy = (y - cfg.yMin) / cfg.dy;

  const i0 = clamp(Math.floor(gx), 0, cfg.nx - 1);
  const j0 = clamp(Math.floor(gy), 0, cfg.ny - 1);
  const i1 = clamp(i0 + 1, 0, cfg.nx - 1);
  const j1 = clamp(j0 + 1, 0, cfg.ny - 1);

  const tx = clamp(gx - i0, 0, 1);
  const ty = clamp(gy - j0, 0, 1);

  const f00 = field[idx(i0, j0, cfg)];
  const f10 = field[idx(i1, j0, cfg)];
  const f01 = field[idx(i0, j1, cfg)];
  const f11 = field[idx(i1, j1, cfg)];

  const a = f00 * (1 - tx) + f10 * tx;
  const b = f01 * (1 - tx) + f11 * tx;

  return a * (1 - ty) + b * ty;
}

function applyBoundaryAndObstacle(
  u: Float64Array,
  v: Float64Array,
  cfg: NsConfig,
  mask: Uint8Array
): void {
  // Inflow on left boundary, weakly parabolic profile.
  for (let j = 0; j < cfg.ny; j += 1) {
    const yNorm = (2 * j) / Math.max(1, cfg.ny - 1) - 1;
    const profile = Math.max(0, 1 - yNorm * yNorm);
    const k = idx(0, j, cfg);
    if (!mask[k]) {
      u[k] = cfg.inflowU * profile;
      v[k] = 0;
    }
  }

  // Outflow on right: zero-gradient approximation.
  for (let j = 0; j < cfg.ny; j += 1) {
    const kR = idx(cfg.nx - 1, j, cfg);
    const kL = idx(cfg.nx - 2, j, cfg);
    if (!mask[kR]) {
      u[kR] = u[kL];
      v[kR] = v[kL];
    }
  }

  // No-slip top/bottom boundaries.
  for (let i = 0; i < cfg.nx; i += 1) {
    const kTop = idx(i, 0, cfg);
    const kBottom = idx(i, cfg.ny - 1, cfg);
    if (!mask[kTop]) {
      u[kTop] = 0;
      v[kTop] = 0;
    }
    if (!mask[kBottom]) {
      u[kBottom] = 0;
      v[kBottom] = 0;
    }
  }

  // Obstacle no-slip.
  for (let k = 0; k < mask.length; k += 1) {
    if (mask[k]) {
      u[k] = 0;
      v[k] = 0;
    }
  }
}

function advectVelocity(
  u0: Float64Array,
  v0: Float64Array,
  uOut: Float64Array,
  vOut: Float64Array,
  cfg: NsConfig,
  dt: number
): void {
  for (let j = 0; j < cfg.ny; j += 1) {
    const y = yAt(j, cfg);
    for (let i = 0; i < cfg.nx; i += 1) {
      const x = xAt(i, cfg);
      const k = idx(i, j, cfg);

      const xPrev = clamp(x - dt * u0[k], cfg.xMin, cfg.xMax);
      const yPrev = clamp(y - dt * v0[k], cfg.yMin, cfg.yMax);

      uOut[k] = bilerp(u0, xPrev, yPrev, cfg);
      vOut[k] = bilerp(v0, xPrev, yPrev, cfg);
    }
  }
}

function diffuseVelocity(
  u: Float64Array,
  v: Float64Array,
  cfg: NsConfig,
  dt: number,
  mask: Uint8Array
): void {
  const invDx2 = 1 / (cfg.dx * cfg.dx);
  const invDy2 = 1 / (cfg.dy * cfg.dy);
  const alpha = cfg.nu * dt;

  const uPrev = new Float64Array(u);
  const vPrev = new Float64Array(v);

  for (let j = 1; j < cfg.ny - 1; j += 1) {
    for (let i = 1; i < cfg.nx - 1; i += 1) {
      const k = idx(i, j, cfg);
      if (mask[k]) {
        u[k] = 0;
        v[k] = 0;
        continue;
      }

      const lapU =
        (uPrev[idx(i + 1, j, cfg)] - 2 * uPrev[k] + uPrev[idx(i - 1, j, cfg)]) * invDx2 +
        (uPrev[idx(i, j + 1, cfg)] - 2 * uPrev[k] + uPrev[idx(i, j - 1, cfg)]) * invDy2;
      const lapV =
        (vPrev[idx(i + 1, j, cfg)] - 2 * vPrev[k] + vPrev[idx(i - 1, j, cfg)]) * invDx2 +
        (vPrev[idx(i, j + 1, cfg)] - 2 * vPrev[k] + vPrev[idx(i, j - 1, cfg)]) * invDy2;

      u[k] = uPrev[k] + alpha * lapU;
      v[k] = vPrev[k] + alpha * lapV;
    }
  }
}

function projectIncompressible(
  u: Float64Array,
  v: Float64Array,
  p: Float64Array,
  cfg: NsConfig,
  dt: number,
  mask: Uint8Array
): void {
  const cells = cfg.nx * cfg.ny;
  const div = new Float64Array(cells);
  const rhs = new Float64Array(cells);
  const pNew = new Float64Array(p);

  const invDx = 1 / cfg.dx;
  const invDy = 1 / cfg.dy;

  for (let j = 1; j < cfg.ny - 1; j += 1) {
    for (let i = 1; i < cfg.nx - 1; i += 1) {
      const k = idx(i, j, cfg);
      if (mask[k]) {
        div[k] = 0;
        rhs[k] = 0;
        continue;
      }

      const duDx = (u[idx(i + 1, j, cfg)] - u[idx(i - 1, j, cfg)]) * 0.5 * invDx;
      const dvDy = (v[idx(i, j + 1, cfg)] - v[idx(i, j - 1, cfg)]) * 0.5 * invDy;
      div[k] = duDx + dvDy;
      rhs[k] = div[k] / Math.max(dt, 1e-6);
    }
  }

  const dx2 = cfg.dx * cfg.dx;
  const dy2 = cfg.dy * cfg.dy;
  const denom = 2 * (dx2 + dy2);

  for (let iter = 0; iter < cfg.iterations; iter += 1) {
    for (let j = 1; j < cfg.ny - 1; j += 1) {
      for (let i = 1; i < cfg.nx - 1; i += 1) {
        const k = idx(i, j, cfg);
        if (mask[k]) {
          pNew[k] = 0;
          continue;
        }

        const east = p[idx(i + 1, j, cfg)];
        const west = p[idx(i - 1, j, cfg)];
        const north = p[idx(i, j + 1, cfg)];
        const south = p[idx(i, j - 1, cfg)];

        pNew[k] = ((east + west) * dy2 + (north + south) * dx2 - rhs[k] * dx2 * dy2) / denom;
      }
    }

    // Copy + simple Neumann-like boundaries.
    for (let j = 0; j < cfg.ny; j += 1) {
      pNew[idx(0, j, cfg)] = pNew[idx(1, j, cfg)];
      pNew[idx(cfg.nx - 1, j, cfg)] = pNew[idx(cfg.nx - 2, j, cfg)];
    }
    for (let i = 0; i < cfg.nx; i += 1) {
      pNew[idx(i, 0, cfg)] = pNew[idx(i, 1, cfg)];
      pNew[idx(i, cfg.ny - 1, cfg)] = pNew[idx(i, cfg.ny - 2, cfg)];
    }

    for (let k = 0; k < cells; k += 1) {
      p[k] = pNew[k];
    }
  }

  for (let j = 1; j < cfg.ny - 1; j += 1) {
    for (let i = 1; i < cfg.nx - 1; i += 1) {
      const k = idx(i, j, cfg);
      if (mask[k]) {
        u[k] = 0;
        v[k] = 0;
        continue;
      }

      const dpDx = (p[idx(i + 1, j, cfg)] - p[idx(i - 1, j, cfg)]) * 0.5 * invDx;
      const dpDy = (p[idx(i, j + 1, cfg)] - p[idx(i, j - 1, cfg)]) * 0.5 * invDy;

      u[k] -= dt * dpDx;
      v[k] -= dt * dpDy;
    }
  }
}

function computeDerivedFromFields(
  fields: NsFields,
  cfg: NsConfig,
  mask: Uint8Array
): Record<string, number> {
  let speedMean = 0;
  let speedMax = 0;
  let vortAbsMean = 0;
  let vortMax = 0;
  let activeCells = 0;

  for (let j = 1; j < cfg.ny - 1; j += 1) {
    for (let i = 1; i < cfg.nx - 1; i += 1) {
      const k = idx(i, j, cfg);
      if (mask[k]) {
        continue;
      }

      const u = fields.u[k];
      const v = fields.v[k];
      const speed = Math.hypot(u, v);
      speedMean += speed;
      speedMax = Math.max(speedMax, speed);

      const dvDx = (fields.v[idx(i + 1, j, cfg)] - fields.v[idx(i - 1, j, cfg)]) / (2 * cfg.dx);
      const duDy = (fields.u[idx(i, j + 1, cfg)] - fields.u[idx(i, j - 1, cfg)]) / (2 * cfg.dy);
      const vort = dvDx - duDy;
      const absVort = Math.abs(vort);
      vortAbsMean += absVort;
      vortMax = Math.max(vortMax, absVort);

      activeCells += 1;
    }
  }

  const denom = Math.max(1, activeCells);
  const re = (Math.abs(cfg.inflowU) * 2 * cfg.obstacleR) / Math.max(cfg.nu, 1e-6);

  return {
    speedMean: speedMean / denom,
    speedMax,
    vortAbsMean: vortAbsMean / denom,
    vortMax,
    reynolds: re
  };
}

function singleStep(fields: NsFields, cfg: NsConfig, dt: number, mask: Uint8Array): void {
  const uAdv = new Float64Array(fields.u.length);
  const vAdv = new Float64Array(fields.v.length);

  applyBoundaryAndObstacle(fields.u, fields.v, cfg, mask);
  advectVelocity(fields.u, fields.v, uAdv, vAdv, cfg, dt);

  fields.u.set(uAdv);
  fields.v.set(vAdv);

  diffuseVelocity(fields.u, fields.v, cfg, dt, mask);
  applyBoundaryAndObstacle(fields.u, fields.v, cfg, mask);
  projectIncompressible(fields.u, fields.v, fields.p, cfg, dt, mask);
  applyBoundaryAndObstacle(fields.u, fields.v, cfg, mask);
}

export function buildNavierStokesInitialState(params: Record<string, number>): number[] {
  const cfg = parseConfig(params);
  const mask = obstacleMask(cfg);
  const fields = parseState([], cfg);
  applyBoundaryAndObstacle(fields.u, fields.v, cfg, mask);
  return packState(cfg, fields, mask);
}

export function simulateNavierStokes2d(options: NsSimulationOptions): NsSimulationResult {
  const cfg = parseConfig(options.params, options.y0.length);
  const mask = obstacleMask(cfg);
  const fields = parseState(options.y0, cfg);

  const dt = Math.max(1e-4, options.dt);
  const steps = Math.max(1, options.steps);

  const t = new Array<number>(steps + 1);
  const y = new Array<number[]>(steps + 1);

  t[0] = options.t0;
  y[0] = packState(cfg, fields, mask);

  for (let step = 0; step < steps; step += 1) {
    singleStep(fields, cfg, dt, mask);
    t[step + 1] = options.t0 + (step + 1) * dt;
    y[step + 1] = packState(cfg, fields, mask);
  }

  return { t, y };
}

function unpackForDerived(y: number[], p: Record<string, number>): {
  cfg: NsConfig;
  fields: NsFields;
  mask: Uint8Array;
} | null {
  if (!y.length) {
    return null;
  }

  const cfg = parseConfig(p, y.length);
  const fields = parseState(y, cfg);
  const mask = obstacleMask(cfg);
  return { cfg, fields, mask };
}

const defaultParams = {
  gridX: 52,
  gridY: 34,
  xMin: -2,
  xMax: 8,
  yMin: -2.5,
  yMax: 2.5,
  nu: 0.03,
  inflowU: 1.05,
  obstacleX: 1.8,
  obstacleY: 0,
  obstacleR: 0.55,
  obstacleSoft: 0.025,
  pressureIters: 48
};

const defaultState = buildNavierStokesInitialState(defaultParams);

export const navierStokes2dSystem: OdeSystem = {
  id: "navierstokes2d",
  name: "2D Navier-Stokes Obstacle Flow",
  mode: "ode",
  state: {
    names: [],
    y0: defaultState
  },
  simulationDefaults: {
    dt: 0.025,
    duration: 8
  },
  supportedIntegrators: ["rk4"],
  params: { ...defaultParams },
  rhs: (_t, y) => new Array<number>(y.length).fill(0),
  derived: (y, p) => {
    const unpacked = unpackForDerived(y, p);
    if (!unpacked) {
      return {
        speedMean: 0,
        speedMax: 0,
        vortAbsMean: 0,
        vortMax: 0,
        reynolds: 0
      };
    }

    return computeDerivedFromFields(unpacked.fields, unpacked.cfg, unpacked.mask);
  },
  presets: [
    {
      name: "Laminar Wake",
      y0: buildNavierStokesInitialState(defaultParams)
    },
    {
      name: "Higher Reynolds",
      y0: buildNavierStokesInitialState({
        ...defaultParams,
        nu: 0.015,
        inflowU: 1.25
      }),
      params: {
        nu: 0.015,
        inflowU: 1.25
      }
    },
    {
      name: "Lower Reynolds",
      y0: buildNavierStokesInitialState({
        ...defaultParams,
        nu: 0.06,
        inflowU: 0.9
      }),
      params: {
        nu: 0.06,
        inflowU: 0.9
      }
    },
    {
      name: "Bigger Obstacle",
      y0: buildNavierStokesInitialState({
        ...defaultParams,
        obstacleR: 0.8
      }),
      params: {
        obstacleR: 0.8
      }
    }
  ],
  plotSpec: [
    {
      id: "speed-mean-time",
      title: "Mean Speed vs Time",
      xLabel: "t",
      yLabel: "<|u|>",
      x: { kind: "time" },
      y: { kind: "derived", key: "speedMean" }
    },
    {
      id: "speed-max-time",
      title: "Max Speed vs Time",
      xLabel: "t",
      yLabel: "max |u|",
      x: { kind: "time" },
      y: { kind: "derived", key: "speedMax" }
    },
    {
      id: "vort-mean-time",
      title: "Mean |Vorticity| vs Time",
      xLabel: "t",
      yLabel: "<|omega|>",
      x: { kind: "time" },
      y: { kind: "derived", key: "vortAbsMean" }
    },
    {
      id: "reynolds-time",
      title: "Reynolds Number Proxy",
      xLabel: "t",
      yLabel: "Re",
      x: { kind: "time" },
      y: { kind: "derived", key: "reynolds" }
    }
  ],
  vizSpec: {
    type: "navierstokes2d"
  }
};

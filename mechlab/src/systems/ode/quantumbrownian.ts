import type { OdeSystem } from "../types";

interface QuantumBrownianCoefficients {
  m: number;
  omega: number;
  gamma: number;
  kT: number;
  hbar: number;
  dpp: number;
  dxx: number;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function positiveOr(value: number, fallback: number, floor = 1e-6): number {
  return Math.max(floor, finiteOr(value, fallback));
}

function coefficientsFromParams(p: Record<string, number>): QuantumBrownianCoefficients {
  const m = positiveOr(p.m, 1);
  const omega = positiveOr(p.omega, 1);
  const gamma = Math.max(0, finiteOr(p.gamma, 0.18));
  const kT = positiveOr(p.kT, 0.6, 1e-4);
  const hbar = positiveOr(p.hbar, 1);

  // High-temperature diffusion model for an open harmonic oscillator:
  // Dpp sets momentum kicks from the bath, Dxx is a small CP-preserving correction.
  const dpp = gamma * m * kT;
  const dxx = (gamma * hbar * hbar) / (16 * m * kT);

  return { m, omega, gamma, kT, hbar, dpp, dxx };
}

function groundStateCovariances(p: Record<string, number>): { vxx: number; vpp: number } {
  const { m, omega, hbar } = coefficientsFromParams(p);
  return {
    vxx: hbar / (2 * m * omega),
    vpp: (hbar * m * omega) / 2
  };
}

function buildGroundStateY0(p: Record<string, number>, xMean = 0.8, pMean = 0): number[] {
  const cov = groundStateCovariances(p);
  return [xMean, pMean, cov.vxx, cov.vpp, 0];
}

function covarianceDeterminant(vxx: number, vpp: number, vxp: number): number {
  return vxx * vpp - vxp * vxp;
}

export const quantumBrownianSystem: OdeSystem = {
  id: "quantumbrownian",
  name: "Quantum Brownian Oscillator",
  mode: "ode",
  state: {
    names: ["xMean", "pMean", "Vxx", "Vpp", "Vxp"],
    y0: buildGroundStateY0({
      m: 1,
      omega: 1,
      gamma: 0.18,
      kT: 0.6,
      hbar: 1
    })
  },
  simulationDefaults: {
    dt: 0.01,
    duration: 24
  },
  supportedIntegrators: ["rk4"],
  params: {
    m: 1,
    omega: 1,
    gamma: 0.18,
    kT: 0.6,
    hbar: 1
  },
  rhs: (_t, y, p) => {
    const [xMean, pMean, vxxRaw, vppRaw, vxpRaw] = y;
    const c = coefficientsFromParams(p);

    const vxx = Number.isFinite(vxxRaw) ? vxxRaw : 0;
    const vpp = Number.isFinite(vppRaw) ? vppRaw : 0;
    const vxp = Number.isFinite(vxpRaw) ? vxpRaw : 0;

    const dxMean = pMean / c.m;
    const dpMean = -c.m * c.omega * c.omega * xMean - c.gamma * pMean;

    const dvxx = (2 * vxp) / c.m + 2 * c.dxx;
    const dvpp = -2 * c.m * c.omega * c.omega * vxp - 2 * c.gamma * vpp + 2 * c.dpp;
    const dvxp = vpp / c.m - c.m * c.omega * c.omega * vxx - c.gamma * vxp;

    return [dxMean, dpMean, dvxx, dvpp, dvxp];
  },
  energy: (y, p) => {
    const [xMean, pMean, vxxRaw, vppRaw] = y;
    const c = coefficientsFromParams(p);
    const vxx = Math.max(0, finiteOr(vxxRaw, 0));
    const vpp = Math.max(0, finiteOr(vppRaw, 0));

    const meanPart = (pMean * pMean) / (2 * c.m) + 0.5 * c.m * c.omega * c.omega * xMean * xMean;
    const fluctuationPart = vpp / (2 * c.m) + 0.5 * c.m * c.omega * c.omega * vxx;
    return meanPart + fluctuationPart;
  },
  derived: (y, p) => {
    const [xMean, pMean, vxxRaw, vppRaw, vxpRaw] = y;
    const c = coefficientsFromParams(p);

    const vxx = Math.max(0, finiteOr(vxxRaw, 0));
    const vpp = Math.max(0, finiteOr(vppRaw, 0));
    const vxp = finiteOr(vxpRaw, 0);

    const detV = Math.max(0, covarianceDeterminant(vxx, vpp, vxp));
    const minDet = (c.hbar * c.hbar) / 4;
    const purity = Math.min(1, c.hbar / (2 * Math.sqrt(Math.max(detV, 1e-12))));
    const uncertaintyRatio = detV / Math.max(minDet, 1e-12);

    const thermalVxx = c.kT / (c.m * c.omega * c.omega);
    const thermalVpp = c.m * c.kT;

    return {
      xMean,
      pMean,
      sigmaX: Math.sqrt(vxx),
      sigmaP: Math.sqrt(vpp),
      detV,
      purity,
      uncertaintyRatio,
      thermalVxx,
      thermalVpp
    };
  },
  presets: [
    {
      name: "Weak Bath (Near Coherent)",
      y0: buildGroundStateY0({
        m: 1,
        omega: 1,
        gamma: 0.08,
        kT: 0.3,
        hbar: 1
      }),
      params: {
        gamma: 0.08,
        kT: 0.3
      }
    },
    {
      name: "Hot Bath",
      y0: buildGroundStateY0(
        {
          m: 1,
          omega: 1,
          gamma: 0.22,
          kT: 1.5,
          hbar: 1
        },
        1.1,
        0
      ),
      params: {
        gamma: 0.22,
        kT: 1.5
      }
    },
    {
      name: "Strong Damping",
      y0: buildGroundStateY0(
        {
          m: 1,
          omega: 1,
          gamma: 0.45,
          kT: 0.7,
          hbar: 1
        },
        0.9,
        0.2
      ),
      params: {
        gamma: 0.45,
        kT: 0.7
      }
    },
    {
      name: "Squeezed Initial State",
      y0: [0.7, 0, 0.18, 1.4, 0],
      params: {
        gamma: 0.14,
        kT: 0.55
      }
    }
  ],
  plotSpec: [
    {
      id: "mean-phase",
      title: "Mean Phase Portrait (<x>, <p>)",
      xLabel: "<x>",
      yLabel: "<p>",
      x: { kind: "state", index: 0 },
      y: { kind: "state", index: 1 }
    },
    {
      id: "xmean-time",
      title: "Mean Position <x> vs Time",
      xLabel: "t",
      yLabel: "<x>",
      x: { kind: "time" },
      y: { kind: "state", index: 0 }
    },
    {
      id: "pmean-time",
      title: "Mean Momentum <p> vs Time",
      xLabel: "t",
      yLabel: "<p>",
      x: { kind: "time" },
      y: { kind: "state", index: 1 }
    },
    {
      id: "sigmax-time",
      title: "Position Spread sigma_x vs Time",
      xLabel: "t",
      yLabel: "sigma_x",
      x: { kind: "time" },
      y: { kind: "derived", key: "sigmaX" }
    },
    {
      id: "purity-time",
      title: "Purity Proxy mu vs Time",
      xLabel: "t",
      yLabel: "mu",
      x: { kind: "time" },
      y: { kind: "derived", key: "purity" }
    },
    {
      id: "energy",
      title: "Total Energy vs Time",
      xLabel: "t",
      yLabel: "E",
      x: { kind: "time" },
      y: { kind: "energy" }
    }
  ],
  vizSpec: {
    type: "quantumbrownian"
  }
};

import type { OdeSystem } from "../types";

export const cartPoleSystem: OdeSystem = {
  id: "cartpole",
  name: "Cart-Pole",
  mode: "ode",
  state: {
    names: ["x", "xdot", "theta", "thetadot"],
    y0: [0, 0, 0.1, 0]
  },
  simulationDefaults: {
    dt: 0.005,
    duration: 12
  },
  params: {
    mCart: 1,
    mPole: 0.15,
    l: 0.7,
    g: 9.81,
    u: 0
  },
  // Frictionless point-mass cart-pole dynamics in control form, aligned with
  // Kelly/SharpNEAT-style derivations. Theta=0 corresponds to upright pole.
  rhs: (_t, y, p) => {
    const [x, xdot, theta, thetadot] = y;
    const mCart = p.mCart;
    const mPole = p.mPole;
    const l = p.l;
    const g = p.g;
    const u = p.u;

    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const denom = mCart + mPole * sinTheta * sinTheta;

    if (denom === 0 || l === 0) {
      return [xdot, 0, thetadot, 0];
    }

    const xddot = (u + mPole * sinTheta * (l * thetadot * thetadot - g * cosTheta)) / denom;
    const thetaddot =
      (-u * cosTheta - mPole * l * thetadot * thetadot * sinTheta * cosTheta +
        (mCart + mPole) * g * sinTheta) /
      (l * denom);

    return [xdot, xddot, thetadot, thetaddot];
  },
  energy: (y, p) => {
    const [, xdot, theta, thetadot] = y;
    const mCart = p.mCart;
    const mPole = p.mPole;
    const l = p.l;
    const g = p.g;

    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    const vxPole = xdot + l * thetadot * cosTheta;
    const vyPole = l * thetadot * sinTheta;

    const kineticCart = 0.5 * mCart * xdot * xdot;
    const kineticPole = 0.5 * mPole * (vxPole * vxPole + vyPole * vyPole);
    const potentialPole = mPole * g * l * cosTheta;

    return kineticCart + kineticPole + potentialPole;
  },
  derived: (y, p) => {
    const [x, , theta] = y;
    const l = p.l;

    return {
      cartX: x,
      bobX: x + l * Math.sin(theta),
      bobY: -l * Math.cos(theta)
    };
  },
  presets: [
    {
      name: "Near Upright",
      y0: [0, 0, 0.12, 0]
    },
    {
      name: "Large Deflection",
      y0: [0, 0, 0.45, 0]
    },
    {
      name: "With Push",
      y0: [0, 0, 0.15, 0],
      params: { u: 1.2 }
    }
  ],
  plotSpec: [
    {
      id: "cart-time",
      title: "Cart Position vs Time",
      xLabel: "t",
      yLabel: "x",
      x: { kind: "time" },
      y: { kind: "state", index: 0 }
    },
    {
      id: "pole-angle",
      title: "Pole Angle vs Time",
      xLabel: "t",
      yLabel: "theta",
      x: { kind: "time" },
      y: { kind: "state", index: 2 }
    },
    {
      id: "pole-phase",
      title: "Pole Phase Portrait",
      xLabel: "theta",
      yLabel: "thetadot",
      x: { kind: "state", index: 2 },
      y: { kind: "state", index: 3 }
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
    type: "cartpole"
  }
};

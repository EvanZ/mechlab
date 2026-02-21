import type { OdeSystem } from "../types";

export const doublePendulumSystem: OdeSystem = {
  id: "doublependulum",
  name: "Double Pendulum",
  mode: "ode",
  state: {
    names: ["theta1", "omega1", "theta2", "omega2"],
    y0: [1.2, 0, 0.8, 0]
  },
  simulationDefaults: {
    dt: 0.005,
    duration: 20
  },
  params: {
    m1: 1,
    m2: 1,
    l1: 1,
    l2: 1,
    g: 9.81
  },
  // Standard closed-form equations equivalent to the common
  // Wikipedia/Lagrangian derivation for a planar double pendulum.
  rhs: (_t, y, p) => {
    const [theta1, omega1, theta2, omega2] = y;
    const m1 = p.m1;
    const m2 = p.m2;
    const l1 = p.l1;
    const l2 = p.l2;
    const g = p.g;

    if (l1 === 0 || l2 === 0) {
      return [omega1, 0, omega2, 0];
    }

    const delta = theta1 - theta2;
    const sinDelta = Math.sin(delta);
    const cosDelta = Math.cos(delta);

    const denomCommon = 2 * m1 + m2 - m2 * Math.cos(2 * delta);

    if (Math.abs(denomCommon) < 1e-9) {
      return [omega1, 0, omega2, 0];
    }

    const omega1Dot =
      (-g * (2 * m1 + m2) * Math.sin(theta1) -
        m2 * g * Math.sin(theta1 - 2 * theta2) -
        2 * sinDelta * m2 * (omega2 * omega2 * l2 + omega1 * omega1 * l1 * cosDelta)) /
      (l1 * denomCommon);

    const omega2Dot =
      (2 * sinDelta *
        (omega1 * omega1 * l1 * (m1 + m2) +
          g * (m1 + m2) * Math.cos(theta1) +
          omega2 * omega2 * l2 * m2 * cosDelta)) /
      (l2 * denomCommon);

    return [omega1, omega1Dot, omega2, omega2Dot];
  },
  energy: (y, p) => {
    const [theta1, omega1, theta2, omega2] = y;
    const m1 = p.m1;
    const m2 = p.m2;
    const l1 = p.l1;
    const l2 = p.l2;
    const g = p.g;

    const kinetic =
      0.5 * m1 * l1 * l1 * omega1 * omega1 +
      0.5 *
        m2 *
        (l1 * l1 * omega1 * omega1 +
          l2 * l2 * omega2 * omega2 +
          2 * l1 * l2 * omega1 * omega2 * Math.cos(theta1 - theta2));

    const potential = -(m1 + m2) * g * l1 * Math.cos(theta1) - m2 * g * l2 * Math.cos(theta2);

    return kinetic + potential;
  },
  derived: (y, p) => {
    const [theta1, , theta2] = y;
    const l1 = p.l1;
    const l2 = p.l2;

    const x1 = l1 * Math.sin(theta1);
    const y1 = l1 * Math.cos(theta1);
    const x2 = x1 + l2 * Math.sin(theta2);
    const y2 = y1 + l2 * Math.cos(theta2);

    return {
      bob1X: x1,
      bob1Y: y1,
      bob2X: x2,
      bob2Y: y2
    };
  },
  presets: [
    {
      name: "Asymmetric Release",
      y0: [1.2, 0, 0.8, 0]
    },
    {
      name: "Near-Symmetric",
      y0: [1.1, 0, 1.1, 0]
    },
    {
      name: "Chaotic Kick",
      y0: [1.2, 0.2, 0.7, -0.15]
    }
  ],
  plotSpec: [
    {
      id: "theta1-time",
      title: "Theta1 vs Time",
      xLabel: "t",
      yLabel: "theta1",
      x: { kind: "time" },
      y: { kind: "state", index: 0 }
    },
    {
      id: "theta2-time",
      title: "Theta2 vs Time",
      xLabel: "t",
      yLabel: "theta2",
      x: { kind: "time" },
      y: { kind: "state", index: 2 }
    },
    {
      id: "phase1",
      title: "Phase Portrait (Link 1)",
      xLabel: "theta1",
      yLabel: "omega1",
      x: { kind: "state", index: 0 },
      y: { kind: "state", index: 1 }
    },
    {
      id: "bob2-trajectory",
      title: "Second Bob Trajectory",
      xLabel: "x2",
      yLabel: "y2",
      x: { kind: "derived", key: "bob2X" },
      y: { kind: "derived", key: "bob2Y" }
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
    type: "doublependulum"
  }
};

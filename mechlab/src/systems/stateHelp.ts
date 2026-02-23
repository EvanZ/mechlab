export const stateHelpBySystemId: Record<string, Record<string, string>> = {
  pendulum: {
    theta: "Current pendulum angle. Zero means upright in this model.",
    omega: "How fast the angle is changing (angular speed)."
  },
  oscillator: {
    x: "Current position of the mass relative to center.",
    v: "Current speed of the mass."
  },
  drivendampedoscillator: {
    x: "Current position of the oscillator mass.",
    v: "Current velocity of the oscillator mass."
  },
  potential1d: {
    x: "Current particle position on the x-axis.",
    v: "Current particle speed along x."
  },
  quantumbrownian: {
    xMean: "Mean quantum position <x> of the oscillator wavepacket.",
    pMean: "Mean momentum <p> of the oscillator wavepacket.",
    Vxx: "Position variance (spread squared in x).",
    Vpp: "Momentum variance (spread squared in p).",
    Vxp: "Position-momentum covariance (tilt of the uncertainty ellipse)."
  },
  muscleactivation: {
    l: "Current normalized muscle length.",
    v: "How fast muscle length is changing.",
    a: "Current activation level (0 = off, 1 = fully on)."
  },
  skijump: {
    x: "Current horizontal position along the hill profile.",
    v_t: "Current speed along the hill tangent (sliding speed)."
  },
  chargedparticle: {
    x: "Particle x-position.",
    y: "Particle y-position.",
    vx: "Particle velocity in the x direction.",
    vy: "Particle velocity in the y direction."
  },
  patchybinding: {
    x1: "Protein 1 x-position.",
    y1: "Protein 1 y-position.",
    theta1: "Protein 1 patch orientation angle.",
    x2: "Protein 2 x-position.",
    y2: "Protein 2 y-position.",
    theta2: "Protein 2 patch orientation angle.",
    vx1: "Protein 1 velocity in x.",
    vy1: "Protein 1 velocity in y.",
    omega1: "Protein 1 angular velocity.",
    vx2: "Protein 2 velocity in x.",
    vy2: "Protein 2 velocity in y.",
    omega2: "Protein 2 angular velocity."
  },
  projectile: {
    x: "Current horizontal position.",
    y: "Current vertical position.",
    vx: "Current horizontal speed.",
    vy: "Current vertical speed."
  },
  orbit: {
    x: "Satellite x-position relative to the center.",
    y: "Satellite y-position relative to the center.",
    vx: "Satellite speed in the x direction.",
    vy: "Satellite speed in the y direction."
  },
  flowfield: {
    x: "Tracer x-position in the flow.",
    y: "Tracer y-position in the flow."
  },
  fluidparticle: {
    x: "Particle x-position.",
    y: "Particle y-position.",
    vx: "Particle speed in x.",
    vy: "Particle speed in y."
  },
  cartpole: {
    x: "Cart position on the track.",
    xdot: "Cart speed along the track.",
    theta: "Pole angle from upright.",
    thetadot: "How fast the pole angle is changing."
  },
  doublependulum: {
    theta1: "Angle of the first link.",
    omega1: "Angular speed of the first link.",
    theta2: "Angle of the second link.",
    omega2: "Angular speed of the second link."
  }
};

export function getStateHelpForSystem(systemId: string | null): Record<string, string> {
  if (!systemId) {
    return {};
  }
  return stateHelpBySystemId[systemId] ?? {};
}

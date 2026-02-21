import { cartPoleSystem } from "./ode/cartpole";
import { blochSphereSystem } from "./ode/blochsphere";
import { chargedParticleSystem } from "./ode/chargedparticle";
import { doubleSlitSystem } from "./ode/doubleslit";
import { doubleSlit2dSystem } from "./ode/doubleslit2d";
import { doublePendulumSystem } from "./ode/doublependulum";
import { flowFieldSystem } from "./ode/flowfield";
import { fluidParticleSystem } from "./ode/fluidparticle";
import { pendulumSystem } from "./ode/pendulum";
import { orbitSystem } from "./ode/orbit";
import { oscillatorSystem } from "./ode/oscillator";
import { potential1dSystem } from "./ode/potential1d";
import { projectileSystem } from "./ode/projectile";
import { qftLatticeSystem } from "./ode/qftlattice";
import { qho1dSystem } from "./ode/qho1d";
import { muscleActivationSystem } from "./ode/muscleactivation";
import { schrodinger1dSystem } from "./ode/schrodinger1d";
import { skiJumpSystem } from "./ode/skijump";
import { tightBindingSystem } from "./ode/tightbinding";
import { twoQubitSystem } from "./ode/twoqubit";
import { tunneling1dSystem } from "./ode/tunneling1d";
import type { OdeSystem, VariationalSystem } from "./types";
import { brachistochroneSystem } from "./variational/brachistochrone";

const odeSystems: OdeSystem[] = [
  pendulumSystem,
  oscillatorSystem,
  potential1dSystem,
  blochSphereSystem,
  twoQubitSystem,
  schrodinger1dSystem,
  tunneling1dSystem,
  doubleSlitSystem,
  doubleSlit2dSystem,
  tightBindingSystem,
  qftLatticeSystem,
  qho1dSystem,
  muscleActivationSystem,
  skiJumpSystem,
  chargedParticleSystem,
  projectileSystem,
  orbitSystem,
  flowFieldSystem,
  fluidParticleSystem,
  cartPoleSystem,
  doublePendulumSystem
];
const variationalSystems: VariationalSystem[] = [brachistochroneSystem];

export const allSystems = [...odeSystems, ...variationalSystems];

export function getOdeSystemById(systemId: string): OdeSystem | undefined {
  return odeSystems.find((system) => system.id === systemId);
}

export function getVariationalSystemById(systemId: string): VariationalSystem | undefined {
  return variationalSystems.find((system) => system.id === systemId);
}

export function listOdeSystems(): OdeSystem[] {
  return odeSystems;
}

export function listSystems(): Array<OdeSystem | VariationalSystem> {
  return allSystems;
}

export function getSystemById(systemId: string): OdeSystem | VariationalSystem | undefined {
  return allSystems.find((system) => system.id === systemId);
}

export function isOdeSystem(system: OdeSystem | VariationalSystem): system is OdeSystem {
  return system.mode === "ode";
}

export function isVariationalSystem(system: OdeSystem | VariationalSystem): system is VariationalSystem {
  return system.mode === "variational";
}

import { describe, expect, it } from "vitest";
import { integrateRk4 } from "../compute/integrators";
import {
  buildTightBindingInitialState,
  tightBindingEnergyFromState,
  tightBindingFromParams,
  tightBindingObservablesFromState,
  tightBindingSystem
} from "../systems/ode/tightbinding";

describe("tightbinding system", () => {
  it("builds a normalized initial state with expected size", () => {
    const params = {
      sites: 84,
      hop: 1,
      hbar: 1,
      epsilon0: 0,
      disorderW: 0,
      disorderSeed: 2,
      periodic: 0,
      impuritySite: -1,
      impurityStrength: 0,
      packetCenter: 16,
      packetWidth: 2.8,
      packetK: 1
    };

    const cfg = tightBindingFromParams(params);
    const y0 = buildTightBindingInitialState(params);
    const obs = tightBindingObservablesFromState(y0, params);

    expect(y0.length).toBe(2 * cfg.n);
    expect(obs.norm).toBeCloseTo(1, 6);
  });

  it("approximately conserves norm and energy in clean periodic chain", () => {
    const params = {
      sites: 72,
      hop: 1,
      hbar: 1,
      epsilon0: 0,
      disorderW: 0,
      disorderSeed: 2,
      periodic: 1,
      impuritySite: -1,
      impurityStrength: 0,
      packetCenter: 18,
      packetWidth: 2.6,
      packetK: 1.1
    };

    const y0 = buildTightBindingInitialState(params);
    const { y } = integrateRk4(tightBindingSystem.rhs, {
      t0: 0,
      y0,
      dt: 0.02,
      steps: 1300,
      params
    });

    const norms = y.map((state) => tightBindingObservablesFromState(state, params).norm);
    const energies = y.map((state) => tightBindingEnergyFromState(state, params));

    const normDrift = Math.max(...norms) - Math.min(...norms);
    const energyDrift = Math.max(...energies) - Math.min(...energies);

    expect(normDrift).toBeLessThan(0.012);
    expect(energyDrift).toBeLessThan(0.02);
  });

  it("strong disorder keeps the packet more localized than clean chain", () => {
    const base = {
      sites: 88,
      hop: 1,
      hbar: 1,
      epsilon0: 0,
      periodic: 0,
      impuritySite: -1,
      impurityStrength: 0,
      packetCenter: 18,
      packetWidth: 2.8,
      packetK: 1.05
    };

    const cleanParams = {
      ...base,
      disorderW: 0,
      disorderSeed: 2
    };

    const disorderParams = {
      ...base,
      disorderW: 4.4,
      disorderSeed: 13
    };

    const clean = integrateRk4(tightBindingSystem.rhs, {
      t0: 0,
      y0: buildTightBindingInitialState(cleanParams),
      dt: 0.02,
      steps: 1200,
      params: cleanParams
    });

    const dis = integrateRk4(tightBindingSystem.rhs, {
      t0: 0,
      y0: buildTightBindingInitialState(disorderParams),
      dt: 0.02,
      steps: 1200,
      params: disorderParams
    });

    const cleanObs = tightBindingObservablesFromState(clean.y[clean.y.length - 1], cleanParams);
    const disObs = tightBindingObservablesFromState(dis.y[dis.y.length - 1], disorderParams);

    expect(disObs.ipr).toBeGreaterThan(cleanObs.ipr + 0.015);
    expect(disObs.rightProb).toBeLessThan(cleanObs.rightProb - 0.1);
  });
});

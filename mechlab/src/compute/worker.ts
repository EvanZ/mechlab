/// <reference lib="webworker" />

import { computeDerivedSeries, computeEnergySeries } from "./energy";
import { integrateRk4, integrateVelocityVerlet } from "./integrators";
import type { WorkerRequest, WorkerResponse } from "./protocol";
import { getOdeSystemById, getVariationalSystemById } from "../systems/systems";
import { setActivePotentialExpression } from "../systems/ode/potentialExpression";
import {
  hillProfileFromTuples,
  setActiveHillProfile
} from "../systems/ode/hillProfile";
import {
  muscleCurveFromTuples,
  setActiveMuscleCurve
} from "../systems/ode/muscleCurve";

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

function post(response: WorkerResponse): void {
  ctx.postMessage(response);
}

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    if (request.type === "simulate") {
      const system = getOdeSystemById(request.systemId);
      if (!system) {
        post({
          type: "error",
          message: `Unknown ODE system: ${request.systemId}`
        });
        return;
      }

      if (system.id === "potential1d" && typeof request.expression === "string") {
        setActivePotentialExpression(request.expression);
      }

      if (system.id === "skijump" && request.hillProfile) {
        setActiveHillProfile(hillProfileFromTuples(request.hillProfile));
      }

      if (system.id === "muscleactivation" && request.muscleCurve) {
        setActiveMuscleCurve(muscleCurveFromTuples(request.muscleCurve));
      }

      const supportedIntegrators = system.supportedIntegrators ?? ["rk4"];

      if (!supportedIntegrators.includes(request.integrator)) {
        post({
          type: "error",
          message: `Integrator ${request.integrator} is not supported for system ${system.id}.`
        });
        return;
      }

      let t: number[];
      let y: number[][];

      if (request.integrator === "rk4") {
        ({ t, y } = integrateRk4(system.rhs, {
          t0: request.t0,
          y0: request.y0,
          dt: request.dt,
          steps: request.steps,
          params: request.params
        }));
      } else {
        ({ t, y } = integrateVelocityVerlet(system.rhs, {
          t0: request.t0,
          y0: request.y0,
          dt: request.dt,
          steps: request.steps,
          params: request.params
        }));
      }

      post({
        type: "simulate:result",
        t,
        y,
        energy: computeEnergySeries(y, request.params, system.energy),
        derived: computeDerivedSeries(y, request.params, system.derived)
      });
      return;
    }

    if (request.type === "solve") {
      const system = getVariationalSystemById(request.systemId);
      if (!system) {
        post({
          type: "error",
          message: `Unknown variational system: ${request.systemId}`
        });
        return;
      }

      post({
        type: "solve:result",
        result: system.solve(request.params)
      });
      return;
    }

    post({ type: "error", message: "Unsupported worker request." });
  } catch (error) {
    post({
      type: "error",
      message: error instanceof Error ? error.message : "Unknown worker error"
    });
  }
};

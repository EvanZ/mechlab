import type { VariationalResult } from "../systems/types";

export type IntegratorType = "rk4" | "verlet";

export type WorkerRequest =
  | {
      type: "simulate";
      systemId: string;
      params: Record<string, number>;
      y0: number[];
      t0: number;
      dt: number;
      steps: number;
      integrator: IntegratorType;
      expression?: string;
      hillProfile?: Array<[number, number]>;
      muscleCurve?: Array<[number, number]>;
    }
  | {
      type: "solve";
      systemId: "brachistochrone";
      params: Record<string, number>;
    };

export interface SimulateResult {
  type: "simulate:result";
  t: number[];
  y: number[][];
  energy?: number[];
  derived?: Record<string, number[]>;
}

export interface SolveResult {
  type: "solve:result";
  result: VariationalResult;
}

export interface ErrorResult {
  type: "error";
  message: string;
}

export type WorkerResponse = SimulateResult | SolveResult | ErrorResult;

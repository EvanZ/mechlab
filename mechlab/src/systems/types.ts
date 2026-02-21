export type SystemMode = "ode" | "variational";

export type DataSource =
  | { kind: "time" }
  | { kind: "state"; index: number }
  | { kind: "energy" }
  | { kind: "derived"; key: string };

export interface PlotSpec {
  id: string;
  title: string;
  xLabel: string;
  yLabel: string;
  x: DataSource;
  y: DataSource;
}

export interface VizSpec {
  type:
    | "pendulum"
    | "oscillator"
    | "potential1d"
    | "muscleactivation"
    | "skijump"
    | "schrodinger1d"
    | "tunneling1d"
    | "doubleslit"
    | "doubleslit2d"
    | "blochsphere"
    | "twoqubit"
    | "tightbinding"
    | "qftlattice"
    | "qho1d"
    | "chargedparticle"
    | "projectile"
    | "orbit"
    | "flowfield"
    | "fluidparticle"
    | "cartpole"
    | "doublependulum"
    | "brachistochrone";
}

export interface OdeSystem {
  id: string;
  name: string;
  mode: "ode";
  state: { names: string[]; y0: number[] };
  simulationDefaults?: {
    dt: number;
    duration: number;
  };
  supportedIntegrators?: Array<"rk4" | "verlet">;
  params: Record<string, number>;
  rhs: (t: number, y: number[], p: Record<string, number>) => number[];
  energy?: (y: number[], p: Record<string, number>) => number;
  derived?: (y: number[], p: Record<string, number>) => Record<string, number>;
  presets?: Array<{
    name: string;
    y0: number[];
    params?: Record<string, number>;
    expression?: string;
  }>;
  plotSpec: PlotSpec[];
  vizSpec: VizSpec;
}

export interface VariationalResult {
  points: Array<{ x: number; y: number }>;
  meta: Record<string, number>;
  series?: Record<string, number[]>;
  referencePoints?: Array<{ x: number; y: number }>;
}

export interface VariationalSystem {
  id: string;
  name: string;
  mode: "variational";
  params: Record<string, number>;
  solve: (p: Record<string, number>) => VariationalResult;
  plotSpec: PlotSpec[];
  vizSpec: VizSpec;
}

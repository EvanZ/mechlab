Codex Project Plan (Markdown)

Project name

MechLab — a browser-only web app for exploring Lagrangian / Hamiltonian mechanics and a calculus-of-variations example (brachistochrone), using Vue 3 + Vite + TypeScript, Web Workers for compute, and custom SVG for plots + animations (no plotting libraries, no backend).

⸻

Goals
	1.	Provide interactive exploration for these built-in systems:
	•	Pendulum
	•	Harmonic oscillator
	•	Projectile (parabolic trajectory)
	•	Orbiting satellite (2-body planar)
	•	Cart-pole
	•	Double pendulum
	•	Brachistochrone (numerical solver)
	2.	Browser-only:
	•	No server calls
	•	No external plotting libs
	•	All simulation + (brachistochrone) optimization runs locally
	3.	Architecture:
	•	Templates with pre-derived equations (no symbolic derivation in browser)
	•	Web Worker runs simulation/optimization so UI stays responsive (Vite supports new Worker(new URL(...)))  ￼
	•	Vue UI renders: SVG plots, SVG animations, controls.

⸻

Non-goals (for v1)
	•	Arbitrary user-entered Lagrangians/Hamiltonians (symbolic derivation)
	•	Constraints/multipliers, dissipation, drag, forced input (except optional cart force parameter)
	•	3D visualization
	•	Export to files (optional later)

⸻

UX Outline

Main layout
	•	Left panel: system picker + parameter sliders/inputs + initial conditions + simulation settings (dt, duration)
	•	Center: SVG animation viewport (system-dependent)
	•	Right: tabs for SVG plots:
	•	q(t) / v(t) or similar
	•	Energy E(t)
	•	Phase portrait (q, qdot) or (q, p) (use available state)
	•	For orbit/projectile: XY trajectory plot

Controls
	•	Run / Pause / Reset
	•	Time scrubber slider (index into simulated arrays)
	•	Presets dropdown (interesting initial conditions)
	•	“Integrator” dropdown: RK4 default; optional symplectic (Verlet/leapfrog) for oscillator/orbit/pendulum.

⸻

Technical Requirements

Frontend
	•	Vue 3 + Vite + TypeScript scaffold (use create-vue / Vite)  ￼
	•	Custom SVG plotting/animation (no Plotly/D3)
	•	Use a Web Worker for compute.

Compute
	•	Implement integrators:
	•	RK4 (general)
	•	(Optional) Velocity Verlet / Leapfrog for Hamiltonian-ish systems (nice energy behavior)
	•	Add decimation for SVG paths to keep performance smooth (avoid huge paths; draw ~1–2 points per x-pixel). SVG path performance considerations are real; favor single <path> updates over tons of elements.  ￼

⸻

System Templates (Built-in)

Shared template contract

Each system is a TypeScript object:

type SystemMode = "ode" | "variational";

interface OdeSystem {
  id: string;
  name: string;
  mode: "ode";
  state: { names: string[]; y0: number[] };      // names align with y vector
  params: Record<string, number>;                // defaults
  rhs: (t: number, y: number[], p: any) => number[];
  energy?: (y: number[], p: any) => number;
  derived?: (y: number[], p: any) => Record<string, number>; // x,y for plotting/viz, etc
  presets?: Array<{ name: string; y0: number[]; params?: Record<string, number> }>;
  plotSpec: PlotSpec[];                          // which plots to show
  vizSpec: VizSpec;                              // how to animate
}

interface VariationalSystem {
  id: string;
  name: string;
  mode: "variational";
  params: Record<string, number>;
  solve: (p: any) => VariationalResult;          // executed in worker
  plotSpec: PlotSpec[];
  vizSpec: VizSpec;
}

ODE systems (equations baked in)

Implement RHS for each:
	1.	Pendulum (state [theta, omega])

	•	theta' = omega
	•	omega' = -(g/l) * sin(theta)

	2.	Harmonic Oscillator (state [x, v])

	•	x' = v
	•	v' = -(k/m) * x

	3.	Projectile (state [x, y, vx, vy])

	•	x' = vx, y' = vy
	•	vx' = 0, vy' = -g

	4.	Orbit (2-body planar) (state [x, y, vx, vy])

	•	vx' = -mu * x / r^3, vy' = -mu * y / r^3

	5.	Cart-pole (state [x, xdot, theta, thetadot])

	•	Use standard frictionless control form; cite a reputable derivation reference for correctness (Kelly PDF / SharpNEAT)  ￼
	•	Include optional input force u param (default 0)

	6.	Double Pendulum (state [theta1, omega1, theta2, omega2])

	•	Use standard closed form; Wikipedia provides Lagrangian/EOM context; implement in code using a known stable formula.  ￼

Variational system
	7.	Brachistochrone

	•	Solve numerically (no symbolic cycloid derivation).
	•	Inputs: endpoints (x0,y0), (x1,y1) (assume y is “down” and positive), gravity g, number of segments N, optimizer iterations.
	•	Approach:
	•	Discretize y-values at fixed x-grid
	•	Compute approximate time integral
	•	Projected gradient descent:
	•	finite-difference gradient on interior points
	•	clamp y_i >= eps
	•	optional smoothing penalty to prevent wiggles
	•	Return curve points + descent time vs straight-line time.
	•	Plot: curve y(x) and optionally “time vs iteration”.

⸻

Worker Architecture

Worker messages

Define message protocol:

type WorkerRequest =
  | { type: "simulate"; systemId: string; params: any; y0: number[]; t0: number; dt: number; steps: number; integrator: "rk4" | "verlet" }
  | { type: "solve"; systemId: "brachistochrone"; params: any };

type WorkerResponse =
  | { type: "simulate:result"; t: number[]; y: number[][]; energy?: number[]; derived?: Record<string, number[]> }
  | { type: "solve:result"; result: any }
  | { type: "error"; message: string };

Implementation notes
	•	Use new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }) (Vite pattern).  ￼
	•	Worker imports systems.ts + integrators.ts.
	•	Send progress events optionally (every N steps) if needed.

⸻

SVG Plotting (No Plot Library)

Plot component requirements
	•	Single <path> polyline per series (avoid many elements)  ￼
	•	viewBox-based scaling
	•	Axes lines, simple ticks, labels
	•	Decimation:
	•	Given arrays of x/y and chart width in pixels, keep at most ~2 * width points.
	•	Use min/max bucket decimation per pixel column (preserves spikes).

Components
	•	SvgPlotFrame.vue — axes + title + tick labels
	•	SvgLineSeries.vue — generates d="M ... L ..." path
	•	SvgScatterSeries.vue — for phase portraits (optional; can also be a path)
	•	PlotPanel.vue — chooses plot type based on PlotSpec

⸻

SVG Animations (Per system)

General pattern
	•	Use a normalized physics “world” coordinate system and map to SVG with simple transforms.
	•	Keep animation stateless except for current index into precomputed arrays.

V1 visualizations
	•	Pendulum: pivot + rod + bob (use theta)
	•	Oscillator: spring line + mass block (use x)
	•	Projectile: dot + trail in XY
	•	Orbit: central body + satellite dot + trail
	•	Cart-pole: cart rectangle + pole line + bob
	•	Double pendulum: two rods + bobs + optional trail of second bob
	•	Brachistochrone: draw curve + a bead moving along curve (optional stretch goal)

⸻

File/Folder Structure

mechlab/
  index.html
  src/
    main.ts
    App.vue
    systems/
      systems.ts
      ode/
        pendulum.ts
        oscillator.ts
        projectile.ts
        orbit.ts
        cartpole.ts
        doublependulum.ts
      variational/
        brachistochrone.ts
    compute/
      worker.ts
      integrators.ts
      decimate.ts
      energy.ts
    components/
      controls/
        SystemPicker.vue
        ParamEditor.vue
        IcEditor.vue
        SimControls.vue
        TimeScrubber.vue
      plots/
        SvgPlotFrame.vue
        SvgLineSeries.vue
        PlotPanel.vue
      viz/
        PendulumViz.vue
        OscillatorViz.vue
        ProjectileViz.vue
        OrbitViz.vue
        CartPoleViz.vue
        DoublePendulumViz.vue
        BrachistochroneViz.vue
    pages/
      LabPage.vue
    styles/
      base.css


⸻

Milestones

Milestone 1 — Core engine (must complete first)
	•	Vite + Vue + TS scaffold
	•	Worker wiring + message protocol
	•	RK4 integrator
	•	Minimal SvgPlot rendering a line path
	•	One system end-to-end: Pendulum with theta(t) plot + animation

Milestone 2 — Expand simple systems
	•	Add oscillator + projectile + orbit
	•	Add energy function and plot for at least pendulum/oscillator/orbit
	•	Add phase portrait for pendulum + oscillator

Milestone 3 — Complex coupled systems
	•	Add cart-pole
	•	Add double pendulum
	•	Ensure performance: decimation + worker-only compute + stable dt defaults

Milestone 4 — Variational mode
	•	Add brachistochrone solver in worker
	•	Render curve + compare time vs straight line
	•	Optional bead animation along curve

⸻

Quality / Correctness Checks
	•	Energy drift:
	•	For conservative systems, energy should stay nearly constant (RK4 will drift slowly; symplectic option should improve).
	•	Regression sanity checks:
	•	Oscillator phase portrait should be an ellipse
	•	Projectile path should be a parabola
	•	Orbit with suitable IC should be elliptical and conserve angular momentum (compute L = xvy - yvx)
	•	Cart-pole EOM correctness referenced against reputable derivations.  ￼

⸻

Stretch Goals (nice-to-have)
	•	Symplectic integrator toggle for oscillator/orbit/pendulum
	•	Poincaré section for driven pendulum (if adding forcing later)
	•	“Two nearby initial conditions” comparison for chaos (double pendulum)
	•	Shareable URLs encoding system + params + ICs
	•	Export CSV

⸻

Instructions for Codex
	1.	Generate the full project scaffold with the folder structure above.
	2.	Implement the worker-based simulation pipeline first (Milestone 1).
	3.	Implement SVG plotting primitives (frame + line path + decimation).
	4.	Add system templates incrementally in milestone order.
	5.	Keep the UI simple and fast; avoid heavy dependencies.
	6.	Ensure everything works offline (no API calls).

⸻


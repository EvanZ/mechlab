export type ExplanationLevel = "eli5" | "grad";

export interface DemoExplanation {
  title: string;
  subtitle?: string;
  eli5: string[];
  grad: string[];
}

const explanationBySystemId: Record<string, DemoExplanation> = {
  pendulum: {
    title: "Simple Pendulum",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Think of a playground swing. If you pull it to one side and let go, gravity pulls it back through the middle and up the other side.",
      "Near the bottom it moves fastest, and near the turning points it slows down because motion energy trades with height energy: $E = K + U$.",
      "A longer pendulum swings more slowly, and stronger gravity makes it swing faster. A common small-angle approximation is $T \\approx 2\\pi\\sqrt{l/g}$."
    ],
    grad: [
      "State model: $$\\dot{\\theta}=\\omega,\\qquad \\dot{\\omega}=-(g/l)\\sin\\theta.$$ The phase portrait has a center at $(0,0)$ and unstable equilibria at $\\theta=(2k+1)\\pi$.",
      "For $|\\theta|\\ll 1$, use $\\sin\\theta\\approx\\theta$, yielding $$\\ddot{\\theta} + (g/l)\\theta = 0,$$ with natural frequency $\\omega_0=\\sqrt{g/l}$.",
      "The conservative energy $$E=\\tfrac12 m l^2\\omega^2 + m g l(1-\\cos\\theta)$$ is constant in the ideal model; the nonlinear $\\sin\\theta$ term produces amplitude-dependent period."
    ]
  },
  oscillator: {
    title: "Harmonic Oscillator",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Imagine a mass on a spring. Pull it away from center and it gets pulled back, overshoots, and repeats.",
      "A stiffer spring pulls harder, and a heavier mass responds more slowly."
    ],
    grad: [
      "Linear dynamics: $$\\dot{x}=v,\\qquad \\dot{v}=-(k/m)x.$$ This is a 2D linear Hamiltonian system.",
      "Invariant energy is $$E=\\tfrac12 m v^2+\\tfrac12 kx^2,$$ so phase-space trajectories are ellipses."
    ]
  },
  drivendampedoscillator: {
    title: "Driven Damped Oscillator",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "This is a spring that loses energy to friction while also getting periodic pushes from outside.",
      "If pushes match the natural rhythm, oscillations can grow even with damping."
    ],
    grad: [
      "Forced dissipative ODE: $$m\\ddot{x}+c\\dot{x}+kx=F_0\\cos(\\Omega_d t+\\phi_d).$$",
      "Steady-state response shows resonance and phase lag; transients decay on timescale roughly $m/c$."
    ]
  },
  potential1d: {
    title: "Particle in User-Defined Potential",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "You draw the energy landscape $V(x)$, and the particle moves like a ball rolling on that shape.",
      "Steeper parts of the curve create stronger pushes."
    ],
    grad: [
      "Potential-generated force: $$m\\ddot{x}=-\\frac{dV}{dx},\\qquad \\dot{x}=v.$$",
      "For time-independent $V(x)$, total energy $$E=\\tfrac12 m v^2+V(x)$$ should stay nearly constant up to numerical error."
    ]
  },
  blochsphere: {
    title: "Bloch Sphere (Single Qubit)",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "A qubit state can be shown as an arrow on a sphere. Fields rotate that arrow around the sphere.",
      "Different axis strengths change how fast it turns in each direction."
    ],
    grad: [
      "Two-level evolution: $$i\\hbar\\,\\partial_t|\\psi\\rangle=\\hat{H}|\\psi\\rangle,\\quad \\hat{H}=\\tfrac12(\\Omega_x\\sigma_x+\\Omega_y\\sigma_y+\\Omega_z\\sigma_z).$$",
      "Equivalent Bloch-vector equation: $$\\dot{\\mathbf{s}}=\\boldsymbol{\\Omega}\\times\\mathbf{s},\\quad \\|\\mathbf{s}\\|=1$$ for pure states."
    ]
  },
  twoqubit: {
    title: "Two-Qubit Entanglement Playground",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Two qubits can behave independently or become linked so measuring one tells you about the other.",
      "Local fields rotate each qubit, and coupling can create or remove entanglement."
    ],
    grad: [
      "Unitary dynamics on a 4D complex state: $$i\\hbar\\,\\partial_t|\\psi\\rangle=\\hat{H}|\\psi\\rangle.$$",
      "The coupling term $J_{zz}\\,\\sigma_z\\otimes\\sigma_z$ generates correlations; concurrence and entropy track entanglement growth."
    ]
  },
  schrodinger1d: {
    title: "1D Schrodinger Wavepacket",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "A quantum packet spreads as it moves and can bounce off or pass through barriers.",
      "You can watch probability density move instead of a single point particle path."
    ],
    grad: [
      "Time-dependent Schrodinger equation: $$i\\hbar\\,\\partial_t\\psi(x,t)=\\left[-\\frac{\\hbar^2}{2m}\\partial_x^2+V(x)\\right]\\psi(x,t).$$",
      "Observables like $\\langle x\\rangle$, spread, reflection, and transmission summarize packet transport."
    ]
  },
  tunneling1d: {
    title: "Quantum Tunneling (Single/Double Barrier)",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Quantum waves can cross barriers even when classically they should bounce back.",
      "With two barriers, certain energies line up and transmit much better (resonance)."
    ],
    grad: [
      "Same TDSE framework with barrier potential; transmission is energy-selective: $$T(E)\\in[0,1].$$",
      "Double-barrier setups produce quasi-bound resonances, seen as peaks in $T(E)$."
    ]
  },
  doublewell: {
    title: "Quantum Double-Well Tunneling",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "The particle has two preferred valleys. Quantum behavior lets it leak between them.",
      "If wells are symmetric, probability can slosh back and forth."
    ],
    grad: [
      "In a double-well $V(x)$, near-degenerate even/odd eigenstates split by $\\Delta E$ set tunneling timescale.",
      "Population imbalance oscillates roughly at frequency $$\\omega_{\\text{tun}}\\approx\\Delta E/\\hbar.$$"
    ]
  },
  doubleslit: {
    title: "Double-Slit Interference (1D Reduced)",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Two openings make two wave contributions, and they add or cancel to create bright and dark fringes.",
      "Changing slit phase or amplitude shifts the pattern."
    ],
    grad: [
      "Interference intensity follows superposition: $$I\\propto|\\psi_1+\\psi_2|^2=|\\psi_1|^2+|\\psi_2|^2+2\\Re(\\psi_1^*\\psi_2).$$",
      "Fringe visibility and center intensity measure coherence and relative phase."
    ]
  },
  doubleslit2d: {
    title: "Double-Slit Interference (2D)",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "A 2D quantum beam hits a wall with two gaps and makes a full interference screen pattern.",
      "You can open/close slits and move the detector to see pattern changes."
    ],
    grad: [
      "2D TDSE propagation: $$i\\hbar\\,\\partial_t\\psi=\\left[-\\frac{\\hbar^2}{2m}(\\partial_x^2+\\partial_y^2)+V(x,y)\\right]\\psi.$$",
      "Detector-line observables quantify fringe contrast, transmitted probability, and reflected probability."
    ]
  },
  tightbinding: {
    title: "Tight-Binding Chain",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "A quantum particle hops between neighboring sites on a chain.",
      "Disorder and impurities can trap it instead of letting it spread."
    ],
    grad: [
      "Discrete lattice equation: $$i\\hbar\\,\\dot{\\psi}_n=\\epsilon_n\\psi_n-J(\\psi_{n+1}+\\psi_{n-1}).$$",
      "Transport metrics include mean position, spread, inverse participation ratio, and norm conservation."
    ]
  },
  qftlattice: {
    title: "QFT Lattice (1+1D Scalar Field)",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Instead of one particle, every grid point has a field value that wiggles and interacts with neighbors.",
      "A nonlinear term can make wave motion distort and self-interact."
    ],
    grad: [
      "Discretized Klein-Gordon/$\\phi^4$ dynamics: $$\\dot{\\phi}=\\pi,\\quad \\dot{\\pi}=\\nabla^2\\phi-m^2\\phi-\\lambda\\phi^3\\;(-\\gamma\\pi\\ \\text{if damped}).$$",
      "Energy transfer between gradient, mass, and interaction terms is visible in center and norm-like diagnostics."
    ]
  },
  qho1d: {
    title: "Quantum Harmonic Oscillator (1D)",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "This is the quantum version of a spring, where allowed energy levels are discrete.",
      "Mixing levels creates a wave that changes shape in time."
    ],
    grad: [
      "Hamiltonian: $$\\hat{H}=\\frac{\\hat{p}^2}{2m}+\\tfrac12 m\\omega^2\\hat{x}^2,$$ with eigenvalues $E_n=\\hbar\\omega(n+\\tfrac12)$.",
      "Superposition phases evolve as $e^{-iE_nt/\\hbar}$, producing beating in moments like $\\langle x\\rangle$ and $\\langle p\\rangle$."
    ]
  },
  quantumbrownian: {
    title: "Quantum Brownian Oscillator",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "A quantum oscillator is connected to a noisy environment, so it both damps and jitters.",
      "The center motion and uncertainty width can evolve differently."
    ],
    grad: [
      "Effective open-system moment dynamics include damping rate $\\gamma$ and thermal noise scale $kT$.",
      "Mean and covariance evolution track drift-diffusion in phase space and purity/energy decay."
    ]
  },
  muscleactivation: {
    title: "Active Muscle-Spring Model",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Think of an active spring that can pull harder when neural drive goes up.",
      "Its force also depends on current length, like a muscle with a length-tension curve."
    ],
    grad: [
      "State includes length $l$, velocity $v$, and activation $a$ with activation kinetics $$\\dot{a}=(u-a)/\\tau.$$",
      "Mechanical balance combines active force, passive elasticity, damping, and external load to set $\\dot{v}$."
    ]
  },
  skijump: {
    title: "Ski Jump with Friction",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "You draw the hill and the skier slides along it. Steeper downhill sections speed up motion.",
      "Friction rubs away energy, so speed grows less than in a frictionless track."
    ],
    grad: [
      "Tangential dynamics on a profile $y(x)$ balance gravity component along slope and kinetic friction.",
      "Energy bookkeeping compares potential drop, kinetic gain, and dissipated work by friction."
    ]
  },
  chargedparticle: {
    title: "Charged Particle in Electric Field",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "A charged particle gets pushed by electric fields; opposite charges push in opposite directions.",
      "Uniform and source-like fields can bend the path differently."
    ],
    grad: [
      "Newton-Lorentz (electric-only): $$m\\dot{\\mathbf{v}}=q\\mathbf{E}(\\mathbf{r}),\\quad \\dot{\\mathbf{r}}=\\mathbf{v}.$$",
      "Trajectory curvature and speed changes follow local field geometry and charge-to-mass ratio $q/m$."
    ]
  },
  projectile: {
    title: "Projectile Motion",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Throw something and gravity keeps pulling it down while it keeps moving sideways.",
      "That combination makes the classic arc shape."
    ],
    grad: [
      "Kinematics with constant gravity: $$\\dot{x}=v_x,\\ \\dot{y}=v_y,\\ \\dot{v}_x=0,\\ \\dot{v}_y=-g.$$",
      "Eliminating time gives parabola $$y(x)=y_0+\\frac{v_{y0}}{v_{x0}}(x-x_0)-\\frac{g}{2v_{x0}^2}(x-x_0)^2.$$"
    ]
  },
  orbit: {
    title: "2D Orbital Motion",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "A satellite keeps moving forward while gravity keeps pulling it inward, making an orbit.",
      "Different starting speed gives circle-like, ellipse-like, or escape paths."
    ],
    grad: [
      "Central-force model: $$\\ddot{\\mathbf{r}}=-\\mu\\frac{\\mathbf{r}}{r^3}.$$",
      "Specific energy and angular momentum are invariants of the two-body point-mass model."
    ]
  },
  rutherford: {
    title: "Rutherford Scattering",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "A fast charged particle flies near a charged nucleus and gets deflected.",
      "Closer passes bend more strongly, like a near-miss slingshot."
    ],
    grad: [
      "Coulomb scattering follows inverse-square force with impact parameter $b$ controlling deflection angle.",
      "Classically, $$\\theta=2\\arctan\\!\\left(\\frac{k q_1 q_2}{m v_\\infty^2 b}\\right),$$ which the simulation compares against numerics."
    ]
  },
  patchybinding: {
    title: "Patchy Protein-Protein Binding",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Two proteins move around and can stick when their sticky patches face each other at close range.",
      "Orientation matters, not just distance."
    ],
    grad: [
      "Coupled translation-rotation dynamics include anisotropic interaction terms that favor patch alignment.",
      "Binding metrics track contact duration, orientation alignment, and bound-state occupancy."
    ]
  },
  wave2d: {
    title: "2D Classical Wave",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Like ripples on a pond after a splash: peaks spread out and interfere.",
      "You can see wavefronts, reflections, and energy spreading."
    ],
    grad: [
      "Wave equation (discretized): $$\\partial_t^2 u=c^2\\nabla^2u\\;(-\\text{damping terms if enabled}).$$",
      "Diagnostics track center amplitude, peak amplitude, effective radius, and total wave energy."
    ]
  },
  flowfield: {
    title: "Flow Field Tracer",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "A tiny marker rides along a pre-defined flow pattern, like dye in water.",
      "It follows local arrows of the velocity field."
    ],
    grad: [
      "Pure kinematic advection: $$\\dot{x}=u(x,y,t),\\qquad \\dot{y}=v(x,y,t).$$",
      "This demo evolves trajectories in a prescribed field, not force-based particle dynamics."
    ]
  },
  navierstokes2d: {
    title: "2D Navier-Stokes Around Obstacle",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Fluid flows past an obstacle and can form swirls behind it.",
      "Higher speed or lower viscosity usually makes wake patterns stronger."
    ],
    grad: [
      "Incompressible equations: $$\\partial_t\\mathbf{u}+(\\mathbf{u}\\cdot\\nabla)\\mathbf{u}=-\\nabla p/\\rho+\\nu\\nabla^2\\mathbf{u},\\quad \\nabla\\cdot\\mathbf{u}=0.$$",
      "Observed metrics include mean/max speed, vorticity level, and Reynolds-number-like trend."
    ]
  },
  percolation: {
    title: "Site Percolation",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Each cell is randomly open or blocked. Above a critical openness, a connected path spans the grid.",
      "It is about connectivity thresholds, not smooth time dynamics."
    ],
    grad: [
      "For occupancy probability $p$, observables include spanning probability and largest-cluster fraction.",
      "Near critical $p_c$, finite-size systems show rapid scaling changes in connectivity statistics."
    ]
  },
  fluidparticle: {
    title: "Particle in Fluid with Drag",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "A heavier particle does not instantly match the fluid speed; drag pulls it toward the flow.",
      "It lags behind quick flow changes because of inertia."
    ],
    grad: [
      "Minimal inertial model: $$\\dot{\\mathbf{r}}=\\mathbf{v}_p,\\qquad m\\dot{\\mathbf{v}}_p\\approx -\\gamma(\\mathbf{v}_p-\\mathbf{u}(\\mathbf{r},t))+\\text{other forces}.$$",
      "Velocity-phase and drag-force traces show relaxation toward local flow velocity."
    ]
  },
  brownian: {
    title: "Classical Brownian Motion",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "The particle gets random tiny kicks, so its path wiggles unpredictably.",
      "Over time, average spread grows even though each step is random."
    ],
    grad: [
      "Diffusive scaling: $$\\langle r^2(t)\\rangle\\propto 2dDt$$ in $d$ dimensions.",
      "Single trajectories are noisy, so ensemble or time-averaged MSD is the main statistical observable."
    ]
  },
  cartpole: {
    title: "Cart-Pole",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "A cart moves left-right while a pole pivots on top. Moving the cart can keep the pole balanced.",
      "Without control, the upright pole is unstable and tends to fall."
    ],
    grad: [
      "Coupled nonlinear dynamics in $(x,\\dot{x},\\theta,\\dot{\\theta})$ from constrained rigid-body mechanics.",
      "Control input $u$ enters as generalized force on the cart, yielding a standard benchmark nonlinear control system."
    ]
  },
  doublependulum: {
    title: "Double Pendulum",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Two linked pendulums exchange energy in complicated ways.",
      "Very tiny changes in start angle can lead to very different motion later."
    ],
    grad: [
      "State: $[\\theta_1,\\omega_1,\\theta_2,\\omega_2]$ with strongly coupled nonlinear equations.",
      "For many energies, dynamics are chaotic with sensitive dependence on initial conditions despite deterministic ODEs."
    ]
  },
  brachistochrone: {
    title: "Brachistochrone (Variational Optimization)",
    subtitle: "One system, two levels of explanation.",
    eli5: [
      "Goal: find the track shape that gets a bead from start to end fastest under gravity.",
      "The fastest path is usually steeper at first to gain speed early."
    ],
    grad: [
      "We minimize travel-time functional $$T[y]=\\int \\frac{\\sqrt{1+(y')^2}}{\\sqrt{2gy}}\\,dx$$ numerically on a discretized curve.",
      "Projected gradient descent updates interior points with positivity/smoothing constraints and compares against straight-line time."
    ]
  }
};

export function getDemoExplanation(systemId: string | null): DemoExplanation | null {
  if (!systemId) {
    return null;
  }

  return explanationBySystemId[systemId] ?? null;
}

export const paramHelpBySystemId: Record<string, Record<string, string>> = {
  pendulum: {
    g: "How strong gravity pulls downward. Bigger g makes the pendulum swing faster.",
    l: "How long the pendulum rod is. A longer rod swings more slowly."
  },
  oscillator: {
    m: "How heavy the mass is. Heavier mass changes speed more slowly.",
    k: "How stiff the spring is. Bigger k means a stronger pull back to center."
  },
  potential1d: {
    m: "How heavy the particle is. Heavier means less acceleration from the same force.",
    gradStep:
      "How tiny the x-step is when estimating slope dV/dx. Smaller is more precise but can be noisier if too tiny."
  },
  blochsphere: {
    hbar:
      "Reduced Planck constant scaling in i*hbar*dpsi/dt = H*psi. Smaller hbar makes phase evolution faster.",
    omegaX: "Drive/field strength around the Bloch x-axis.",
    omegaY: "Drive/field strength around the Bloch y-axis.",
    omegaZ: "Drive/field strength around the Bloch z-axis (sets Larmor precession about z).",
    theta0: "Initial polar angle on the Bloch sphere. 0 = |0>, pi = |1>.",
    phi0: "Initial azimuth angle around the z-axis."
  },
  twoqubit: {
    hbar: "Reduced Planck constant scale in i*hbar*dpsi/dt = H*psi.",
    omega1x: "Qubit A drive around x.",
    omega1y: "Qubit A drive around y.",
    omega1z: "Qubit A detuning/field around z.",
    omega2x: "Qubit B drive around x.",
    omega2y: "Qubit B drive around y.",
    omega2z: "Qubit B detuning/field around z.",
    jzz: "Coupling strength for Z⊗Z interaction. Nonzero values can generate entanglement.",
    theta1: "Initial Bloch polar angle for qubit A.",
    phi1: "Initial Bloch azimuth angle for qubit A.",
    theta2: "Initial Bloch polar angle for qubit B.",
    phi2: "Initial Bloch azimuth angle for qubit B."
  },
  schrodinger1d: {
    m: "Effective mass in the Schrodinger equation. Bigger m makes packet spreading slower.",
    gridPoints: "How many x-samples are used. More points means finer detail but slower simulation.",
    xMin: "Left edge of the 1D simulation domain.",
    xMax: "Right edge of the 1D simulation domain.",
    packetX0: "Starting center position of the wavepacket.",
    packetSigma: "Initial packet width. Bigger sigma makes a wider, less momentum-spread packet.",
    packetK0: "Initial wave number (momentum-like). Larger value gives faster rightward drift.",
    barrierCenter: "Where the barrier is centered on the x-axis.",
    barrierWidth: "How wide the Gaussian barrier is.",
    barrierHeight: "How tall the barrier is. Taller barriers usually increase reflection.",
    absorberStrength:
      "How strongly the edges absorb the wave to reduce boundary reflections.",
    absorberFraction:
      "What fraction of each edge acts as absorber zone."
  },
  tunneling1d: {
    m: "Effective mass in the Schrodinger tunneling model.",
    hbar: "Reduced Planck constant scaling diffraction and phase evolution.",
    gridPoints: "Number of x-samples. More points give cleaner barriers and curves but run slower.",
    xMin: "Left edge of the simulation domain.",
    xMax: "Right edge of the simulation domain.",
    packetX0: "Initial center position of the incoming wavepacket.",
    packetSigma: "Initial packet width. Wider packet gives narrower energy spread.",
    packetK0: "Initial wave number (momentum-like) of the packet.",
    barrierHeight: "Barrier potential height.",
    barrierWidth: "Width of each barrier segment.",
    wellWidth: "Distance between barriers in double-barrier mode.",
    doubleBarrier: "0 = single barrier, 1 = double barrier resonant structure.",
    absorberStrength: "How strongly domain edges absorb outgoing waves to reduce reflections.",
    absorberFraction: "Fraction of each edge used as absorber zone.",
    scanEmin: "Minimum energy for the transmission scan curve.",
    scanEmax: "Maximum energy for the transmission scan curve.",
    scanPoints: "Number of sampled energies in the transmission scan."
  },
  doublewell: {
    m: "Effective mass in the double-well Schrodinger model.",
    hbar: "Reduced Planck constant scaling phase evolution and tunneling timescale.",
    gridPoints: "Number of x-samples. More points mean smoother wave and potential curves but slower runtime.",
    xMin: "Left edge of the 1D domain.",
    xMax: "Right edge of the 1D domain.",
    wellSeparation: "Distance between the two well minima. Larger separation usually weakens tunneling.",
    barrierHeight: "Height of the central barrier at x=0. Higher barrier means slower tunneling.",
    tilt: "Linear bias that makes one well lower than the other (breaks symmetry).",
    packetSigma: "Initial wavepacket width in each well.",
    packetK0: "Initial wave number (momentum-like kick) of the packet.",
    startInRight: "0 starts in the left well, 1 starts in the right well."
  },
  tightbinding: {
    sites: "Number of lattice sites in the chain.",
    hop: "Nearest-neighbor hopping strength. Bigger hop makes faster spreading.",
    hbar: "Reduced Planck constant scaling phase evolution.",
    epsilon0: "Uniform onsite energy offset applied to every site.",
    disorderW: "Disorder strength for random onsite energies (Anderson-style).",
    disorderSeed: "Seed controlling the specific disorder pattern.",
    periodic: "Boundary mode: 1 wraps ends into a ring, 0 keeps open chain ends.",
    impuritySite: "Optional impurity site index. Use -1 to disable.",
    impurityStrength: "Extra onsite energy added at impuritySite.",
    packetCenter: "Initial center site of the wavepacket.",
    packetWidth: "Initial packet width in site units.",
    packetK: "Initial lattice wave number (sets packet drift direction/speed)."
  },
  doubleslit: {
    m: "Effective mass in the quantum propagation model.",
    hbar: "Reduced Planck constant scaling the diffraction/spreading rate.",
    gridPoints: "How many x-samples are used. More points give smoother fringes but slower simulation.",
    xMin: "Left edge of the transverse simulation domain.",
    xMax: "Right edge of the transverse simulation domain.",
    slitSeparation: "Distance between the two slit centers.",
    slitWidth: "Width of each slit opening. Wider slits create less spreading.",
    slitPhase: "Relative phase offset between the two slits (radians).",
    slitAmpRatio: "Amplitude ratio of right slit to left slit. 1 means both slits are equally bright.",
    carrierK: "Optional transverse carrier wave number. Usually 0 for symmetric setup.",
    absorberStrength: "How strongly edges absorb the wave to reduce boundary reflections.",
    absorberFraction: "Fraction of each edge used as absorber zone."
  },
  doubleslit2d: {
    m: "Effective mass in the 2D Schrodinger equation.",
    hbar: "Reduced Planck constant scaling the diffraction/spreading rate.",
    gridX: "Number of horizontal cells in the 2D grid. More cells = finer details but slower.",
    gridY: "Number of vertical cells in the 2D grid. More cells = finer details but slower.",
    xMin: "Left x-boundary of the simulation box.",
    xMax: "Right x-boundary of the simulation box.",
    yMin: "Bottom y-boundary of the simulation box.",
    yMax: "Top y-boundary of the simulation box.",
    packetX0: "Initial beam center x-position.",
    packetY0: "Initial beam center y-position (typically below the barrier).",
    packetSigmaX: "Initial beam width across x.",
    packetSigmaY: "Initial beam width along y.",
    packetKx: "Initial x-momentum component of the beam.",
    packetKy: "Initial y-momentum component (positive moves upward toward slits).",
    barrierY: "Vertical position of the barrier containing the two slits.",
    barrierThickness: "Barrier thickness in y.",
    slitSeparation: "Distance between slit centers.",
    slitWidth: "Width of each slit opening.",
    barrierHeight: "Barrier potential height outside slit openings.",
    rightSlitOpen: "How open the right slit is: 1=open, 0=closed (single-slit case).",
    detectorY: "Y-position of the detector line where the fringe pattern is sampled.",
    absorberStrength: "How strongly edges absorb outgoing waves to reduce reflections.",
    absorberFraction: "Fraction of each boundary used as absorbing zone."
  },
  qftlattice: {
    gridPoints: "Number of spatial lattice sites for the scalar field.",
    xMin: "Left spatial boundary of the lattice.",
    xMax: "Right spatial boundary of the lattice.",
    mass: "Mass term m in the Klein-Gordon potential. Larger mass favors faster local oscillation.",
    lambda: "Self-interaction strength for phi^4 term. Higher values add stronger nonlinearity.",
    damping: "Optional damping on field momentum pi. Zero keeps conservative dynamics.",
    periodic: "Boundary mode: 1 uses periodic wraparound, 0 uses fixed ends.",
    packetCenter: "Initial center of the field packet.",
    packetWidth: "Initial packet width.",
    packetAmp: "Initial packet amplitude.",
    packetK: "Initial spatial wave number of oscillation inside the packet.",
    packetPiScale: "Scales initial conjugate momentum pi relative to the packet."
  },
  qho1d: {
    m: "Effective mass in the quantum oscillator Hamiltonian.",
    omega: "Oscillator angular frequency. Larger omega means faster oscillation and tighter confinement.",
    hbar: "Reduced Planck constant scaling. Changes how strongly wave effects show up.",
    gridPoints: "How many x-samples are used. More points mean finer detail but slower simulation.",
    xMin: "Left edge of the simulation domain.",
    xMax: "Right edge of the simulation domain.",
    c0: "Weight of the ground-state component in the initial superposition.",
    c1: "Weight of the first excited-state component.",
    c2: "Weight of the second excited-state component.",
    phi1: "Relative phase (radians) applied to the first excited component.",
    phi2: "Relative phase (radians) applied to the second excited component."
  },
  muscleactivation: {
    m: "Effective moving mass attached to the muscle. Bigger mass is harder to move quickly.",
    fMax: "Maximum active muscle force when activation is fully on and length is ideal.",
    kPassive: "How strongly passive tissue resists stretch beyond slack length.",
    lSlack: "Length where passive spring force starts to engage.",
    damping: "Velocity drag inside the system. Bigger damping smooths motion and reduces oscillation.",
    load: "External pull trying to stretch the muscle. Positive load encourages lengthening.",
    u: "Neural drive command (0 to 1). Higher u tells the muscle to activate more.",
    tau: "Activation response time. Smaller tau means activation changes faster.",
    lFloor: "Shortest allowed length to prevent unrealistic collapse."
  },
  skijump: {
    g: "Gravity strength. Bigger g makes the skier speed up more on downhill slopes.",
    m: "Skier mass. Included for force/energy scaling.",
    muK: "Sliding friction amount. Bigger muK means more speed lost to rubbing against snow."
  },
  chargedparticle: {
    q: "Particle electric charge. Positive and negative charges accelerate in opposite directions.",
    m: "Particle mass. Bigger mass means less acceleration from the same electric force.",
    ex0: "Uniform electric field component along x.",
    ey0: "Uniform electric field component along y.",
    sourceStrength:
      "Strength of a point-like electric source at the center. Positive pushes outward, negative pulls inward.",
    coreRadius:
      "Softens the center singularity so the field stays finite near the origin."
  },
  rutherford: {
    m: "Mass of the incoming projectile particle.",
    qProj: "Charge of the projectile.",
    qTarget: "Charge of the fixed target nucleus at the origin.",
    kC: "Coulomb constant scale. Larger values mean stronger scattering force.",
    coreRadius:
      "Small softening radius to avoid infinite force exactly at the origin.",
    xStart: "Initial x-position where the projectile starts (usually negative, from the left).",
    impactParam:
      "Impact parameter b: vertical offset of the incoming beam from the target center.",
    beamSpeed: "Incoming beam speed before the close approach."
  },
  patchybinding: {
    m1: "Mass of protein 1.",
    m2: "Mass of protein 2.",
    I1: "Rotational inertia of protein 1.",
    I2: "Rotational inertia of protein 2.",
    drag1: "Translational drag on protein 1 from surrounding fluid.",
    drag2: "Translational drag on protein 2 from surrounding fluid.",
    rotDrag1: "Rotational drag that slows spinning of protein 1.",
    rotDrag2: "Rotational drag that slows spinning of protein 2.",
    kRep: "Short-range steric repulsion strength preventing overlap.",
    kAttr: "Attractive binding-well strength when patches face each other.",
    bindRadius: "Preferred center-to-center distance at the binding interface.",
    bindWidth: "How tight the binding distance preference is.",
    kTorque: "How strongly both proteins rotate to align their interface patches.",
    patchSharpness: "How strict orientation matching is. Larger means more selective binding.",
    coreRadius1: "Effective hard-core radius of protein 1.",
    coreRadius2: "Effective hard-core radius of protein 2."
  },
  wave2d: {
    gridX: "Number of horizontal cells in the water surface grid.",
    gridY: "Number of vertical cells in the water surface grid.",
    xMin: "Left boundary of the simulated lake patch.",
    xMax: "Right boundary of the simulated lake patch.",
    yMin: "Bottom boundary of the simulated lake patch.",
    yMax: "Top boundary of the simulated lake patch.",
    cWave: "Wave propagation speed across the surface.",
    damping: "Global damping that slowly removes wave energy everywhere.",
    edgeDamping: "Extra damping near boundaries to absorb outgoing waves and reduce reflections.",
    periodic: "Boundary mode: 1 wraps edges, 0 uses fixed-edge basin walls.",
    dropX0: "Horizontal stone-drop location.",
    dropY0: "Vertical stone-drop location.",
    dropSigma: "Size of the initial splash footprint.",
    dropAmp: "Initial height displacement at the splash center.",
    dropV0: "Initial vertical speed impulse of the splash."
  },
  projectile: {
    g: "Gravity strength pulling the projectile downward."
  },
  orbit: {
    mu: "Gravity strength of the central body. Bigger mu bends the orbit more strongly."
  },
  flowfield: {
    uniformU: "Background flow speed in the horizontal direction.",
    uniformV: "Background flow speed in the vertical direction.",
    sourceStrength: "How strongly flow spreads out from (or sinks into) the center.",
    vortexStrength: "How strongly the flow spins around the center.",
    coreRadius: "Softens the center singularity. Bigger core makes center behavior smoother."
  },
  fluidparticle: {
    g: "Gravity strength.",
    mu: "Fluid viscosity (thickness). Higher mu means stronger sticky drag.",
    rhoFluid: "Density of the surrounding fluid.",
    rhoParticle: "Density of the particle itself.",
    radius: "Particle size. Larger particles have more area and volume, changing drag and buoyancy.",
    cd: "Drag coefficient for shape-dependent inertial drag."
  },
  cartpole: {
    mCart: "Mass of the cart base.",
    mPole: "Mass of the pole bob.",
    l: "Pole length from pivot to bob.",
    g: "Gravity strength.",
    u: "Horizontal force applied to the cart."
  },
  doublependulum: {
    m1: "Mass of the first bob.",
    m2: "Mass of the second bob.",
    l1: "Length of the first link.",
    l2: "Length of the second link.",
    g: "Gravity strength."
  },
  brachistochrone: {
    x0: "Start x-position.",
    y0: "Start y-position (downward is positive in this demo).",
    x1: "End x-position.",
    y1: "End y-position (should be below y0 to descend).",
    g: "Gravity strength used to compute travel speed.",
    segments: "How many curve pieces are used. More segments can represent finer shapes.",
    iterations: "How many optimizer steps to run.",
    learningRate: "How big each optimization step is. Too big can overshoot, too small can be slow.",
    smoothness: "Penalty against wiggles. Higher smoothness makes cleaner, less jagged curves.",
    xClustering:
      "How strongly x-samples cluster near one side. Helps focus resolution where shape changes quickly."
  }
};

export function getParamHelpForSystem(systemId: string | null): Record<string, string> {
  if (!systemId) {
    return {};
  }
  return paramHelpBySystemId[systemId] ?? {};
}

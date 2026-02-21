export type EquationFramework = "newtonian" | "lagrangian" | "hamiltonian";

export const frameworkOrder: EquationFramework[] = ["newtonian", "lagrangian", "hamiltonian"];

export const frameworkLabel: Record<EquationFramework, string> = {
  newtonian: "Newtonian",
  lagrangian: "Lagrangian",
  hamiltonian: "Hamiltonian"
};

export interface EquationSection {
  title: string;
  lines: string[];
}

export interface FrameworkEquationSpec {
  description?: string;
  sections: EquationSection[];
  footnote?: string;
}

export interface EquationSpec {
  subtitle?: string;
  preferredFramework?: EquationFramework;
  frameworks: Partial<Record<EquationFramework, FrameworkEquationSpec>>;
}

export const defaultEquationSpec: EquationSpec = {
  subtitle: "Select a system to view governing equations.",
  frameworks: {}
};

export const equationsBySystemId: Record<string, EquationSpec> = {
  pendulum: {
    subtitle: "Simple pendulum (no damping, no forcing)",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Second-Order Form",
            lines: ["\\ddot{\\theta} + \\frac{g}{l}\\sin\\theta = 0"]
          },
          {
            title: "State-Space Form",
            lines: ["\\dot{\\theta}=\\omega", "\\dot{\\omega}=-\\frac{g}{l}\\sin\\theta"]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Lagrangian",
            lines: [
              "T=\\frac12 m l^2\\dot{\\theta}^2",
              "V=mgl(1-\\cos\\theta)",
              "L(\\theta,\\dot{\\theta})=T-V"
            ]
          },
          {
            title: "Euler-Lagrange",
            lines: ["\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{\\theta}}\\right)-\\frac{\\partial L}{\\partial \\theta}=0"]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Canonical Variables",
            lines: ["p_{\\theta}=\\frac{\\partial L}{\\partial \\dot{\\theta}}=m l^2\\dot{\\theta}"]
          },
          {
            title: "Hamiltonian",
            lines: [
              "H(\\theta,p_{\\theta})=\\frac{p_{\\theta}^2}{2ml^2}+mgl(1-\\cos\\theta)",
              "\\dot{\\theta}=\\frac{\\partial H}{\\partial p_{\\theta}},\\quad \\dot{p}_{\\theta}=-\\frac{\\partial H}{\\partial \\theta}"
            ]
          }
        ]
      }
    }
  },
  oscillator: {
    subtitle: "Linear harmonic oscillator",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Newton's Law",
            lines: ["m\\ddot{x}=-kx", "\\dot{x}=v,\\quad \\dot{v}=-(k/m)x"]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Lagrangian",
            lines: [
              "T=\\frac12 m\\dot{x}^2",
              "V=\\frac12 kx^2",
              "L(x,\\dot{x})=\\frac12 m\\dot{x}^2-\\frac12 kx^2"
            ]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian",
            lines: [
              "p=m\\dot{x}",
              "H(x,p)=\\frac{p^2}{2m}+\\frac12 kx^2",
              "\\dot{x}=\\frac{\\partial H}{\\partial p},\\quad \\dot{p}=-\\frac{\\partial H}{\\partial x}"
            ]
          }
        ]
      }
    }
  },
  potential1d: {
    subtitle: "User-defined 1D potential V(x)",
    preferredFramework: "lagrangian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Force From Potential",
            lines: [
              "m\\ddot{x}=F(x),\\quad F(x)=-\\frac{dV}{dx}",
              "\\dot{x}=v,\\quad \\dot{v}=-\\frac{1}{m}\\frac{dV}{dx}"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Lagrangian",
            lines: [
              "L(x,\\dot{x})=T-V=\\frac12 m\\dot{x}^2-V(x)",
              "\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{x}}\\right)-\\frac{\\partial L}{\\partial x}=0",
              "m\\ddot{x}+\\frac{dV}{dx}=0"
            ]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian",
            lines: [
              "p=\\frac{\\partial L}{\\partial \\dot{x}}=m\\dot{x}",
              "H(x,p)=\\frac{p^2}{2m}+V(x)",
              "\\dot{x}=\\frac{\\partial H}{\\partial p},\\quad \\dot{p}=-\\frac{\\partial H}{\\partial x}"
            ]
          }
        ]
      }
    }
  },
  blochsphere: {
    subtitle: "Single-qubit evolution shown on the Bloch sphere",
    preferredFramework: "hamiltonian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Bloch-Vector Precession",
            lines: [
              "\\mathbf{s}=\\langle\\boldsymbol{\\sigma}\\rangle,\\quad \\dot{\\mathbf{s}}=\\boldsymbol{\\Omega}\\times\\mathbf{s}",
              "\\boldsymbol{\\Omega}=(\\Omega_x,\\Omega_y,\\Omega_z),\\quad \\|\\mathbf{s}\\|=1\\text{ for pure states}"
            ]
          }
        ],
        footnote: "This is the spin-precession form equivalent to the two-level Schrodinger equation."
      },
      lagrangian: {
        sections: [
          {
            title: "Spin Coherent-State Lagrangian",
            lines: [
              "L=\\frac{\\hbar}{2}(1-\\cos\\theta)\\,\\dot{\\phi}-\\langle\\psi|\\hat{H}|\\psi\\rangle"
            ]
          },
          {
            title: "Effective Hamiltonian Function",
            lines: [
              "\\langle\\hat{H}\\rangle=\\frac12(\\Omega_x s_x+\\Omega_y s_y+\\Omega_z s_z)",
              "s_x=\\sin\\theta\\cos\\phi,\\; s_y=\\sin\\theta\\sin\\phi,\\; s_z=\\cos\\theta"
            ]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Two-Level Hamiltonian",
            lines: [
              "\\hat{H}=\\frac12\\left(\\Omega_x\\sigma_x+\\Omega_y\\sigma_y+\\Omega_z\\sigma_z\\right)",
              "i\\hbar\\,\\partial_t|\\psi\\rangle=\\hat{H}|\\psi\\rangle"
            ]
          },
          {
            title: "State Parameterization",
            lines: [
              "|\\psi\\rangle=a|0\\rangle+b|1\\rangle,\\quad |a|^2+|b|^2=1",
              "s_x=2\\Re(a^*b),\\quad s_y=2\\Im(a^*b),\\quad s_z=|a|^2-|b|^2"
            ]
          },
          {
            title: "Real/Imag Split Used in Solver",
            lines: [
              "a=a_r+i a_i,\\; b=b_r+i b_i,\\; \\dot{\\psi}=-(i/\\hbar)\\hat{H}\\psi",
              "\\dot{a}_r=\\Im[(\\hat{H}\\psi)_0]/\\hbar,\\; \\dot{a}_i=-\\Re[(\\hat{H}\\psi)_0]/\\hbar",
              "\\dot{b}_r=\\Im[(\\hat{H}\\psi)_1]/\\hbar,\\; \\dot{b}_i=-\\Re[(\\hat{H}\\psi)_1]/\\hbar"
            ]
          }
        ]
      }
    }
  },
  twoqubit: {
    subtitle: "Two-qubit pure-state simulator with local drives and ZZ coupling",
    preferredFramework: "hamiltonian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Effective Spin-Precession Picture",
            lines: [
              "\\dot{\\mathbf{s}}_1 \\sim \\boldsymbol{\\Omega}_1\\times\\mathbf{s}_1 + \\text{coupling terms}",
              "\\dot{\\mathbf{s}}_2 \\sim \\boldsymbol{\\Omega}_2\\times\\mathbf{s}_2 + \\text{coupling terms}",
              "\\text{with }\\boldsymbol{\\Omega}_i=(\\Omega_{ix},\\Omega_{iy},\\Omega_{iz})"
            ]
          }
        ],
        footnote: "For two qubits, closed local Bloch equations require correlation tensors in addition to s1 and s2."
      },
      lagrangian: {
        sections: [
          {
            title: "Complex-State Lagrangian",
            lines: [
              "L=\\frac{i\\hbar}{2}(\\langle\\psi|\\dot\\psi\\rangle-\\langle\\dot\\psi|\\psi\\rangle)-\\langle\\psi|\\hat{H}|\\psi\\rangle",
              "|\\psi\\rangle=\\sum_{b\\in\\{00,01,10,11\\}} c_b |b\\rangle"
            ]
          },
          {
            title: "Euler-Lagrange (for c_b^*)",
            lines: ["i\\hbar\\dot{c}_b = \\frac{\\partial\\langle\\psi|\\hat{H}|\\psi\\rangle}{\\partial c_b^*}"]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Two-Qubit Hamiltonian",
            lines: [
              "\\hat{H}=\\frac12\\sum_{k\\in\\{x,y,z\\}}\\Omega_{1k}(\\sigma_k\\otimes I)+\\frac12\\sum_{k\\in\\{x,y,z\\}}\\Omega_{2k}(I\\otimes\\sigma_k)+\\frac{J_{zz}}{4}(\\sigma_z\\otimes\\sigma_z)",
              "i\\hbar\\partial_t|\\psi\\rangle=\\hat{H}|\\psi\\rangle"
            ]
          },
          {
            title: "Entanglement Metrics",
            lines: [
              "C=2\\left|c_{00}c_{11}-c_{01}c_{10}\\right|\\quad\\text{(pure-state concurrence)}",
              "\\rho_A=\\mathrm{Tr}_B\\left(|\\psi\\rangle\\langle\\psi|\\right),\\quad S_A=-\\mathrm{Tr}(\\rho_A\\log_2\\rho_A)"
            ]
          }
        ]
      }
    }
  },
  schrodinger1d: {
    subtitle: "Time-dependent Schrodinger equation in 1D with a Gaussian barrier",
    preferredFramework: "hamiltonian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Classical Limit Intuition",
            lines: [
              "F(x)=-\\frac{dV}{dx},\\quad m\\ddot{x}=F(x)",
              "\\text{(Used only as intuition; evolution here is fully quantum.)}"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Field Lagrangian Density",
            lines: [
              "\\mathcal{L}=\\frac{i}{2}(\\psi^*\\partial_t\\psi-\\psi\\partial_t\\psi^*)-\\frac{1}{2m}|\\partial_x\\psi|^2-V(x)|\\psi|^2"
            ]
          },
          {
            title: "Euler-Lagrange",
            lines: [
              "i\\partial_t\\psi=\\left(-\\frac{1}{2m}\\partial_x^2+V(x)\\right)\\psi"
            ]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian Operator",
            lines: [
              "\\hat{H}=-\\frac{1}{2m}\\partial_x^2+V(x)",
              "i\\partial_t\\psi=\\hat{H}\\psi"
            ]
          },
          {
            title: "Discretized RK4 Evolution",
            lines: [
              "\\dot{\\Re\\psi}= -\\frac{1}{2m}\\partial_x^2\\Im\\psi + V\\Im\\psi - \\gamma(x)\\Re\\psi",
              "\\dot{\\Im\\psi}= +\\frac{1}{2m}\\partial_x^2\\Re\\psi - V\\Re\\psi - \\gamma(x)\\Im\\psi"
            ]
          }
        ],
        footnote: "\\gamma(x) is an absorbing boundary term near domain edges."
      }
    }
  },
  tunneling1d: {
    subtitle: "1D quantum tunneling through single/double barrier with resonant transmission scan",
    preferredFramework: "hamiltonian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Classical Contrast",
            lines: [
              "E<V_0 \\Rightarrow \\text{classically forbidden (no transmission)}",
              "E>V_0 \\Rightarrow \\text{classical crossing possible}"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Field Lagrangian Density",
            lines: [
              "\\mathcal{L}=\\frac{i\\hbar}{2}(\\psi^*\\partial_t\\psi-\\psi\\partial_t\\psi^*)-\\frac{\\hbar^2}{2m}|\\partial_x\\psi|^2-V(x)|\\psi|^2"
            ]
          },
          {
            title: "Euler-Lagrange",
            lines: [
              "i\\hbar\\partial_t\\psi=\\left(-\\frac{\\hbar^2}{2m}\\partial_x^2+V(x)\\right)\\psi"
            ]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian Operator",
            lines: [
              "\\hat{H}=-\\frac{\\hbar^2}{2m}\\partial_x^2+V(x)",
              "i\\hbar\\partial_t\\psi=\\hat{H}\\psi"
            ]
          },
          {
            title: "Barrier Transmission",
            lines: [
              "T(E)=|t(E)|^2,\\quad R(E)=|r(E)|^2,\\quad T+R\\approx 1",
              "\\text{Double barriers can show resonant }T(E)\\text{ peaks.}"
            ]
          },
          {
            title: "Discretized Real/Imag Evolution",
            lines: [
              "\\dot{\\Re\\psi}= -\\frac{\\hbar}{2m}\\partial_x^2\\Im\\psi + \\frac{V(x)}{\\hbar}\\Im\\psi - \\gamma(x)\\Re\\psi",
              "\\dot{\\Im\\psi}= +\\frac{\\hbar}{2m}\\partial_x^2\\Re\\psi - \\frac{V(x)}{\\hbar}\\Re\\psi - \\gamma(x)\\Im\\psi"
            ]
          }
        ],
        footnote: "\\gamma(x) is an absorbing boundary term to suppress numerical edge reflections."
      }
    }
  },
  tightbinding: {
    subtitle: "Discrete lattice hopping model for quantum transport",
    preferredFramework: "hamiltonian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Coupled-Site Amplitude Dynamics",
            lines: [
              "i\\hbar\\dot{\\psi}_n=\\epsilon_n\\psi_n-t(\\psi_{n-1}+\\psi_{n+1})",
              "\\text{Open chain: }\\psi_0,\\psi_{N+1}=0\\quad\\text{or periodic wrap-around.}"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Discrete Complex Field Lagrangian",
            lines: [
              "L=\\sum_n\\left[\\frac{i\\hbar}{2}(\\psi_n^*\\dot{\\psi}_n-\\dot{\\psi}_n^*\\psi_n)-\\epsilon_n|\\psi_n|^2+t(\\psi_n^*\\psi_{n+1}+\\psi_{n+1}^*\\psi_n)\\right]"
            ]
          },
          {
            title: "Euler-Lagrange (for \\psi_n^*)",
            lines: [
              "\\frac{\\partial L}{\\partial \\psi_n^*}-\\frac{d}{dt}\\frac{\\partial L}{\\partial \\dot{\\psi}_n^*}=0\\Rightarrow i\\hbar\\dot{\\psi}_n=\\epsilon_n\\psi_n-t(\\psi_{n-1}+\\psi_{n+1})"
            ]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Tight-Binding Hamiltonian",
            lines: [
              "H=-t\\sum_n\\left(|n\\rangle\\langle n+1|+|n+1\\rangle\\langle n|\\right)+\\sum_n\\epsilon_n|n\\rangle\\langle n|",
              "i\\hbar\\dot{\\boldsymbol{\\psi}}=H\\boldsymbol{\\psi}"
            ]
          },
          {
            title: "Real/Imag Split Used in Solver",
            lines: [
              "\\psi_n=\\Re\\psi_n+i\\Im\\psi_n",
              "\\dot{\\Re\\psi_n}=\\frac{1}{\\hbar}\\Im[(H\\psi)_n],\\quad \\dot{\\Im\\psi_n}=-\\frac{1}{\\hbar}\\Re[(H\\psi)_n]"
            ]
          }
        ],
        footnote: "Disorder is modeled through random onsite energies epsilon_n."
      }
    }
  },
  doubleslit: {
    subtitle: "Double-slit interference as coherent quantum wave superposition",
    preferredFramework: "hamiltonian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Interference Intuition",
            lines: [
              "I(\\theta)\\propto I_1+I_2+2\\sqrt{I_1 I_2}\\cos\\!\\left(\\frac{2\\pi d\\sin\\theta}{\\lambda}+\\phi\\right)",
              "\\text{Central fringe is bright for }\\phi=0\\text{ and dark for }\\phi=\\pi."
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Field Lagrangian Density",
            lines: [
              "\\mathcal{L}=\\frac{i\\hbar}{2}(\\psi^*\\partial_t\\psi-\\psi\\partial_t\\psi^*)-\\frac{\\hbar^2}{2m}|\\partial_x\\psi|^2"
            ]
          },
          {
            title: "Euler-Lagrange",
            lines: [
              "i\\hbar\\partial_t\\psi=-\\frac{\\hbar^2}{2m}\\partial_x^2\\psi"
            ]
          }
        ],
        footnote: "The two-slit setup appears through the initial condition psi(x,0), not through an explicit V(x)."
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian Operator",
            lines: [
              "\\hat{H}=-\\frac{\\hbar^2}{2m}\\partial_x^2,\\quad i\\hbar\\partial_t\\psi=\\hat{H}\\psi"
            ]
          },
          {
            title: "Initial Two-Slit Superposition",
            lines: [
              "\\psi(x,0)\\propto e^{-\\frac{(x+d/2)^2}{4\\sigma^2}}+r\\,e^{i\\phi}e^{-\\frac{(x-d/2)^2}{4\\sigma^2}}",
              "\\dot{\\Re\\psi}= -\\frac{\\hbar}{2m}\\partial_x^2\\Im\\psi-\\gamma(x)\\Re\\psi,\\quad \\dot{\\Im\\psi}= +\\frac{\\hbar}{2m}\\partial_x^2\\Re\\psi-\\gamma(x)\\Im\\psi"
            ]
          }
        ],
        footnote: "\\gamma(x) is a numerical absorbing boundary to reduce edge reflections."
      }
    }
  },
  doubleslit2d: {
    subtitle: "2D Schrodinger propagation through a barrier with two slits",
    preferredFramework: "hamiltonian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Wave-Optics Intuition",
            lines: [
              "I(x)\\propto\\left|\\psi_1(x)+\\psi_2(x)\\right|^2",
              "=\\left|\\psi_1\\right|^2+\\left|\\psi_2\\right|^2+2\\Re\\!\\left(\\psi_1\\psi_2^*\\right)"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Field Lagrangian Density (2D)",
            lines: [
              "\\mathcal{L}=\\frac{i\\hbar}{2}(\\psi^*\\partial_t\\psi-\\psi\\partial_t\\psi^*)-\\frac{\\hbar^2}{2m}\\left(|\\partial_x\\psi|^2+|\\partial_y\\psi|^2\\right)-V(x,y)|\\psi|^2"
            ]
          },
          {
            title: "Euler-Lagrange",
            lines: [
              "i\\hbar\\partial_t\\psi=\\left[-\\frac{\\hbar^2}{2m}(\\partial_x^2+\\partial_y^2)+V(x,y)\\right]\\psi"
            ]
          }
        ],
        footnote: "In this demo, V(x,y) is a thin barrier with two slit openings."
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian Operator",
            lines: [
              "\\hat{H}=-\\frac{\\hbar^2}{2m}(\\partial_x^2+\\partial_y^2)+V(x,y)",
              "i\\hbar\\partial_t\\psi=\\hat{H}\\psi"
            ]
          },
          {
            title: "Discretized Real/Imag Update",
            lines: [
              "\\dot{\\Re\\psi}= -\\frac{\\hbar}{2m}\\nabla^2\\Im\\psi + \\frac{V}{\\hbar}\\Im\\psi - \\gamma(x,y)\\Re\\psi",
              "\\dot{\\Im\\psi}= +\\frac{\\hbar}{2m}\\nabla^2\\Re\\psi - \\frac{V}{\\hbar}\\Re\\psi - \\gamma(x,y)\\Im\\psi"
            ]
          }
        ],
        footnote: "\\gamma(x,y) is an absorbing boundary layer used for numerical stability."
      }
    }
  },
  qftlattice: {
    subtitle: "1+1D scalar field lattice toy model (classical field dynamics inspired by QFT)",
    preferredFramework: "hamiltonian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Lattice Field Equation",
            lines: [
              "\\ddot{\\phi}_i=\\frac{\\phi_{i+1}-2\\phi_i+\\phi_{i-1}}{a^2}-m^2\\phi_i-\\lambda\\phi_i^3-\\eta\\dot{\\phi}_i"
            ]
          },
          {
            title: "First-Order Form",
            lines: [
              "\\dot{\\phi}_i=\\pi_i",
              "\\dot{\\pi}_i=\\nabla_a^2\\phi_i-m^2\\phi_i-\\lambda\\phi_i^3-\\eta\\pi_i"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Discrete Lagrangian",
            lines: [
              "L=\\sum_i a\\left[\\frac12\\dot{\\phi}_i^2-\\frac12\\left(\\frac{\\phi_{i+1}-\\phi_i}{a}\\right)^2-\\frac12 m^2\\phi_i^2-\\frac{\\lambda}{4}\\phi_i^4\\right]"
            ]
          },
          {
            title: "Euler-Lagrange",
            lines: [
              "\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{\\phi}_i}\\right)-\\frac{\\partial L}{\\partial \\phi_i}=0"
            ]
          }
        ],
        footnote: "Damping eta is optional and treated as a non-conservative term."
      },
      hamiltonian: {
        sections: [
          {
            title: "Canonical Variables",
            lines: [
              "\\pi_i=\\frac{\\partial L}{\\partial \\dot{\\phi}_i}=\\dot{\\phi}_i",
              "H=\\sum_i a\\left[\\frac12\\pi_i^2+\\frac12\\left(\\frac{\\phi_{i+1}-\\phi_i}{a}\\right)^2+\\frac12 m^2\\phi_i^2+\\frac{\\lambda}{4}\\phi_i^4\\right]"
            ]
          },
          {
            title: "Hamilton Equations",
            lines: [
              "\\dot{\\phi}_i=\\frac{\\partial H}{\\partial \\pi_i}=\\pi_i",
              "\\dot{\\pi}_i=-\\frac{\\partial H}{\\partial \\phi_i}-\\eta\\pi_i"
            ]
          }
        ],
        footnote: "This is a lattice field-theory toy model; full QFT quantization is not simulated."
      }
    }
  },
  qho1d: {
    subtitle: "1D quantum harmonic oscillator with superposed eigenstates",
    preferredFramework: "hamiltonian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Classical Analog",
            lines: [
              "m\\ddot{x}+m\\omega^2 x=0",
              "\\text{Used only for intuition about centroid motion, not full wave evolution.}"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Field Lagrangian Density",
            lines: [
              "\\mathcal{L}=\\frac{i\\hbar}{2}(\\psi^*\\partial_t\\psi-\\psi\\partial_t\\psi^*)-\\frac{\\hbar^2}{2m}|\\partial_x\\psi|^2-\\frac12 m\\omega^2 x^2|\\psi|^2"
            ]
          },
          {
            title: "Euler-Lagrange",
            lines: [
              "i\\hbar\\partial_t\\psi=\\left(-\\frac{\\hbar^2}{2m}\\partial_x^2+\\frac12 m\\omega^2 x^2\\right)\\psi"
            ]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian Operator",
            lines: [
              "\\hat{H}=-\\frac{\\hbar^2}{2m}\\partial_x^2+\\frac12 m\\omega^2 x^2",
              "i\\hbar\\partial_t\\psi=\\hat{H}\\psi",
              "E_n=\\hbar\\omega\\left(n+\\frac12\\right)"
            ]
          },
          {
            title: "Discretized Real/Imag Evolution",
            lines: [
              "\\dot{\\Re\\psi}= -\\frac{\\hbar}{2m}\\partial_x^2\\Im\\psi + \\frac{V(x)}{\\hbar}\\Im\\psi",
              "\\dot{\\Im\\psi}= +\\frac{\\hbar}{2m}\\partial_x^2\\Re\\psi - \\frac{V(x)}{\\hbar}\\Re\\psi"
            ]
          }
        ]
      }
    }
  },
  muscleactivation: {
    subtitle: "Active spring-mass with activation dynamics and user-defined length-tension curve",
    preferredFramework: "newtonian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "State Dynamics",
            lines: [
              "\\dot{l}=v,\\quad \\dot{a}=\\frac{u-a}{\\tau}",
              "m\\dot{v}=F_{\\mathrm{load}}-F_{\\mathrm{act}}(l,a)-F_{\\mathrm{pas}}(l)-c v",
              "F_{\\mathrm{act}}=aF_{\\max}f_l(l),\\quad F_{\\mathrm{pas}}=k_{\\mathrm{pas}}\\max(0,l-l_{\\mathrm{slack}})"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Conservative Core",
            lines: [
              "L(l,\\dot{l})=\\frac12 m\\dot{l}^2-\\frac12 k_{\\mathrm{pas}}\\max(0,l-l_{\\mathrm{slack}})^2+F_{\\mathrm{load}}l"
            ]
          },
          {
            title: "Generalized Non-Conservative Forces",
            lines: [
              "Q_l=-aF_{\\max}f_l(l)-c\\dot{l}",
              "\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{l}}\\right)-\\frac{\\partial L}{\\partial l}=Q_l"
            ]
          }
        ],
        footnote: "Active muscle force and viscous damping are non-conservative generalized forces."
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian + Input/Activation",
            lines: [
              "p=m\\dot{l},\\quad H(l,p)=\\frac{p^2}{2m}+\\frac12 k_{\\mathrm{pas}}\\max(0,l-l_{\\mathrm{slack}})^2-F_{\\mathrm{load}}l",
              "\\dot{l}=\\frac{\\partial H}{\\partial p},\\quad \\dot{p}=-\\frac{\\partial H}{\\partial l}+Q_l",
              "\\dot{a}=\\frac{u-a}{\\tau}"
            ]
          }
        ],
        footnote: "Activation introduces controlled, non-Hamiltonian forcing."
      }
    }
  },
  skijump: {
    subtitle: "Skier constrained to user-defined hill y = h(x) with kinetic friction",
    preferredFramework: "newtonian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Track-Constrained Dynamics",
            lines: [
              "y=h(x),\\quad \\dot{x}=\\frac{v_t}{\\sqrt{1+(h')^2}}",
              "\\dot{v}_t=-\\frac{g h'(x)}{\\sqrt{1+(h')^2}}-\\frac{\\mu_k g}{\\sqrt{1+(h')^2}}\\,\\operatorname{sgn}(v_t)"
            ]
          },
          {
            title: "Forces Along Tangent",
            lines: [
              "m\\dot{v}_t = mg\\sin\\theta - \\mu_k N\\,\\operatorname{sgn}(v_t)",
              "\\tan\\theta = -h'(x),\\quad N \\approx mg\\cos\\theta"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Conservative Part",
            lines: [
              "L(x,\\dot{x})=\\frac12 m\\left(1+(h')^2\\right)\\dot{x}^2-mgh(x)"
            ]
          },
          {
            title: "Non-Conservative Generalized Force",
            lines: [
              "Q_x = -\\mu_k m g\\frac{\\operatorname{sgn}(\\dot{s})}{\\sqrt{1+(h')^2}}",
              "\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{x}}\\right)-\\frac{\\partial L}{\\partial x}=Q_x"
            ]
          }
        ],
        footnote: "Friction is modeled as kinetic friction along the track tangent."
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian + Dissipation",
            lines: [
              "p_x=m\\left(1+(h')^2\\right)\\dot{x}",
              "H(x,p_x)=\\frac{p_x^2}{2m\\left(1+(h')^2\\right)}+mgh(x)",
              "\\dot{p}_x=-\\frac{\\partial H}{\\partial x}+Q_x"
            ]
          }
        ],
        footnote: "Because Q_x \\neq 0, flow is not purely Hamiltonian."
      }
    }
  },
  chargedparticle: {
    subtitle: "Charged particle in a static electric field (no magnetic field)",
    preferredFramework: "newtonian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Lorentz Force (Electric Only)",
            lines: [
              "m\\ddot{\\mathbf{r}} = q\\mathbf{E}(\\mathbf{r})",
              "\\dot{x}=v_x,\\;\\dot{y}=v_y,\\;\\dot{v}_x=\\frac{q}{m}E_x,\\;\\dot{v}_y=\\frac{q}{m}E_y"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Electrostatic Potential Form",
            lines: [
              "\\mathbf{E}=-\\nabla\\phi(x,y)",
              "L=\\frac12 m(\\dot{x}^2+\\dot{y}^2)-q\\phi(x,y)",
              "\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}_i}\\right)-\\frac{\\partial L}{\\partial q_i}=0"
            ]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian",
            lines: [
              "p_x=m\\dot{x},\\quad p_y=m\\dot{y}",
              "H=\\frac{p_x^2+p_y^2}{2m}+q\\phi(x,y)",
              "\\dot{q}=\\frac{\\partial H}{\\partial p},\\quad \\dot{p}=-\\frac{\\partial H}{\\partial q}"
            ]
          }
        ]
      }
    }
  },
  projectile: {
    subtitle: "Projectile in uniform gravity (no drag)",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Dynamics",
            lines: [
              "m\\ddot{x}=0,\\quad m\\ddot{y}=-mg",
              "\\dot{x}=v_x,\\;\\dot{y}=v_y,\\;\\dot{v}_x=0,\\;\\dot{v}_y=-g"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Lagrangian",
            lines: [
              "L=\\frac12 m(\\dot{x}^2+\\dot{y}^2)-mgy",
              "\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{x}}\\right)-\\frac{\\partial L}{\\partial x}=0",
              "\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{y}}\\right)-\\frac{\\partial L}{\\partial y}=0"
            ]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian",
            lines: [
              "p_x=m\\dot{x},\\quad p_y=m\\dot{y}",
              "H=\\frac{p_x^2+p_y^2}{2m}+mgy",
              "\\dot{p}_x=0,\\quad \\dot{p}_y=-mg"
            ]
          }
        ]
      }
    }
  },
  orbit: {
    subtitle: "Planar two-body central-force model",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Vector Form",
            lines: [
              "\\ddot{\\mathbf{r}}=-\\mu\\,\\frac{\\mathbf{r}}{r^3},\\quad r=\\|\\mathbf{r}\\|",
              "\\dot{x}=v_x,\\;\\dot{y}=v_y,\\;\\dot{v}_x=-\\mu x/r^3,\\;\\dot{v}_y=-\\mu y/r^3"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Polar Coordinates",
            lines: [
              "L(r,\\phi,\\dot{r},\\dot{\\phi})=\\frac12 m(\\dot{r}^2+r^2\\dot{\\phi}^2)+\\frac{\\mu m}{r}",
              "\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{r}}\\right)-\\frac{\\partial L}{\\partial r}=0",
              "\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{\\phi}}\\right)-\\frac{\\partial L}{\\partial \\phi}=0"
            ]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian",
            lines: [
              "p_r=m\\dot{r},\\quad p_{\\phi}=mr^2\\dot{\\phi}",
              "H=\\frac{p_r^2}{2m}+\\frac{p_{\\phi}^2}{2mr^2}-\\frac{\\mu m}{r}",
              "\\dot{p}_{\\phi}=0"
            ]
          }
        ]
      }
    }
  },
  flowfield: {
    subtitle: "Passive tracer in prescribed 2D flow field",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Kinematic Advection",
            lines: [
              "\\dot{x}=u(x,y),\\quad \\dot{y}=v(x,y)",
              "u=u_\\infty+\\frac{Q}{2\\pi}\\frac{x}{r^2}-\\frac{\\Gamma}{2\\pi}\\frac{y}{r^2}",
              "v=v_\\infty+\\frac{Q}{2\\pi}\\frac{y}{r^2}+\\frac{\\Gamma}{2\\pi}\\frac{x}{r^2}",
              "r^2=x^2+y^2+r_c^2"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Streamfunction / Potential View",
            lines: [
              "\\dot{x}=\\frac{\\partial \\psi}{\\partial y},\\quad \\dot{y}=-\\frac{\\partial \\psi}{\\partial x}",
              "\\psi= u_\\infty y + \\frac{Q}{2\\pi}\\arctan\\!\\frac{y}{x} + \\frac{\\Gamma}{4\\pi}\\ln(x^2+y^2)"
            ]
          }
        ],
        footnote: "This demo integrates tracer kinematics in a prescribed flow, rather than particle dynamics from force balance."
      },
      hamiltonian: {
        sections: [
          {
            title: "Canonical Form (2D incompressible)",
            lines: [
              "H(x,y)=\\psi(x,y)",
              "\\dot{x}=\\frac{\\partial H}{\\partial y},\\quad \\dot{y}=-\\frac{\\partial H}{\\partial x}"
            ]
          }
        ],
        footnote: "For steady incompressible flow, tracer paths can be treated as Hamiltonian trajectories with H = streamfunction."
      }
    }
  },
  fluidparticle: {
    subtitle: "Particle through fluid with buoyancy + viscous/inertial drag",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Force Balance",
            lines: [
              "m\\dot{\\mathbf{v}}=\\mathbf{F}_g+\\mathbf{F}_b+\\mathbf{F}_d",
              "\\mathbf{F}_g=(0,-mg),\\quad \\mathbf{F}_b=(0,\\rho_f V g)",
              "\\mathbf{F}_d=-c_1\\mathbf{v}-c_2\\|\\mathbf{v}\\|\\mathbf{v}",
              "c_1=6\\pi\\mu r,\\quad c_2=\\tfrac12\\rho_f C_d A"
            ]
          },
          {
            title: "State-Space Form",
            lines: [
              "\\dot{x}=v_x,\\;\\dot{y}=v_y",
              "\\dot{v}_x=-\\frac{1}{m}(c_1 v_x+c_2\\|\\mathbf{v}\\|v_x)",
              "\\dot{v}_y=-g\\left(1-\\frac{\\rho_f}{\\rho_p}\\right)-\\frac{1}{m}(c_1 v_y+c_2\\|\\mathbf{v}\\|v_y)"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Conservative Part",
            lines: [
              "L=\\tfrac12 m(\\dot{x}^2+\\dot{y}^2)-m g_{\\mathrm{net}} y",
              "g_{\\mathrm{net}}=g\\left(1-\\frac{\\rho_f}{\\rho_p}\\right)"
            ]
          },
          {
            title: "Generalized Dissipation",
            lines: [
              "Q_x=-(c_1 v_x+c_2\\|\\mathbf{v}\\|v_x),\\quad Q_y=-(c_1 v_y+c_2\\|\\mathbf{v}\\|v_y)",
              "\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}_i}\\right)-\\frac{\\partial L}{\\partial q_i}=Q_i"
            ]
          }
        ],
        footnote: "Drag introduces non-conservative generalized forces."
      },
      hamiltonian: {
        sections: [
          {
            title: "Hamiltonian + Damping",
            lines: [
              "p_x=m v_x,\\quad p_y=m v_y",
              "H=\\frac{p_x^2+p_y^2}{2m}+m g_{\\mathrm{net}} y",
              "\\dot{q}=\\frac{\\partial H}{\\partial p},\\quad \\dot{p}=-\\frac{\\partial H}{\\partial q}+Q_{\\mathrm{drag}}(q,p)"
            ]
          }
        ],
        footnote: "With drag, phase-space flow is dissipative (not purely Hamiltonian)."
      }
    }
  },
  cartpole: {
    subtitle: "Frictionless cart-pole with input force u",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "State Dynamics",
            lines: [
              "\\dot{x}=v,\\quad \\dot{\\theta}=\\omega",
              "\\ddot{x}=\\frac{u+m_p\\sin\\theta(l\\dot{\\theta}^2-g\\cos\\theta)}{m_c+m_p\\sin^2\\theta}",
              "\\ddot{\\theta}=\\frac{-u\\cos\\theta-m_p l\\dot{\\theta}^2\\sin\\theta\\cos\\theta+(m_c+m_p)g\\sin\\theta}{l(m_c+m_p\\sin^2\\theta)}"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Matrix Form",
            lines: [
              "q=(x,\\theta)^T,\\quad M(q)\\ddot{q}+C(q,\\dot{q})+G(q)=Bu",
              "M(q)=\\begin{bmatrix}m_c+m_p & m_p l\\cos\\theta\\\\m_p l\\cos\\theta & m_p l^2\\end{bmatrix}"
            ]
          },
          {
            title: "Energy",
            lines: [
              "T=\\frac12(m_c+m_p)\\dot{x}^2+m_p l\\dot{x}\\dot{\\theta}\\cos\\theta+\\frac12 m_p l^2\\dot{\\theta}^2",
              "V=m_p g l\\cos\\theta,\\quad L=T-V"
            ]
          }
        ],
        footnote: "Input force u creates a forced Lagrangian system."
      },
      hamiltonian: {
        sections: [
          {
            title: "Forced Hamiltonian",
            lines: [
              "p=\\frac{\\partial L}{\\partial \\dot{q}}=M(q)\\dot{q}",
              "H(q,p)=\\frac12 p^T M(q)^{-1}p+V(q)",
              "\\dot{q}=\\frac{\\partial H}{\\partial p},\\quad \\dot{p}=-\\frac{\\partial H}{\\partial q}+Bu"
            ]
          }
        ]
      }
    }
  },
  doublependulum: {
    subtitle: "Planar double pendulum",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "State Kinematics",
            lines: [
              "\\dot{\\theta}_1=\\omega_1,\\quad \\dot{\\theta}_2=\\omega_2",
              "\\dot{\\omega}_1=f_1(\\theta_1,\\theta_2,\\omega_1,\\omega_2)",
              "\\dot{\\omega}_2=f_2(\\theta_1,\\theta_2,\\omega_1,\\omega_2)"
            ]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Lagrangian",
            lines: [
              "T=\\frac12 m_1 l_1^2\\omega_1^2+\\frac12 m_2\\left(l_1^2\\omega_1^2+l_2^2\\omega_2^2+2l_1l_2\\omega_1\\omega_2\\cos(\\theta_1-\\theta_2)\\right)",
              "V=-(m_1+m_2)gl_1\\cos\\theta_1-m_2gl_2\\cos\\theta_2",
              "L=T-V"
            ]
          },
          {
            title: "Euler-Lagrange",
            lines: ["\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{\\theta}_i}\\right)-\\frac{\\partial L}{\\partial \\theta_i}=0,\\quad i\\in\\{1,2\\}"]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Canonical Form",
            lines: [
              "p_i=\\frac{\\partial L}{\\partial \\dot{\\theta}_i}",
              "H(q,p)=\\frac12 p^T M(q)^{-1}p+V(q)",
              "\\dot{q}=\\frac{\\partial H}{\\partial p},\\quad \\dot{p}=-\\frac{\\partial H}{\\partial q}"
            ]
          }
        ]
      }
    }
  },
  brachistochrone: {
    subtitle: "Calculus of variations example solved numerically",
    preferredFramework: "lagrangian",
    frameworks: {
      newtonian: {
        sections: [
          {
            title: "Energy-Speed Relation",
            lines: ["v(y)=\\sqrt{2g(y-y_0)}"]
          },
          {
            title: "Travel Time Along Curve",
            lines: ["T=\\int_{x_0}^{x_1} \\frac{\\sqrt{1+(y')^2}}{\\sqrt{2g(y-y_0)}}\\,dx"]
          }
        ]
      },
      lagrangian: {
        sections: [
          {
            title: "Variational Functional",
            lines: [
              "\\mathcal{J}[y]=\\int_{x_0}^{x_1} F(y,y')\\,dx,\\quad F(y,y')=\\frac{\\sqrt{1+(y')^2}}{\\sqrt{2g(y-y_0)}}"
            ]
          },
          {
            title: "Euler-Lagrange",
            lines: ["\\frac{d}{dx}\\left(\\frac{\\partial F}{\\partial y'}\\right)-\\frac{\\partial F}{\\partial y}=0"]
          },
          {
            title: "Discrete Solver Used",
            lines: [
              "J(\\mathbf{y})=T_{\\text{discrete}}(\\mathbf{y})+\\lambda\\sum_i (y_{i+1}-2y_i+y_{i-1})^2",
              "y_i \\leftarrow \\Pi\\left(y_i-\\alpha\\,\\frac{\\partial J}{\\partial y_i}\\right)"
            ]
          }
        ]
      },
      hamiltonian: {
        sections: [
          {
            title: "Beltrami / Hamilton-Like Invariant",
            lines: [
              "p=\\frac{\\partial F}{\\partial y'}",
              "H_x=y'\\,p-F=\\text{const}",
              "F-y'\\frac{\\partial F}{\\partial y'}=\\text{const}"
            ]
          }
        ],
        footnote: "In this app, brachistochrone is treated primarily as a variational problem."
      }
    }
  }
};

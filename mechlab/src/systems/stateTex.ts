const globalStateTexByKey: Record<string, string> = {
  x: "x",
  y: "y",
  v: "v",
  vx: "v_x",
  vy: "v_y",
  l: "l",
  a: "a",
  theta: "\\theta",
  omega: "\\omega",
  theta1: "\\theta_1",
  omega1: "\\omega_1",
  theta2: "\\theta_2",
  omega2: "\\omega_2",
  xdot: "\\dot{x}",
  thetadot: "\\dot{\\theta}",
  v_t: "v_t"
};

const systemStateTexOverrides: Record<string, Record<string, string>> = {};

export function getStateTexLabel(systemId: string | null, key: string): string | null {
  const override = systemId ? systemStateTexOverrides[systemId]?.[key] : undefined;
  if (typeof override === "string") {
    return override || null;
  }

  return globalStateTexByKey[key] ?? null;
}

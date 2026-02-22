const globalStateTexByKey: Record<string, string> = {
  x: "x",
  x1: "x_1",
  x2: "x_2",
  y: "y",
  y1: "y_1",
  y2: "y_2",
  v: "v",
  vx: "v_x",
  vx1: "v_{x1}",
  vx2: "v_{x2}",
  vy: "v_y",
  vy1: "v_{y1}",
  vy2: "v_{y2}",
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

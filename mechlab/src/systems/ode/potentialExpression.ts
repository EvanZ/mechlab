import { Parser } from "expr-eval";

export const defaultPotentialExpression = "0.5 * x^2";

type PotentialEvaluator = (x: number) => number;

const parser = new Parser({
  operators: {
    comparison: false,
    logical: false,
    in: false,
    assignment: false
  }
});

let activeExpression = defaultPotentialExpression;
let activeEvaluator = compilePotentialExpression(defaultPotentialExpression);

function ensureFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} is not finite for the current V(x) expression.`);
  }
  return value;
}

export function compilePotentialExpression(expression: string): PotentialEvaluator {
  const trimmed = expression.trim();
  if (!trimmed) {
    throw new Error("V(x) cannot be empty.");
  }

  let parsed;
  try {
    parsed = parser.parse(trimmed);
  } catch (error) {
    throw new Error(error instanceof Error ? `Invalid V(x): ${error.message}` : "Invalid V(x) expression.");
  }

  const variables = parsed.variables({ withMembers: true });
  const invalidVariables = variables.filter((name) => name !== "x");
  if (invalidVariables.length > 0) {
    throw new Error(`V(x) may only use variable x (found: ${invalidVariables.join(", ")}).`);
  }

  return (x: number) => {
    const value = parsed.evaluate({ x });
    if (typeof value !== "number") {
      throw new Error("V(x) did not evaluate to a numeric value.");
    }
    return ensureFinite(value, "V(x)");
  };
}

export function setActivePotentialExpression(expression: string): void {
  const next = compilePotentialExpression(expression);
  activeEvaluator = next;
  activeExpression = expression.trim();
}

export function getActivePotentialExpression(): string {
  return activeExpression;
}

export function evaluateActivePotential(x: number): number {
  return activeEvaluator(x);
}

export function evaluateActivePotentialGradient(x: number, step: number): number {
  const h = Math.max(1e-6, Math.abs(step));
  const vPlus = activeEvaluator(x + h);
  const vMinus = activeEvaluator(x - h);
  return ensureFinite((vPlus - vMinus) / (2 * h), "dV/dx");
}

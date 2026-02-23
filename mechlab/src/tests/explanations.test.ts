import { describe, expect, it } from "vitest";
import { getDemoExplanation } from "../systems/explanations";
import { listSystems } from "../systems/systems";

describe("demo explanation coverage", () => {
  it("provides ELI5 and grad explanations for all registered systems", () => {
    for (const system of listSystems()) {
      const explanation = getDemoExplanation(system.id);

      expect(explanation, `Missing explanation for system ${system.id}`).not.toBeNull();
      expect(explanation?.eli5.length ?? 0, `Missing ELI5 text for ${system.id}`).toBeGreaterThan(0);
      expect(explanation?.grad.length ?? 0, `Missing grad text for ${system.id}`).toBeGreaterThan(0);
    }
  });
});

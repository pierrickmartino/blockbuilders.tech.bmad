import { describe, it, expect } from "vitest";
import { computeRollup } from "../readiness-rollup";
import type { HealthBarState } from "../health-bar-evaluator";

describe("computeRollup", () => {
  it("returns ready when all segments are complete", () => {
    const state: HealthBarState = { entry: "complete", exit: "complete", risk: "complete" };
    expect(computeRollup(state)).toBe("ready");
  });

  it("returns issue when entry is incomplete", () => {
    const state: HealthBarState = { entry: "incomplete", exit: "complete", risk: "complete" };
    expect(computeRollup(state)).toBe("issue");
  });

  it("returns issue when exit is incomplete", () => {
    const state: HealthBarState = { entry: "complete", exit: "incomplete", risk: "complete" };
    expect(computeRollup(state)).toBe("issue");
  });

  it("returns issue when risk is incomplete", () => {
    const state: HealthBarState = { entry: "complete", exit: "complete", risk: "incomplete" };
    expect(computeRollup(state)).toBe("issue");
  });

  it("returns warning when any segment is warning and none are incomplete", () => {
    const state: HealthBarState = { entry: "complete", exit: "complete", risk: "warning" };
    expect(computeRollup(state)).toBe("warning");
  });

  it("returns issue over warning when both are present", () => {
    const state: HealthBarState = { entry: "incomplete", exit: "complete", risk: "warning" };
    expect(computeRollup(state)).toBe("issue");
  });

  it("returns warning for the canonical no-risk-block strategy (entry+exit complete, risk warning)", () => {
    const state: HealthBarState = { entry: "complete", exit: "complete", risk: "warning" };
    expect(computeRollup(state)).toBe("warning");
  });
});

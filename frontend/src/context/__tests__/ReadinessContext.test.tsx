import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReadinessProvider, useReadiness } from "../ReadinessContext";
import type { Node, Edge } from "@xyflow/react";

function ReadinessDisplay() {
  const { rollup, segments } = useReadiness();
  return (
    <div>
      <span data-testid="rollup">{rollup}</span>
      <span data-testid="entry">{segments.entry}</span>
      <span data-testid="exit">{segments.exit}</span>
      <span data-testid="risk">{segments.risk}</span>
    </div>
  );
}

const completeNodes: Node[] = [
  { id: "es1", type: "entry_signal", position: { x: 0, y: 0 }, data: {} },
  { id: "xs1", type: "exit_signal", position: { x: 0, y: 0 }, data: {} },
  { id: "r1", type: "stop_loss", position: { x: 0, y: 0 }, data: {} },
  { id: "logic1", type: "logic", position: { x: 0, y: 0 }, data: {} },
];
const completeEdges: Edge[] = [
  { id: "e1", source: "logic1", target: "es1" },
  { id: "e2", source: "logic1", target: "xs1" },
];

const noRiskNodes: Node[] = [
  { id: "es1", type: "entry_signal", position: { x: 0, y: 0 }, data: {} },
  { id: "xs1", type: "exit_signal", position: { x: 0, y: 0 }, data: {} },
  { id: "logic1", type: "logic", position: { x: 0, y: 0 }, data: {} },
];
const noRiskEdges: Edge[] = [
  { id: "e1", source: "logic1", target: "es1" },
  { id: "e2", source: "logic1", target: "xs1" },
];

describe("ReadinessContext", () => {
  it("provides ready rollup for a fully wired strategy", () => {
    render(
      <ReadinessProvider nodes={completeNodes} edges={completeEdges}>
        <ReadinessDisplay />
      </ReadinessProvider>
    );
    expect(screen.getByTestId("rollup").textContent).toBe("ready");
    expect(screen.getByTestId("entry").textContent).toBe("complete");
    expect(screen.getByTestId("exit").textContent).toBe("complete");
    expect(screen.getByTestId("risk").textContent).toBe("complete");
  });

  it("provides warning rollup for a strategy with no risk block", () => {
    render(
      <ReadinessProvider nodes={noRiskNodes} edges={noRiskEdges}>
        <ReadinessDisplay />
      </ReadinessProvider>
    );
    expect(screen.getByTestId("rollup").textContent).toBe("warning");
    expect(screen.getByTestId("risk").textContent).toBe("warning");
  });

  it("provides issue rollup for a strategy with no entry signal", () => {
    render(
      <ReadinessProvider nodes={[]} edges={[]}>
        <ReadinessDisplay />
      </ReadinessProvider>
    );
    expect(screen.getByTestId("rollup").textContent).toBe("issue");
    expect(screen.getByTestId("entry").textContent).toBe("incomplete");
  });

  it("throws when useReadiness is called outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ReadinessDisplay />)).toThrow();
    spy.mockRestore();
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BaseNode from "../BaseNode";
import { ReadinessProvider } from "@/context/ReadinessContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Node, Edge } from "@xyflow/react";

const readyNodes: Node[] = [
  { id: "es1", type: "entry_signal", position: { x: 0, y: 0 }, data: {} },
  { id: "xs1", type: "exit_signal", position: { x: 0, y: 0 }, data: {} },
  { id: "r1", type: "stop_loss", position: { x: 0, y: 0 }, data: {} },
  { id: "logic1", type: "logic", position: { x: 0, y: 0 }, data: {} },
];
const readyEdges: Edge[] = [
  { id: "e1", source: "logic1", target: "es1" },
  { id: "e2", source: "logic1", target: "xs1" },
];

function renderInProvider(
  ui: React.ReactElement,
  nodes: Node[] = readyNodes,
  edges: Edge[] = readyEdges
) {
  return render(
    <TooltipProvider>
      <ReadinessProvider nodes={nodes} edges={edges}>
        {ui}
      </ReadinessProvider>
    </TooltipProvider>
  );
}

describe("BaseNode readiness dot", () => {
  it("renders a readiness dot for a normal functional node", () => {
    renderInProvider(
      <BaseNode label="My Signal" selected={false} category="signal" />
    );
    expect(screen.getByRole("status", { name: /readiness/i })).toBeInTheDocument();
  });

  it("suppresses the readiness dot when hasError is true", () => {
    renderInProvider(
      <BaseNode label="Bad Node" selected={false} category="signal" hasError />
    );
    expect(screen.queryByRole("status", { name: /readiness/i })).not.toBeInTheDocument();
  });

  it("suppresses the readiness dot when hideReadiness is true", () => {
    renderInProvider(
      <BaseNode label="Note" selected={false} category="input" hideReadiness />
    );
    expect(screen.queryByRole("status", { name: /readiness/i })).not.toBeInTheDocument();
  });

  it("renders a green dot when rollup is ready", () => {
    renderInProvider(
      <BaseNode label="My Signal" selected={false} category="signal" />,
      readyNodes,
      readyEdges
    );
    const dot = screen.getByRole("status", { name: /readiness/i });
    expect(dot.className).toMatch(/emerald/);
  });

  it("renders an amber dot when rollup is warning (no risk block)", () => {
    const noRiskNodes: Node[] = [
      { id: "es1", type: "entry_signal", position: { x: 0, y: 0 }, data: {} },
      { id: "xs1", type: "exit_signal", position: { x: 0, y: 0 }, data: {} },
      { id: "logic1", type: "logic", position: { x: 0, y: 0 }, data: {} },
    ];
    const noRiskEdges: Edge[] = [
      { id: "e1", source: "logic1", target: "es1" },
      { id: "e2", source: "logic1", target: "xs1" },
    ];
    renderInProvider(
      <BaseNode label="My Signal" selected={false} category="signal" />,
      noRiskNodes,
      noRiskEdges
    );
    const dot = screen.getByRole("status", { name: /readiness/i });
    expect(dot.className).toMatch(/amber/);
  });

  it("renders a red dot when rollup is issue (no entry signal)", () => {
    renderInProvider(
      <BaseNode label="My Node" selected={false} category="input" />,
      [],
      []
    );
    const dot = screen.getByRole("status", { name: /readiness/i });
    expect(dot.className).toMatch(/rose/);
  });
});

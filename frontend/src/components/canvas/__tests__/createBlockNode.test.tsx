import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReadinessProvider } from "@/context/ReadinessContext";
import { BLOCK_REGISTRY } from "@/types/canvas";
import type { Node, Edge } from "@xyflow/react";

// Mock xyflow so handles render as inspectable divs without needing RF store
vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type: handleType }: { id: string; type: string }) => (
    <div data-testid="rf-handle" data-handleid={id} data-handletype={handleType} />
  ),
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNodeId: () => "test-node-id",
}));

const emptyNodes: Node[] = [];
const emptyEdges: Edge[] = [];

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <ReadinessProvider nodes={emptyNodes} edges={emptyEdges}>
        {children}
      </ReadinessProvider>
    </TooltipProvider>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderNode(Component: React.ComponentType<any>, data: Record<string, unknown> = {}) {
  return render(
    <Providers>
      <Component data={data} selected={false} />
    </Providers>
  );
}

// Deferred import so mock is in place before module loads
async function getFactory() {
  const { createBlockNode, distributeHandleY, CATEGORY_HANDLE_COLOR } = await import(
    "../createBlockNode"
  );
  return { createBlockNode, distributeHandleY, CATEGORY_HANDLE_COLOR };
}

describe("distributeHandleY", () => {
  it("returns [50] for count 1", async () => {
    const { distributeHandleY } = await getFactory();
    expect(distributeHandleY(1)).toEqual([50]);
  });

  it("returns [38, 66] for count 2", async () => {
    const { distributeHandleY } = await getFactory();
    expect(distributeHandleY(2)).toEqual([38, 66]);
  });

  it("returns [32, 52, 72] for count 3", async () => {
    const { distributeHandleY } = await getFactory();
    expect(distributeHandleY(3)).toEqual([32, 52, 72]);
  });

  it("returns [24, 42, 60, 78] for count 4", async () => {
    const { distributeHandleY } = await getFactory();
    expect(distributeHandleY(4)).toEqual([24, 42, 60, 78]);
  });

  it("returns [22, 37, 52, 67, 82] for count 5", async () => {
    const { distributeHandleY } = await getFactory();
    expect(distributeHandleY(5)).toEqual([22, 37, 52, 67, 82]);
  });
});

describe("CATEGORY_HANDLE_COLOR", () => {
  it("covers all five categories", async () => {
    const { CATEGORY_HANDLE_COLOR } = await getFactory();
    const categories = ["input", "indicator", "logic", "signal", "risk"] as const;
    for (const cat of categories) {
      expect(CATEGORY_HANDLE_COLOR[cat]).toBeDefined();
    }
  });
});

describe("createBlockNode — registry lookup", () => {
  it("uses registry label as default node label", async () => {
    const { createBlockNode } = await getFactory();
    const EmaNode = createBlockNode("ema");
    renderNode(EmaNode);
    expect(screen.getByText("EMA")).toBeInTheDocument();
  });

  it("allows data.label to override the registry label", async () => {
    const { createBlockNode } = await getFactory();
    const EmaNode = createBlockNode("ema");
    renderNode(EmaNode, { label: "My EMA" });
    expect(screen.getByText("My EMA")).toBeInTheDocument();
  });

  it("assigns displayName derived from type", async () => {
    const { createBlockNode } = await getFactory();
    const EmaNode = createBlockNode("ema");
    expect(EmaNode.displayName).toBe("EmaNode");
  });

  it("assigns PascalCase displayName for snake_case types", async () => {
    const { createBlockNode } = await getFactory();
    const Node = createBlockNode("entry_signal");
    expect(Node.displayName).toBe("EntrySignalNode");
  });
});

describe("createBlockNode — default param-list rendering", () => {
  it("renders each defaultParam key as a row with title-cased label", async () => {
    const { createBlockNode } = await getFactory();
    const EmaNode = createBlockNode("ema");
    renderNode(EmaNode);
    expect(screen.getByText(/Source:/)).toBeInTheDocument();
    expect(screen.getByText(/Period:/)).toBeInTheDocument();
  });

  it("falls back to defaultParams value when params key is absent (??)", async () => {
    const { createBlockNode } = await getFactory();
    const EmaNode = createBlockNode("ema");
    // No params provided; registry defaults are { source: "close", period: 20 }
    renderNode(EmaNode, { params: {} });
    expect(screen.getByText(/Source: close/)).toBeInTheDocument();
    expect(screen.getByText(/Period: 20/)).toBeInTheDocument();
  });

  it("renders 0 as '0' rather than falling back to default (?? not ||)", async () => {
    const { createBlockNode } = await getFactory();
    const EmaNode = createBlockNode("ema");
    // period=0 is falsy; || would show "20", ?? correctly shows "0"
    renderNode(EmaNode, { params: { source: "close", period: 0 } });
    expect(screen.getByText(/Period: 0/)).toBeInTheDocument();
  });

  it("uses paramLabels override when provided", async () => {
    const { createBlockNode } = await getFactory();
    const EmaNode = createBlockNode("ema", { paramLabels: { period: "Lookback" } });
    renderNode(EmaNode);
    expect(screen.getByText(/Lookback:/)).toBeInTheDocument();
    expect(screen.queryByText(/Period:/)).not.toBeInTheDocument();
  });

  it("renders no param rows when defaultParams is empty", async () => {
    const { createBlockNode } = await getFactory();
    // 'and' block has no defaultParams
    const AndNode = createBlockNode("and");
    const { container } = renderNode(AndNode);
    // No "key: value" rows expected
    expect(container.querySelectorAll(".space-y-0\\.5")).toHaveLength(0);
  });
});

describe("createBlockNode — body escape hatch", () => {
  it("renders custom body when body option is provided", async () => {
    const { createBlockNode } = await getFactory();
    const EmaNode = createBlockNode("ema", {
      body: () => <div>custom body content</div>,
    });
    renderNode(EmaNode);
    expect(screen.getByText("custom body content")).toBeInTheDocument();
  });

  it("suppresses default param rows when custom body is provided", async () => {
    const { createBlockNode } = await getFactory();
    const EmaNode = createBlockNode("ema", {
      body: () => <div>custom body</div>,
    });
    renderNode(EmaNode);
    expect(screen.queryByText(/Source:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Period:/)).not.toBeInTheDocument();
  });
});

describe("createBlockNode — handle count from registry", () => {
  it("renders the correct number of output handles for EMA (1 output)", async () => {
    const { createBlockNode } = await getFactory();
    const EmaNode = createBlockNode("ema");
    const { container } = renderNode(EmaNode);
    const sourceHandles = container.querySelectorAll('[data-handletype="source"]');
    expect(sourceHandles).toHaveLength(1);
  });

  it("renders correct input + output handles for a node with both", async () => {
    const { createBlockNode } = await getFactory();
    // compare: inputs=["left","right"], outputs=["output"] → 2 target + 1 source
    const CompareNode = createBlockNode("compare");
    const { container } = renderNode(CompareNode);
    expect(container.querySelectorAll('[data-handletype="target"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-handletype="source"]')).toHaveLength(1);
  });
});

describe("migrated node acceptance criteria", () => {
  it("ConstantNode with value=0 displays 'Value: 0' (not the registry default)", async () => {
    const { nodeTypes } = await import("../nodes");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Component = nodeTypes["constant"] as React.ComponentType<any>;
    renderNode(Component, { params: { value: 0 } });
    expect(screen.getByText(/Value: 0/)).toBeInTheDocument();
  });

  it("FibonacciNode renders 5 output handles", async () => {
    const { nodeTypes } = await import("../nodes");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Component = nodeTypes["fibonacci"] as React.ComponentType<any>;
    const { container } = renderNode(Component);
    expect(container.querySelectorAll('[data-handletype="source"]')).toHaveLength(5);
  });

  it("MacdNode uses abbreviated param labels (Fast/Slow/Signal), not title-cased (Fast Period/...)", async () => {
    const { nodeTypes } = await import("../nodes");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Component = nodeTypes["macd"] as React.ComponentType<any>;
    renderNode(Component);
    expect(screen.getByText(/Fast:/)).toBeInTheDocument();
    expect(screen.getByText(/Slow:/)).toBeInTheDocument();
    expect(screen.getByText(/Signal:/)).toBeInTheDocument();
    expect(screen.queryByText(/Fast Period:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Slow Period:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Signal Period:/)).not.toBeInTheDocument();
  });

  it("IchimokuNode uses abbreviated labels Conv/Displ (not Conversion/Displacement)", async () => {
    const { nodeTypes } = await import("../nodes");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Component = nodeTypes["ichimoku"] as React.ComponentType<any>;
    renderNode(Component);
    expect(screen.getByText(/Conv:/)).toBeInTheDocument();
    expect(screen.getByText(/Displ:/)).toBeInTheDocument();
    expect(screen.queryByText(/Conversion:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Displacement:/)).not.toBeInTheDocument();
  });
});

describe("nodeSmoke — all BLOCK_REGISTRY entries render without throw", () => {
  const registryEntries = BLOCK_REGISTRY.filter(
    // NoteNode is a free-form text block excluded from the registry smoke test;
    // it has special rendering that does not follow the standard handle/param pattern.
    (b) => b.type !== "note"
  );

  for (const meta of registryEntries) {
    it(`${meta.type} renders without throw and has expected handle count`, async () => {
      const { nodeTypes } = await import("../nodes");
      // Cast to any: NodeProps requires many RF fields not needed for render testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Component = nodeTypes[meta.type as keyof typeof nodeTypes] as React.ComponentType<any>;
      expect(Component).toBeDefined();

      const expectedHandles = meta.inputs.length + meta.outputs.length;

      let container: HTMLElement | undefined;
      expect(() => {
        const result = render(
          <Providers>
            <Component data={{}} selected={false} />
          </Providers>
        );
        container = result.container;
      }).not.toThrow();

      if (container && expectedHandles > 0) {
        const handles = container.querySelectorAll('[data-handleid]');
        expect(handles.length).toBe(expectedHandles);
      }
    });
  }
});

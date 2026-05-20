import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommandPalette from "../CommandPalette";
import type { Node } from "@xyflow/react";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/block-library-storage", () => ({
  getRecentBlocks: vi.fn(() => []),
  getFavoriteBlocks: vi.fn(() => []),
  trackRecentBlock: vi.fn(),
}));

vi.mock("@/lib/canvas-utils", () => ({
  generateBlockId: vi.fn((type: string) => `${type}-test-id`),
}));

const mockScreenToFlowPosition = vi.fn(({ x, y }: { x: number; y: number }) => ({
  x: x + 10,
  y: y + 10,
}));

const mockReactFlowInstance = {
  screenToFlowPosition: mockScreenToFlowPosition,
  getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
};

function setup(open = true) {
  const onAddNode = vi.fn();
  const setOpen = vi.fn();

  render(
    <CommandPalette
      open={open}
      onOpenChange={setOpen}
      onAddNode={onAddNode}
      reactFlowInstance={mockReactFlowInstance as never}
    />
  );

  return { onAddNode, setOpen };
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 768, configurable: true });
  });

  it("renders a dialog with accessible title when open", () => {
    setup();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText("Insert node", { selector: "*" })
    ).toBeInTheDocument();
  });

  it("shows category group headings", () => {
    setup();
    const headings = Array.from(
      document.querySelectorAll("[cmdk-group-heading]")
    ).map((el) => el.textContent?.trim());
    expect(headings).toContain("Data");
    expect(headings).toContain("Indicators");
    expect(headings).toContain("Logic");
    expect(headings).toContain("Signals");
    expect(headings).toContain("Risk");
  });

  it("renders an accessible live region for result count", () => {
    setup();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("calls onAddNode with a node payload when an item is selected", async () => {
    const { onAddNode } = setup();
    const items = screen.getAllByRole("option");
    fireEvent.click(items[0]);
    expect(onAddNode).toHaveBeenCalledOnce();
    const node: Node = onAddNode.mock.calls[0][0];
    expect(node).toHaveProperty("id");
    expect(node).toHaveProperty("type");
    expect(node).toHaveProperty("position");
    expect(node.position).toHaveProperty("x");
    expect(node.position).toHaveProperty("y");
  });

  it("calls trackRecentBlock on insert", async () => {
    const { trackRecentBlock } = await import("@/lib/block-library-storage");
    setup();
    const items = screen.getAllByRole("option");
    fireEvent.click(items[0]);
    expect(trackRecentBlock).toHaveBeenCalledOnce();
  });

  it("fires bb.canvas.palette.inserted telemetry on insert", async () => {
    const { trackEvent } = await import("@/lib/analytics");
    setup();
    const items = screen.getAllByRole("option");
    fireEvent.click(items[0]);
    expect(trackEvent).toHaveBeenCalledWith(
      "bb.canvas.palette.inserted",
      expect.objectContaining({
        block_type: expect.any(String),
        category: expect.any(String),
        source: expect.any(String),
      })
    );
  });

  it("fires bb.canvas.palette.dismissed telemetry on Escape", async () => {
    const user = userEvent.setup();
    const { trackEvent } = await import("@/lib/analytics");
    const { setOpen } = setup();
    await user.keyboard("{Escape}");
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(trackEvent).toHaveBeenCalledWith(
      "bb.canvas.palette.dismissed",
      expect.objectContaining({
        had_query: expect.any(Boolean),
        query_length: expect.any(Number),
        result_count: expect.any(Number),
      })
    );
  });

  it("filters items as user types in the search input", async () => {
    const user = userEvent.setup();
    setup();

    const input = screen.getByRole("combobox");
    await user.type(input, "rsi");

    const items = screen.getAllByRole("option");
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(30);
  });

  it("does not render when open=false", () => {
    setup(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("inserts node at a position derived from screen center + jitter", () => {
    const { onAddNode } = setup();
    const items = screen.getAllByRole("option");
    fireEvent.click(items[0]);

    const node: Node = onAddNode.mock.calls[0][0];
    expect(mockScreenToFlowPosition).toHaveBeenCalled();
    expect(node.position.x).toBeDefined();
    expect(node.position.y).toBeDefined();
  });
});

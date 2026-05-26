import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { Node } from "@xyflow/react";
import { CanvasStateProvider, useCanvasState } from "../CanvasStateContext";

const makeNode = (id: string): Node =>
  ({ id, type: "sma", position: { x: 0, y: 0 }, data: { params: {} } }) as Node;

function StateDisplay() {
  const { state, canUndo } = useCanvasState();
  return (
    <div>
      <span data-testid="node-count">{state.nodes.length}</span>
      <span data-testid="can-undo">{String(canUndo)}</span>
    </div>
  );
}

function DispatchButtons() {
  const { dispatch } = useCanvasState();
  return (
    <>
      <button
        data-testid="add"
        onClick={() => dispatch({ type: "ADD_NODE", payload: makeNode("n1") })}
      >
        add
      </button>
      <button
        data-testid="delete"
        onClick={() => dispatch({ type: "DELETE_NODE", payload: "n1" })}
      >
        delete
      </button>
      <button data-testid="undo" onClick={() => dispatch({ type: "UNDO" })}>
        undo
      </button>
    </>
  );
}

function TestApp({ onStable }: { onStable?: () => void }) {
  return (
    <CanvasStateProvider onStable={onStable}>
      <StateDisplay />
      <DispatchButtons />
    </CanvasStateProvider>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("CanvasStateContext", () => {
  it("provides initial empty state", () => {
    render(<TestApp />);
    expect(screen.getByTestId("node-count").textContent).toBe("0");
  });

  it("exposes dispatch that updates state", () => {
    render(<TestApp />);
    act(() => screen.getByTestId("add").click());
    expect(screen.getByTestId("node-count").textContent).toBe("1");
  });

  it("throws when useCanvasState is used outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<StateDisplay />)).toThrow();
    spy.mockRestore();
  });

  it("calls onStable after canvas stabilises", async () => {
    vi.useFakeTimers();
    const onStable = vi.fn();
    render(<TestApp onStable={onStable} />);

    act(() => screen.getByTestId("add").click());
    // Advance past the 10s stable delay
    await act(async () => { vi.advanceTimersByTime(11_000); });

    expect(onStable).toHaveBeenCalled();
  });

  it("restores a node after ADD_NODE → DELETE_NODE → UNDO", async () => {
    vi.useFakeTimers();
    render(<TestApp />);

    // ADD_NODE: nodes = [n1]
    act(() => screen.getByTestId("add").click());
    // Let history snapshot debounce fire (500ms)
    await act(async () => { vi.advanceTimersByTime(600); });

    // DELETE_NODE: nodes = []
    act(() => screen.getByTestId("delete").click());
    // Let history snapshot for deleted state fire
    await act(async () => { vi.advanceTimersByTime(600); });

    expect(screen.getByTestId("node-count").textContent).toBe("0");

    // UNDO: should restore to nodes = [n1]
    act(() => screen.getByTestId("undo").click());

    expect(screen.getByTestId("node-count").textContent).toBe("1");
  });

  it("exposes canUndo that becomes true after a committed snapshot", async () => {
    vi.useFakeTimers();
    render(<TestApp />);

    expect(screen.getByTestId("can-undo").textContent).toBe("false");

    // Let the initial empty snapshot commit so it becomes history.present
    await act(async () => { vi.advanceTimersByTime(600); });

    act(() => screen.getByTestId("add").click());
    // The prior empty snapshot is now pushed to past; undo becomes available once
    // the new snapshot debounce fires and the history state updates
    await act(async () => { vi.advanceTimersByTime(600); });

    expect(screen.getByTestId("can-undo").textContent).toBe("true");
  });
});

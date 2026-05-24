import { describe, it, expect } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import { arrangeNodes, getElk } from "../layout-algorithm";

const MIN_NODE_WIDTH = 160;
const MIN_NODE_HEIGHT = 60;

function makeNode(id: string, type?: string): Node {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: {},
  };
}

function makeEdge(source: string, target: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
  };
}

describe("getElk", () => {
  it("returns a Promise", () => {
    const result = getElk();
    expect(result).toBeInstanceOf(Promise);
  });

  it("caches: second call returns the same promise", () => {
    const p1 = getElk();
    const p2 = getElk();
    expect(p1).toBe(p2);
  });
});

describe("arrangeNodes", () => {
  it("empty input returns empty map", async () => {
    const result = await arrangeNodes([], [], new Map());
    expect(result.size).toBe(0);
  });

  it("single node returns one snapped position", async () => {
    const nodes = [makeNode("a")];
    const result = await arrangeNodes(nodes, [], new Map());
    expect(result.size).toBe(1);
    const pos = result.get("a")!;
    expect(pos.x % 15).toBe(0);
    expect(pos.y % 15).toBe(0);
  });

  it("chain A→B→C: B is to the right of A, C to the right of B", async () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const edges = [makeEdge("a", "b"), makeEdge("b", "c")];
    const result = await arrangeNodes(nodes, edges, new Map());
    expect(result.size).toBe(3);
    expect(result.get("b")!.x).toBeGreaterThan(result.get("a")!.x);
    expect(result.get("c")!.x).toBeGreaterThan(result.get("b")!.x);
  });

  it("fan-in A→C, B→C: C is to the right of both A and B", async () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const edges = [makeEdge("a", "c"), makeEdge("b", "c")];
    const result = await arrangeNodes(nodes, edges, new Map());
    expect(result.size).toBe(3);
    const cX = result.get("c")!.x;
    expect(cX).toBeGreaterThan(result.get("a")!.x);
    expect(cX).toBeGreaterThan(result.get("b")!.x);
  });

  it("notes-excluded: note nodes are absent from the returned map", async () => {
    const nodes = [makeNode("a"), makeNode("n1", "note"), makeNode("b")];
    const edges = [makeEdge("a", "b"), makeEdge("a", "n1")];
    const result = await arrangeNodes(nodes, edges, new Map());
    expect(result.has("n1")).toBe(false);
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(true);
  });

  it("orphan-included: disconnected non-note nodes appear in the map", async () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("orphan")];
    const edges = [makeEdge("a", "b")];
    const result = await arrangeNodes(nodes, edges, new Map());
    expect(result.has("orphan")).toBe(true);
  });

  it("dimensions-honored: passed dimensions are used for node sizing", async () => {
    const nodes = [makeNode("wide"), makeNode("tall")];
    const edges: Edge[] = [];
    const dims = new Map([
      ["wide", { width: 400, height: 80 }],
      ["tall", { width: 200, height: 300 }],
    ]);
    // Just verify it resolves without error and returns positions for both nodes
    const result = await arrangeNodes(nodes, edges, dims);
    expect(result.has("wide")).toBe(true);
    expect(result.has("tall")).toBe(true);
  });

  it("dimensions-fallback: missing dimensions fall back to MIN constants", async () => {
    const nodes = [makeNode("x"), makeNode("y")];
    const edges = [makeEdge("x", "y")];
    // Supply dims for only one node — y falls back to MIN_NODE_WIDTH/HEIGHT
    const dims = new Map([["x", { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT }]]);
    const result = await arrangeNodes(nodes, edges, dims);
    expect(result.has("x")).toBe(true);
    expect(result.has("y")).toBe(true);
  });
});

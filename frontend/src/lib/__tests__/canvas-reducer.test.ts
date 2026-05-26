import { describe, it, expect } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import type { ValidationError } from "@/types/canvas";
import { canvasReducer, createInitialState, type CanvasState } from "../canvas-reducer";

const makeNode = (id: string): Node =>
  ({ id, type: "sma", position: { x: 0, y: 0 }, data: { params: { period: 14 } } }) as Node;

const makeEdge = (id: string, source: string, target: string): Edge =>
  ({ id, source, target }) as Edge;

const baseState = (): CanvasState => createInitialState();

describe("canvasReducer", () => {
  describe("SET_NODES", () => {
    it("replaces nodes with the payload", () => {
      const nodes = [makeNode("n1"), makeNode("n2")];
      const next = canvasReducer(baseState(), { type: "SET_NODES", payload: nodes });
      expect(next.nodes).toEqual(nodes);
    });

    it("does not mutate the previous state", () => {
      const prev = baseState();
      canvasReducer(prev, { type: "SET_NODES", payload: [makeNode("n1")] });
      expect(prev.nodes).toHaveLength(0);
    });
  });

  describe("SET_EDGES", () => {
    it("replaces edges with the payload", () => {
      const edges = [makeEdge("e1", "n1", "n2")];
      const next = canvasReducer(baseState(), { type: "SET_EDGES", payload: edges });
      expect(next.edges).toEqual(edges);
    });
  });

  describe("ADD_NODE", () => {
    it("appends the node to the existing list", () => {
      const existing = makeNode("n1");
      const prev: CanvasState = { ...baseState(), nodes: [existing] };
      const added = makeNode("n2");
      const next = canvasReducer(prev, { type: "ADD_NODE", payload: added });
      expect(next.nodes).toHaveLength(2);
      expect(next.nodes[1]).toEqual(added);
    });

    it("does not mutate the previous nodes array", () => {
      const prev = baseState();
      canvasReducer(prev, { type: "ADD_NODE", payload: makeNode("n1") });
      expect(prev.nodes).toHaveLength(0);
    });
  });

  describe("DELETE_NODE", () => {
    it("removes the node from the list", () => {
      const n1 = makeNode("n1");
      const n2 = makeNode("n2");
      const prev: CanvasState = { ...baseState(), nodes: [n1, n2] };
      const next = canvasReducer(prev, { type: "DELETE_NODE", payload: "n1" });
      expect(next.nodes).toHaveLength(1);
      expect(next.nodes[0].id).toBe("n2");
    });

    it("removes all edges connected to the deleted node", () => {
      const prev: CanvasState = {
        ...baseState(),
        nodes: [makeNode("n1"), makeNode("n2"), makeNode("n3")],
        edges: [
          makeEdge("e1", "n1", "n2"),
          makeEdge("e2", "n2", "n3"),
          makeEdge("e3", "n1", "n3"),
        ],
      };
      const next = canvasReducer(prev, { type: "DELETE_NODE", payload: "n1" });
      expect(next.edges).toHaveLength(1);
      expect(next.edges[0].id).toBe("e2");
    });

    it("is a no-op when node id is not found", () => {
      const prev: CanvasState = { ...baseState(), nodes: [makeNode("n1")] };
      const next = canvasReducer(prev, { type: "DELETE_NODE", payload: "nonexistent" });
      expect(next.nodes).toHaveLength(1);
    });
  });

  describe("UPDATE_PARAMS", () => {
    it("updates params on the matched node without touching other nodes", () => {
      const n1 = makeNode("n1");
      const n2 = makeNode("n2");
      const prev: CanvasState = { ...baseState(), nodes: [n1, n2] };
      const next = canvasReducer(prev, {
        type: "UPDATE_PARAMS",
        payload: { nodeId: "n1", params: { period: 21 } },
      });
      expect((next.nodes[0].data as Record<string, unknown>).params).toEqual({ period: 21 });
      expect(next.nodes[1]).toEqual(n2);
    });

    it("does not mutate the existing node object", () => {
      const n1 = makeNode("n1");
      const prev: CanvasState = { ...baseState(), nodes: [n1] };
      canvasReducer(prev, {
        type: "UPDATE_PARAMS",
        payload: { nodeId: "n1", params: { period: 99 } },
      });
      expect((n1.data as Record<string, unknown>).params).toEqual({ period: 14 });
    });
  });

  describe("SELECT_NODE", () => {
    it("sets selectedNodeId and adds to selectedNodeIds", () => {
      const next = canvasReducer(baseState(), { type: "SELECT_NODE", payload: "n1" });
      expect(next.selectedNodeId).toBe("n1");
      expect(next.selectedNodeIds).toContain("n1");
    });
  });

  describe("DESELECT_ALL", () => {
    it("clears selectedNodeId and selectedNodeIds", () => {
      const prev: CanvasState = {
        ...baseState(),
        selectedNodeId: "n1",
        selectedNodeIds: ["n1", "n2"],
      };
      const next = canvasReducer(prev, { type: "DESELECT_ALL" });
      expect(next.selectedNodeId).toBeNull();
      expect(next.selectedNodeIds).toHaveLength(0);
    });
  });

  describe("SET_SELECTION", () => {
    it("replaces selectedNodeIds with the payload", () => {
      const prev: CanvasState = { ...baseState(), selectedNodeIds: ["n1"] };
      const next = canvasReducer(prev, { type: "SET_SELECTION", payload: ["n2", "n3"] });
      expect(next.selectedNodeIds).toEqual(["n2", "n3"]);
    });
  });

  describe("TOGGLE_EXPANDED", () => {
    it("adds nodeId to expandedNodeIds when not present", () => {
      const next = canvasReducer(baseState(), { type: "TOGGLE_EXPANDED", payload: "n1" });
      expect(next.expandedNodeIds).toContain("n1");
    });

    it("removes nodeId from expandedNodeIds when already present", () => {
      const prev: CanvasState = { ...baseState(), expandedNodeIds: ["n1", "n2"] };
      const next = canvasReducer(prev, { type: "TOGGLE_EXPANDED", payload: "n1" });
      expect(next.expandedNodeIds).not.toContain("n1");
      expect(next.expandedNodeIds).toContain("n2");
    });
  });

  describe("SET_VALIDATION_ERRORS", () => {
    it("replaces validationErrors with the payload", () => {
      const errors: ValidationError[] = [{ code: "ERR", message: "bad" }];
      const next = canvasReducer(baseState(), { type: "SET_VALIDATION_ERRORS", payload: errors });
      expect(next.validationErrors).toEqual(errors);
    });
  });

  describe("OPEN_POPOVER", () => {
    it("sets popoverNodeId to the given node id", () => {
      const next = canvasReducer(baseState(), { type: "OPEN_POPOVER", payload: "n1" });
      expect(next.popoverNodeId).toBe("n1");
    });
  });

  describe("CLOSE_POPOVER", () => {
    it("clears popoverNodeId", () => {
      const prev: CanvasState = { ...baseState(), popoverNodeId: "n1" };
      const next = canvasReducer(prev, { type: "CLOSE_POPOVER" });
      expect(next.popoverNodeId).toBeNull();
    });
  });

  describe("SET_REACTFLOW_INSTANCE", () => {
    it("stores the ReactFlow instance in state", () => {
      const fakeInstance = { fitView: () => {} } as unknown as Parameters<
        typeof canvasReducer
      >[1] extends { payload: infer P } ? P : never;
      const next = canvasReducer(baseState(), {
        type: "SET_REACTFLOW_INSTANCE",
        payload: fakeInstance as never,
      });
      expect(next.reactFlowInstance).toBe(fakeInstance);
    });

    it("accepts null to clear the instance", () => {
      const next = canvasReducer(baseState(), {
        type: "SET_REACTFLOW_INSTANCE",
        payload: null,
      });
      expect(next.reactFlowInstance).toBeNull();
    });
  });

  describe("UNDO", () => {
    it("restores nodes and edges from the payload", () => {
      const restoredNodes = [makeNode("n1")];
      const restoredEdges = [makeEdge("e1", "n1", "n2")];
      const next = canvasReducer(baseState(), {
        type: "UNDO",
        payload: { nodes: restoredNodes, edges: restoredEdges },
      });
      expect(next.nodes).toEqual(restoredNodes);
      expect(next.edges).toEqual(restoredEdges);
    });

    it("is a no-op when payload is absent (empty history guard)", () => {
      const prev = baseState();
      const next = canvasReducer(prev, { type: "UNDO" });
      expect(next.nodes).toEqual(prev.nodes);
      expect(next.edges).toEqual(prev.edges);
    });
  });

  describe("REDO", () => {
    it("restores nodes and edges from the payload", () => {
      const restoredNodes = [makeNode("n2")];
      const restoredEdges: Edge[] = [];
      const next = canvasReducer(baseState(), {
        type: "REDO",
        payload: { nodes: restoredNodes, edges: restoredEdges },
      });
      expect(next.nodes).toEqual(restoredNodes);
      expect(next.edges).toEqual(restoredEdges);
    });

    it("is a no-op when payload is absent", () => {
      const prev = baseState();
      const next = canvasReducer(prev, { type: "REDO" });
      expect(next.nodes).toEqual(prev.nodes);
    });
  });

  describe("immutability", () => {
    it("always returns a new state object", () => {
      const prev = baseState();
      const next = canvasReducer(prev, { type: "DESELECT_ALL" });
      expect(next).not.toBe(prev);
    });
  });
});

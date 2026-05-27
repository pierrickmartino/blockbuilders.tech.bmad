import type { Node, Edge } from "@xyflow/react";
import type { ReactFlowInstance } from "@xyflow/react";
import type { ValidationError } from "@/types/canvas";

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  selectedNodeId: string | null;
  expandedNodeIds: string[];
  validationErrors: ValidationError[];
  popoverNodeId: string | null;
  reactFlowInstance: ReactFlowInstance<Node, Edge> | null;
}

export type CanvasAction =
  | { type: "SET_NODES"; payload: Node[] }
  | { type: "SET_EDGES"; payload: Edge[] }
  | { type: "ADD_NODE"; payload: Node }
  | { type: "DELETE_NODE"; payload: string }
  | { type: "UPDATE_PARAMS"; payload: { nodeId: string; params: Record<string, unknown> } }
  | { type: "SELECT_NODE"; payload: string }
  | { type: "DESELECT_ALL" }
  | { type: "SET_SELECTION"; payload: string[] }
  | { type: "TOGGLE_EXPANDED"; payload: string }
  | { type: "SET_VALIDATION_ERRORS"; payload: ValidationError[] }
  | { type: "OPEN_POPOVER"; payload: string }
  | { type: "CLOSE_POPOVER" }
  | { type: "SET_REACTFLOW_INSTANCE"; payload: ReactFlowInstance<Node, Edge> | null }
  | { type: "UNDO"; payload?: { nodes: Node[]; edges: Edge[] } }
  | { type: "REDO"; payload?: { nodes: Node[]; edges: Edge[] } };

export function createInitialState(nodes: Node[] = [], edges: Edge[] = []): CanvasState {
  return {
    nodes,
    edges,
    selectedNodeIds: [],
    selectedNodeId: null,
    expandedNodeIds: [],
    validationErrors: [],
    popoverNodeId: null,
    reactFlowInstance: null,
  };
}

export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case "SET_NODES":
      return { ...state, nodes: action.payload };

    case "SET_EDGES":
      return { ...state, edges: action.payload };

    case "ADD_NODE":
      return { ...state, nodes: [...state.nodes, action.payload] };

    case "DELETE_NODE": {
      const nodeId = action.payload;
      return {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      };
    }

    case "UPDATE_PARAMS": {
      const { nodeId, params } = action.payload;
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, params } } : n
        ),
      };
    }

    case "SELECT_NODE":
      return {
        ...state,
        selectedNodeId: action.payload,
        selectedNodeIds: [action.payload],
      };

    case "DESELECT_ALL":
      if (state.selectedNodeId === null && state.selectedNodeIds.length === 0) {
        return state;
      }
      return { ...state, selectedNodeId: null, selectedNodeIds: [] };

    case "SET_SELECTION":
      return { ...state, selectedNodeIds: action.payload };

    case "TOGGLE_EXPANDED": {
      const id = action.payload;
      const isExpanded = state.expandedNodeIds.includes(id);
      return {
        ...state,
        expandedNodeIds: isExpanded
          ? state.expandedNodeIds.filter((eid) => eid !== id)
          : [...state.expandedNodeIds, id],
      };
    }

    case "SET_VALIDATION_ERRORS":
      return { ...state, validationErrors: action.payload };

    case "OPEN_POPOVER":
      return { ...state, popoverNodeId: action.payload };

    case "CLOSE_POPOVER":
      return { ...state, popoverNodeId: null };

    case "SET_REACTFLOW_INSTANCE":
      return { ...state, reactFlowInstance: action.payload };

    case "UNDO":
      if (!action.payload) return state;
      return { ...state, nodes: action.payload.nodes, edges: action.payload.edges };

    case "REDO":
      if (!action.payload) return state;
      return { ...state, nodes: action.payload.nodes, edges: action.payload.edges };

    default:
      return state;
  }
}

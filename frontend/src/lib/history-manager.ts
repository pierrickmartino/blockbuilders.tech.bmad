import type { Node, Edge } from "@xyflow/react";

export interface CanvasSnapshot {
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
}

export interface HistoryState {
  past: CanvasSnapshot[];
  present: CanvasSnapshot | null;
  future: CanvasSnapshot[];
}

const MAX_HISTORY_LENGTH = 50;

/**
 * Create a deep copy of nodes and edges for immutable snapshots
 */
function deepCopy<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Create a new snapshot from current canvas state
 */
function createSnapshot(nodes: Node[], edges: Edge[]): CanvasSnapshot {
  return {
    nodes: deepCopy(nodes),
    edges: deepCopy(edges),
    timestamp: Date.now(),
  };
}

/**
 * Initialize fresh history with current canvas state
 */
export function resetHistory(nodes: Node[], edges: Edge[]): HistoryState {
  return {
    past: [],
    present: nodes.length > 0 || edges.length > 0 ? createSnapshot(nodes, edges) : null,
    future: [],
  };
}

/**
 * Add a new snapshot to history
 * - Pushes current present to past
 * - Clears future (any new change after undo removes redo stack)
 * - Caps past array at MAX_HISTORY_LENGTH
 */
export function pushSnapshot(
  history: HistoryState,
  nodes: Node[],
  edges: Edge[]
): HistoryState {
  const newSnapshot = createSnapshot(nodes, edges);

  const newPast = history.present
    ? [...history.past, history.present]
    : history.past;

  // Trim oldest entries if exceeding max length
  const trimmedPast =
    newPast.length > MAX_HISTORY_LENGTH
      ? newPast.slice(newPast.length - MAX_HISTORY_LENGTH)
      : newPast;

  return {
    past: trimmedPast,
    present: newSnapshot,
    future: [], // Clear future on new change
  };
}

/**
 * Undo operation: move present to future, pop from past
 * Returns null snapshot if past is empty
 */
export function undo(
  history: HistoryState
): { history: HistoryState; snapshot: CanvasSnapshot | null } {
  if (history.past.length === 0) {
    return { history, snapshot: null };
  }

  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);

  const newFuture = history.present
    ? [history.present, ...history.future]
    : history.future;

  return {
    history: {
      past: newPast,
      present: previous,
      future: newFuture,
    },
    snapshot: previous,
  };
}

/**
 * Redo operation: move present to past, pop from future
 * Returns null snapshot if future is empty
 */
export function redo(
  history: HistoryState
): { history: HistoryState; snapshot: CanvasSnapshot | null } {
  if (history.future.length === 0) {
    return { history, snapshot: null };
  }

  const next = history.future[0];
  const newFuture = history.future.slice(1);

  const newPast = history.present
    ? [...history.past, history.present]
    : history.past;

  return {
    history: {
      past: newPast,
      present: next,
      future: newFuture,
    },
    snapshot: next,
  };
}

/**
 * Check if undo is available
 */
export function canUndo(history: HistoryState): boolean {
  return history.past.length > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(history: HistoryState): boolean {
  return history.future.length > 0;
}

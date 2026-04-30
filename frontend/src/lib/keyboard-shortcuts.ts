export interface KeyboardShortcut {
  /** Key combo parts, e.g. ["Cmd/Ctrl", "S"]. Alternatives as separate arrays. */
  keys: string[][];
  action: string;
  description: string;
  category: "Canvas" | "Navigation";
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    keys: [["Cmd/Ctrl", "S"]],
    action: "Save strategy",
    description: "Save current canvas as a new version",
    category: "Canvas",
  },
  {
    keys: [["Cmd/Ctrl", "Z"]],
    action: "Undo",
    description: "Undo last canvas change",
    category: "Canvas",
  },
  {
    keys: [["Cmd/Ctrl", "Shift", "Z"], ["Cmd/Ctrl", "Y"]],
    action: "Redo",
    description: "Redo canvas change",
    category: "Canvas",
  },
  {
    keys: [["Cmd/Ctrl", "R"]],
    action: "Run backtest",
    description: "Go to backtest tab (or run backtest if already there)",
    category: "Navigation",
  },
  {
    keys: [["?"]],
    action: "Show shortcuts",
    description: "Open this reference modal",
    category: "Navigation",
  },
];

/**
 * Check if we're on a Mac (for display purposes)
 */
export function isMacPlatform(): boolean {
  if (typeof window === "undefined") return false;
  return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
}

/**
 * Check if the active element is an input-like field
 */
export function isInputElement(element: HTMLElement): boolean {
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.isContentEditable
  );
}

export interface KeyboardShortcut {
  key: string;
  action: string;
  description: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: "Cmd/Ctrl+S",
    action: "Save strategy",
    description: "Save current canvas as a new version",
  },
  {
    key: "Cmd/Ctrl+R",
    action: "Run backtest",
    description: "Go to backtest tab (or run backtest if already there)",
  },
  {
    key: "Cmd/Ctrl+Z",
    action: "Undo",
    description: "Undo last canvas change",
  },
  {
    key: "Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y",
    action: "Redo",
    description: "Redo canvas change",
  },
  {
    key: "?",
    action: "Show shortcuts",
    description: "Open this reference modal",
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

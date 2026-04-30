"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { KEYBOARD_SHORTCUTS, isMacPlatform } from "@/lib/keyboard-shortcuts";
import type { KeyboardShortcut } from "@/lib/keyboard-shortcuts";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  const isMac = isMacPlatform();

  const formatKey = (key: string) =>
    key.replace("Cmd/Ctrl", isMac ? "⌘" : "Ctrl");

  const categories = [...new Set(KEYBOARD_SHORTCUTS.map((s) => s.category))];

  const renderKeys = (shortcut: KeyboardShortcut) => {
    const ariaLabel = shortcut.keys
      .map((combo) => combo.map(formatKey).join(" + "))
      .join(" or ");

    return (
      <div className="flex shrink-0 items-center gap-1.5" aria-label={ariaLabel}>
        {shortcut.keys.map((combo, ci) => (
          <span key={ci} className="flex items-center gap-0.5">
            {ci > 0 && (
              <span className="mx-1 text-xs text-muted-foreground">or</span>
            )}
            {combo.map((part) => (
              <kbd
                key={part}
                className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground"
              >
                {formatKey(part)}
              </kbd>
            ))}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Available shortcuts for the strategy editor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </h3>
              {KEYBOARD_SHORTCUTS.filter((s) => s.category === category).map(
                (shortcut) => (
                  <div
                    key={shortcut.action}
                    className="flex items-start gap-4"
                  >
                    {renderKeys(shortcut)}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {shortcut.action}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {shortcut.description}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

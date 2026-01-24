"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { KEYBOARD_SHORTCUTS, isMacPlatform } from "@/lib/keyboard-shortcuts";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  const isMac = isMacPlatform();

  const formatKey = (key: string) => {
    return key.replace("Cmd/Ctrl", isMac ? "Cmd" : "Ctrl");
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

        <div className="space-y-3">
          {KEYBOARD_SHORTCUTS.map((shortcut, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <kbd className="min-w-[120px] rounded border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-mono text-gray-700">
                {formatKey(shortcut.key)}
              </kbd>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">
                  {shortcut.action}
                </div>
                <div className="text-xs text-gray-500">
                  {shortcut.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

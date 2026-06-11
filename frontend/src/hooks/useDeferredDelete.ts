import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

/** Grace window duration, matching the canvas node-delete Undo toast (ADR-0012 §7). */
export const DEFERRED_DELETE_GRACE_MS = 5000;

interface UseDeferredDeleteOptions {
  /** Runs once the grace window elapses without Undo. */
  onCommit: () => void;
  /** Runs if Undo is clicked before the grace window elapses. */
  onUndo?: () => void;
}

export interface UseDeferredDeleteResult {
  /** Starts the grace window and shows the Undo toast. */
  scheduleDelete: (message: string) => void;
}

/**
 * Grace-window delete (ADR-0012 §7): shows an Undo toast and commits the
 * delete only after the window elapses. Undo cancels the pending commit. If
 * the component unmounts before the window elapses (e.g. in-app navigation
 * away from the result page), the pending commit is cancelled too — an
 * interrupt resolves to keep, consistent with hard-exit behavior (ADR-0012 §6).
 */
export function useDeferredDelete({ onCommit, onUndo }: UseDeferredDeleteOptions): UseDeferredDeleteResult {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timeoutRef.current === null) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const scheduleDelete = useCallback(
    (message: string) => {
      cancel();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        onCommit();
      }, DEFERRED_DELETE_GRACE_MS);

      toast(message, {
        action: {
          label: "Undo",
          onClick: () => {
            cancel();
            onUndo?.();
          },
        },
        duration: DEFERRED_DELETE_GRACE_MS,
      });
    },
    [cancel, onCommit, onUndo]
  );

  return { scheduleDelete };
}

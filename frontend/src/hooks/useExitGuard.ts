"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface UseExitGuardOptions {
  /** Arms the guard while a draft is under review (ADR-0012 §6). */
  isArmed: boolean;
  /** Resolves the draft to `kept` (no artifact). */
  onKeep: () => void;
  /** Hard-deletes the draft via the #602 reject cascade. */
  onDiscard: () => void | Promise<void>;
}

export interface UseExitGuardResult {
  isModalOpen: boolean;
  handleKeep: () => void;
  handleDiscard: () => void;
  handleCancel: () => void;
}

/**
 * Confirm-on-exit guard (ADR-0012 §6, Module C).
 *
 * - In-app navigation (client-side link clicks) is intercepted while armed:
 *   the click is cancelled and a Keep / Discard / Cancel modal opens instead.
 * - A hard browser exit (tab close, refresh, URL change) can only show the
 *   native `beforeunload` prompt and cannot reliably delete on unload, so it
 *   always resolves to keep — no unload-delete is attempted.
 */
export function useExitGuard({ isArmed, onKeep, onDiscard }: UseExitGuardOptions): UseExitGuardResult {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pendingNavigateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isArmed) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isArmed]);

  useEffect(() => {
    if (!isArmed) return;

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;

      event.preventDefault();
      pendingNavigateRef.current = () => router.push(href);
      setIsModalOpen(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isArmed, router]);

  const handleKeep = useCallback(() => {
    onKeep();
    setIsModalOpen(false);
    pendingNavigateRef.current?.();
    pendingNavigateRef.current = null;
  }, [onKeep]);

  const handleDiscard = useCallback(() => {
    void Promise.resolve(onDiscard()).then(() => {
      setIsModalOpen(false);
      pendingNavigateRef.current?.();
      pendingNavigateRef.current = null;
    });
  }, [onDiscard]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    pendingNavigateRef.current = null;
  }, []);

  return { isModalOpen, handleKeep, handleDiscard, handleCancel };
}

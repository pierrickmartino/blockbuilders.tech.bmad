"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type BannerState = "hidden" | "entering" | "visible" | "confirmed" | "exiting";

export function ConsentBanner() {
  const [state, setState] = useState<BannerState>("hidden");
  const [confirmMsg, setConfirmMsg] = useState("");
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (getConsent() === null) {
      // Small delay so mount animation plays
      const id = requestAnimationFrame(() => setState("entering"));
      return () => cancelAnimationFrame(id);
    }
  }, []);

  useEffect(() => {
    if (state === "entering") {
      const id = requestAnimationFrame(() => setState("visible"));
      return () => cancelAnimationFrame(id);
    }
  }, [state]);

  // Auto-focus banner for keyboard / screen-reader users
  useEffect(() => {
    if (state === "visible") {
      bannerRef.current?.focus();
    }
  }, [state]);

  const dismiss = useCallback((msg: string) => {
    setConfirmMsg(msg);
    setState("confirmed");
    const id = setTimeout(() => setState("exiting"), 1200);
    return () => clearTimeout(id);
  }, []);

  const handleAccept = () => {
    setConsent(true);
    dismiss("Preferences saved — analytics enabled");
  };

  const handleDecline = () => {
    setConsent(false);
    dismiss("Preferences saved — analytics disabled");
  };

  const handleDismiss = () => {
    setState("exiting");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleDismiss();
  };

  if (state === "hidden") return null;

  const isInteractive = state === "entering" || state === "visible";

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-label="Cookie consent"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onTransitionEnd={() => {
        if (state === "exiting") setState("hidden");
      }}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-blue-200 bg-blue-50 p-4 outline-none transition-transform duration-200 ease-out dark:border-blue-800 dark:bg-blue-950 motion-reduce:transition-none ${
        state === "entering" || state === "exiting"
          ? "translate-y-full"
          : "translate-y-0"
      }`}
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        {state === "confirmed" ? (
          <p
            className="text-sm font-medium text-blue-800 dark:text-blue-200"
            role="status"
            aria-live="polite"
          >
            {confirmMsg}
          </p>
        ) : (
          <>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              We use cookies and analytics to understand how you use the app. No
              personal data is shared with third parties.{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-100"
              >
                Privacy Policy
              </Link>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecline}
                disabled={!isInteractive}
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={!isInteractive}
              >
                Accept
              </Button>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss, decide later"
                className="ml-1 rounded-md p-1 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800 focus-visible:ring-1 focus-visible:ring-ring dark:text-blue-300 dark:hover:bg-blue-900 dark:hover:text-blue-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

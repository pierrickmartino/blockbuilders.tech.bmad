"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getConsent, setConsent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type BannerState = "hidden" | "entering" | "visible" | "confirmed" | "exiting";

/**
 * Routes where the consent banner must NOT render.
 *
 * Auth and share routes have their own primary actions (sign in, accept share,
 * etc.); a fixed bottom banner overlapping those CTAs measurably hurts the
 * funnel. We suppress on prefix match so nested auth/share pages inherit the
 * suppression automatically.
 */
const SUPPRESSED_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/share",
] as const;

function isSuppressedRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return SUPPRESSED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function ConsentBanner() {
  const pathname = usePathname();
  const [state, setState] = useState<BannerState>("hidden");
  const [confirmMsg, setConfirmMsg] = useState("");
  const bannerRef = useRef<HTMLDivElement>(null);

  const suppressed = isSuppressedRoute(pathname);

  useEffect(() => {
    if (suppressed) return;
    if (getConsent() === null) {
      // Small delay so mount animation plays
      const id = requestAnimationFrame(() => setState("entering"));
      return () => cancelAnimationFrame(id);
    }
  }, [suppressed]);

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

  if (suppressed || state === "hidden") return null;

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
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-border bg-info-soft px-4 py-3 outline-none transition-transform duration-normal ease-default sm:py-4 motion-reduce:transition-none ${
        state === "entering" || state === "exiting"
          ? "translate-y-full"
          : "translate-y-0"
      }`}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {state === "confirmed" ? (
          <p
            className="text-sm font-medium text-foreground"
            role="status"
            aria-live="polite"
          >
            {confirmMsg}
          </p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-foreground">
              We use cookies and analytics to understand how you use the app. No
              personal data is shared with third parties.{" "}
              <Link
                href="/privacy"
                className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
              >
                Privacy policy
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
              <Button size="sm" onClick={handleAccept} disabled={!isInteractive}>
                Accept
              </Button>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss, decide later"
                className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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

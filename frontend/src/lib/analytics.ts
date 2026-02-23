import posthog from "posthog-js";

const CONSENT_KEY = "bb.analytics.consent";

type ConsentStatus = "accepted" | "declined" | null;

/** Read consent from localStorage. Returns null if not yet decided. */
export function getConsent(): ConsentStatus {
  if (typeof window === "undefined") return null;
  try {
    const val = localStorage.getItem(CONSENT_KEY);
    if (val === "accepted" || val === "declined") return val;
    return null;
  } catch {
    return null;
  }
}

/** Store consent and initialize/shutdown PostHog accordingly. */
export function setConsent(accepted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONSENT_KEY, accepted ? "accepted" : "declined");
  } catch {
    // Storage unavailable
  }
  if (accepted) {
    initPostHog();
  } else {
    shutdownPostHog();
  }
}

let initialized = false;

/** Initialize PostHog if consent is accepted and env vars are present. */
export function initPostHog(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;
  if (getConsent() !== "accepted") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key) return;

  posthog.init(key, {
    api_host: host || "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: false,
    persistence: "localStorage+cookie",
  });
  initialized = true;
}

function shutdownPostHog(): void {
  if (!initialized) return;
  try {
    posthog.opt_out_capturing();
  } catch {
    // ignore
  }
  initialized = false;
}

/** Track an event. No-ops silently if consent not given or PostHog not ready. */
export function trackEvent(
  name: string,
  props?: Record<string, unknown>,
  userId?: string
): void {
  if (getConsent() !== "accepted") return;
  if (!initialized) return;

  posthog.capture(name, {
    ...props,
    user_id: userId ?? undefined,
    timestamp: new Date().toISOString(),
  });
}

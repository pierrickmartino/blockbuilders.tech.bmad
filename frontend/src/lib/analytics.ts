import posthog from "posthog-js";
import { AnalyticsApiClient } from "@/lib/api/analytics-client";

const CONSENT_KEY = "bb.analytics.consent";
export const ANALYTICS_CONSENT_CHANGED_EVENT = "bb.analytics.consent.changed";
export const ANALYTICS_POSTHOG_INITIALIZED_EVENT =
  "bb.analytics.posthog.initialized";

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

/** Persist the device's consent decision server-side when the user is authenticated. */
function syncConsentToServer(consent: "accepted" | "declined"): void {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem("token")) return;

  AnalyticsApiClient.updateConsent(consent).catch(() => {
    // Best-effort: localStorage remains the source of truth for this device.
  });
}

/** Store consent and initialize/shutdown PostHog accordingly. */
export function setConsent(accepted: boolean): void {
  if (typeof window === "undefined") return;
  const consent: "accepted" | "declined" = accepted ? "accepted" : "declined";
  try {
    localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // Storage unavailable
  }
  if (accepted) {
    initPostHog();
  } else {
    shutdownPostHog();
  }

  syncConsentToServer(consent);

  window.dispatchEvent(new Event(ANALYTICS_CONSENT_CHANGED_EVENT));
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
  window.dispatchEvent(new Event(ANALYTICS_POSTHOG_INITIALIZED_EVENT));
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

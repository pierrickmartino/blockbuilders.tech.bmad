"use client";

import { useEffect } from "react";
import { initPostHog } from "@/lib/analytics";

export function PostHogBootstrap() {
  useEffect(() => {
    initPostHog();
  }, []);
  return null;
}

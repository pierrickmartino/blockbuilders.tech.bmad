import type { CSSProperties } from "react";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "./SharedBacktestOgCard";

const COLORS = {
  background: "hsl(240, 8%, 5%)",
  foreground: "hsl(240, 5%, 92%)",
  mutedForeground: "hsl(240, 3%, 62%)",
  primary: "hsl(204, 76%, 63%)",
} as const;

/**
 * Branded fallback OG image for expired or unknown share tokens (ADR-0019).
 * Carries no result data, so an expired link degrades to a neutral brand
 * card rather than a stale or garbled image.
 */
export function SharedBacktestOgFallbackCard() {
  return (
    <div style={rootStyle}>
      <TrendingUpMark color={COLORS.primary} />
      <span style={titleStyle}>Blockbuilders</span>
      <span style={subtitleStyle}>This shared backtest is no longer available</span>
    </div>
  );
}

function TrendingUpMark({ color }: { color: string }) {
  return (
    <svg
      width={56}
      height={56}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: OG_IMAGE_WIDTH,
  height: OG_IMAGE_HEIGHT,
  backgroundColor: COLORS.background,
  color: COLORS.foreground,
  fontFamily: "sans-serif",
};

const titleStyle: CSSProperties = {
  marginTop: 24,
  fontSize: 48,
  fontWeight: 700,
};

const subtitleStyle: CSSProperties = {
  marginTop: 16,
  fontSize: 28,
  color: COLORS.mutedForeground,
};

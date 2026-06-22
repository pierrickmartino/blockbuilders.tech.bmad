import type { CSSProperties } from "react";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "./SharedBacktestOgCard";
import { OG_COLORS as COLORS } from "./og-theme";
import { TrendingUpMark } from "./TrendingUpMark";

/**
 * Branded fallback OG image for expired or unknown share tokens (ADR-0019).
 * Carries no result data, so an expired link degrades to a neutral brand
 * card rather than a stale or garbled image.
 */
export function SharedBacktestOgFallbackCard() {
  return (
    <div style={rootStyle}>
      <TrendingUpMark color={COLORS.primary} size={56} />
      <span style={titleStyle}>Blockbuilders</span>
      <span style={subtitleStyle}>This shared backtest is no longer available</span>
    </div>
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

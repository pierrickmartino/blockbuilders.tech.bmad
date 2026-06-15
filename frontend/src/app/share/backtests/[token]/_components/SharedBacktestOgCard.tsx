import type { CSSProperties } from "react";
import { formatPercent } from "@/lib/format";

// Fixed dark palette (dark-theme HSL values from docs/design-system.json),
// independent of the viewer's theme — Satori (next/og) cannot read CSS
// variables, and a stable card reads correctly in both light and dark
// unfurl contexts.
const COLORS = {
  background: "hsl(240, 8%, 5%)",
  border: "hsl(240, 5%, 17%)",
  foreground: "hsl(240, 5%, 92%)",
  mutedForeground: "hsl(240, 3%, 62%)",
  primary: "hsl(204, 76%, 63%)",
  success: "hsl(142, 71%, 45%)",
  destructive: "hsl(0, 84%, 60%)",
} as const;

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_SPARKLINE_WIDTH = 1072;
export const OG_SPARKLINE_HEIGHT = 180;

interface SharedBacktestOgCardProps {
  asset: string;
  timeframe: string;
  totalReturnPct: number;
  maxDrawdownPct: number;
  sparklinePath: string;
}

/**
 * Pure presentational "Wordle result" card for the Shared backtest OG image
 * (ADR-0019, M5). Used both inside `opengraph-image.tsx` (via `ImageResponse`)
 * and in Storybook for async design review — kept free of hooks and
 * client-only APIs so it renders identically in both.
 */
export function SharedBacktestOgCard({
  asset,
  timeframe,
  totalReturnPct,
  maxDrawdownPct,
  sparklinePath,
}: SharedBacktestOgCardProps) {
  const isGain = totalReturnPct >= 0;
  const returnColor = isGain ? COLORS.success : COLORS.destructive;
  const returnLabel = isGain ? "Gain" : "Loss";
  const returnSign = isGain ? "+" : "";

  return (
    <div style={rootStyle}>
      <div style={brandRowStyle}>
        <TrendingUpMark color={COLORS.primary} />
        <span style={brandTextStyle}>Blockbuilders</span>
        <div style={assetBadgeStyle}>
          {asset} · {timeframe}
        </div>
      </div>

      <div style={statsRowStyle}>
        <div style={statBlockStyle}>
          <span style={statLabelStyle}>{returnLabel}</span>
          <span style={{ ...statValueStyle, color: returnColor }}>
            {returnSign}
            {formatPercent(totalReturnPct)}
          </span>
        </div>
        <div style={statBlockStyle}>
          <span style={statLabelStyle}>Max Drawdown</span>
          <span style={{ ...statValueStyle, color: COLORS.destructive }}>
            {formatPercent(maxDrawdownPct)}
          </span>
        </div>
      </div>

      <svg
        width={OG_SPARKLINE_WIDTH}
        height={OG_SPARKLINE_HEIGHT}
        viewBox={`0 0 ${OG_SPARKLINE_WIDTH} ${OG_SPARKLINE_HEIGHT}`}
        style={sparklineStyle}
      >
        {sparklinePath && (
          <path
            d={sparklinePath}
            fill="none"
            stroke={returnColor}
            strokeWidth={4}
          />
        )}
      </svg>
    </div>
  );
}

function TrendingUpMark({ color }: { color: string }) {
  return (
    <svg
      width={40}
      height={40}
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
  justifyContent: "space-between",
  width: OG_IMAGE_WIDTH,
  height: OG_IMAGE_HEIGHT,
  padding: 64,
  backgroundColor: COLORS.background,
  color: COLORS.foreground,
  fontFamily: "sans-serif",
};

const brandRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
};

const brandTextStyle: CSSProperties = {
  marginLeft: 16,
  fontSize: 32,
  fontWeight: 700,
  color: COLORS.foreground,
};

const assetBadgeStyle: CSSProperties = {
  display: "flex",
  marginLeft: "auto",
  fontSize: 28,
  fontWeight: 600,
  color: COLORS.mutedForeground,
  border: `2px solid ${COLORS.border}`,
  borderRadius: 12,
  padding: "8px 20px",
};

const statsRowStyle: CSSProperties = {
  display: "flex",
  width: "100%",
};

const statBlockStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  marginRight: 80,
};

const statLabelStyle: CSSProperties = {
  fontSize: 28,
  color: COLORS.mutedForeground,
  marginBottom: 8,
};

const statValueStyle: CSSProperties = {
  fontSize: 84,
  fontWeight: 700,
};

const sparklineStyle: CSSProperties = {
  width: OG_SPARKLINE_WIDTH,
  height: OG_SPARKLINE_HEIGHT,
};

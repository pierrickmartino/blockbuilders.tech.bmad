import type { CSSProperties } from "react";
import { formatPercent } from "@/lib/format";
import { OG_COLORS as COLORS } from "./og-theme";
import { TrendingUpMark } from "./TrendingUpMark";

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

interface TrendingUpMarkProps {
  color: string;
  size?: number;
}

/**
 * Brand "trending up" mark used in the Shared backtest OG cards. Plain SVG
 * (no lucide / CSS variables) so it renders identically under Satori
 * (next/og) and in Storybook.
 */
export function TrendingUpMark({ color, size = 40 }: TrendingUpMarkProps) {
  return (
    <svg
      width={size}
      height={size}
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

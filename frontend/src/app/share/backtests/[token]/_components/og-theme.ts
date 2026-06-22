// Fixed dark palette (dark-theme HSL values from docs/design-system.json),
// independent of the viewer's theme — Satori (next/og) cannot read CSS
// variables, and a stable card reads correctly in both light and dark
// unfurl contexts. Shared by the Shared backtest OG card and its fallback.
export const OG_COLORS = {
  background: "hsl(240, 8%, 5%)",
  border: "hsl(240, 5%, 17%)",
  foreground: "hsl(240, 5%, 92%)",
  mutedForeground: "hsl(240, 3%, 62%)",
  primary: "hsl(204, 76%, 63%)",
  success: "hsl(142, 71%, 45%)",
  destructive: "hsl(0, 84%, 60%)",
} as const;

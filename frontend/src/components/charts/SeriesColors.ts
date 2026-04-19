export const SERIES_COLORS = [
  "primary",
  "success",
  "warning",
  "destructive",
  "info",
] as const;

export type SeriesColor = (typeof SERIES_COLORS)[number];

export const defaultSeriesColors: string[] = [...SERIES_COLORS];

export const deltaColors = {
  positive: "success" as const,
  negative: "destructive" as const,
  neutral: "muted-foreground" as const,
};

export type IndicatorPane = "price" | "oscillator";

export interface ChartCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorPoint {
  timestamp: string;
  value: number | null;
}

export interface IndicatorSeries {
  key: string;
  label: string;
  parameters: Record<string, unknown>;
  pane: IndicatorPane;
  points: IndicatorPoint[];
}

export interface ChartDataStatus {
  has_candles: boolean;
  earliest_candle: string | null;
  latest_candle: string | null;
}

export interface ChartDataResponse {
  asset: string;
  timeframe: string;
  start: string | null;
  end: string | null;
  candles: ChartCandle[];
  indicators: IndicatorSeries[];
  data_status: ChartDataStatus;
}

/** Indicator catalog displayed in the side panel selector. */
export interface ChartIndicatorOption {
  /** Backend key in the comma-separated `indicators` query param. */
  key: string;
  /** Display label shown in the selector and chart legend. */
  label: string;
  /** Optional period the user can edit. `undefined` for fixed-parameter indicators. */
  defaultPeriod?: number;
  /** Pane the resulting series is rendered in (used for selector grouping). */
  pane: IndicatorPane;
}

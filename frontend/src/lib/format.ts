/**
 * Centralized formatting utilities for numbers, currency, and datetimes.
 * All UI rendering of numbers and datetimes MUST go through these helpers.
 */

export type TimezoneMode = "local" | "utc";

// Single locale per session - browser default with en-US fallback
const getLocale = (): string => {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en-US";
};

const LOCALE = getLocale();

// Handle invalid values
const isValidNumber = (value: unknown): value is number => {
  return typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value);
};

const PLACEHOLDER = "—";

/**
 * Format a price with 2 decimals and currency suffix.
 * Example: formatPrice(43210.55, "USDT") -> "43,210.55 USDT"
 */
export function formatPrice(
  value: number | null | undefined,
  quote: string = "USDT"
): string {
  if (!isValidNumber(value)) return PLACEHOLDER;

  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);

  return `${formatted} ${quote}`;
}

/**
 * Format monetary value (P&L) with optional sign and currency suffix.
 * Example: formatMoney(120.34, "USDT", true) -> "+120.34 USDT"
 * Example: formatMoney(-50.00, "USDT", true) -> "-50.00 USDT"
 */
export function formatMoney(
  value: number | null | undefined,
  quote: string = "USDT",
  showSign: boolean = false
): string {
  if (!isValidNumber(value)) return PLACEHOLDER;

  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(Math.abs(value));

  let sign = "";
  if (showSign) {
    sign = value >= 0 ? "+" : "-";
  } else if (value < 0) {
    sign = "-";
  }

  return `${sign}${formatted} ${quote}`;
}

/**
 * Format a percentage with 2 decimals.
 * Example: formatPercent(12.345) -> "12.35%"
 */
export function formatPercent(value: number | null | undefined): string {
  if (!isValidNumber(value)) return PLACEHOLDER;

  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);

  return `${formatted}%`;
}

/**
 * Format a quantity with up to 6 decimals, trimming trailing zeros.
 * Example: formatQuantity(0.123400) -> "0.1234"
 */
export function formatQuantity(value: number | null | undefined): string {
  if (!isValidNumber(value)) return PLACEHOLDER;

  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
    useGrouping: true,
  }).format(value);
}

/**
 * Format a datetime as YYYY-MM-DD HH:mm (24-hour clock).
 * Example: formatDateTime("2025-12-23T14:05:00Z", "utc") -> "2025-12-23 14:05"
 */
export function formatDateTime(
  value: string | Date | null | undefined,
  tzMode: TimezoneMode = "local"
): string {
  if (value === null || value === undefined) return PLACEHOLDER;

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  if (tzMode === "utc") {
    options.timeZone = "UTC";
  }

  // Intl.DateTimeFormat returns locale-specific format, so we manually construct YYYY-MM-DD HH:mm
  const parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * Format a short date for chart axes.
 * Example: formatChartDate("2025-12-23T14:05:00Z", "utc") -> "Dec 23"
 */
export function formatChartDate(
  value: string | Date | null | undefined,
  tzMode: TimezoneMode = "local"
): string {
  if (value === null || value === undefined) return PLACEHOLDER;

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  if (tzMode === "utc") {
    options.timeZone = "UTC";
  }

  return new Intl.DateTimeFormat(LOCALE, options).format(date);
}

/**
 * Format duration in seconds to human-readable format.
 * Example: formatDuration(90061) -> "1d 1h"
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!isValidNumber(seconds) || seconds < 0) return PLACEHOLDER;

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Format a number with grouping separators (for generic number display).
 * Example: formatNumber(12345) -> "12,345"
 */
export function formatNumber(
  value: number | null | undefined,
  decimals: number = 0
): string {
  if (!isValidNumber(value)) return PLACEHOLDER;

  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(value);
}

/**
 * Format volatility value (std dev, ATR%, or percentile).
 * Returns "—" (PLACEHOLDER) for null/undefined values.
 * Example: formatVolatility(0.024, 3) -> "0.024"
 * Example: formatVolatility(80.5, 1) -> "80.5"
 */
export function formatVolatility(
  value: number | null | undefined,
  decimals: number = 3
): string {
  if (!isValidNumber(value)) return PLACEHOLDER;

  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(value);
}

/**
 * Format a relative time string (e.g., "2h ago", "3 days ago").
 * Example: formatRelativeTime("2025-01-27T10:00:00Z") -> "2h ago"
 */
export function formatRelativeTime(
  value: string | Date | null | undefined
): string {
  if (value === null || value === undefined) return PLACEHOLDER;

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return formatDateTime(date).split(" ")[0]; // Fall back to date only
}

/**
 * Format sentiment value with context-specific display.
 * Example: formatSentiment(62, "fear_greed") -> "62 (Greed)"
 * Example: formatSentiment(0.0001, "funding") -> "0.01%"
 * Example: formatSentiment(1.5, "long_short_ratio") -> "1.50 (Bullish)"
 */
export function formatSentiment(
  value: number | null | undefined,
  type: "fear_greed" | "long_short_ratio" | "funding"
): string {
  if (!isValidNumber(value)) return PLACEHOLDER;

  if (type === "fear_greed") {
    // 0-100 scale with label
    const label = value >= 75 ? "Extreme Greed"
                : value >= 55 ? "Greed"
                : value >= 45 ? "Neutral"
                : value >= 25 ? "Fear"
                : "Extreme Fear";
    return `${Math.round(value)} (${label})`;
  }

  if (type === "funding") {
    // Funding rate as percentage (0.0001 -> 0.01%)
    return `${(value * 100).toFixed(2)}%`;
  }

  // Long/Short Ratio: > 1 means more longs (bullish), < 1 means more shorts (bearish)
  const label = value >= 1.5 ? "Very Bullish"
              : value >= 1.1 ? "Bullish"
              : value >= 0.9 ? "Neutral"
              : value >= 0.67 ? "Bearish"
              : "Very Bearish";
  return `${value.toFixed(2)} (${label})`;
}

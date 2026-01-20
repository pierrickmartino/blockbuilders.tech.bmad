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

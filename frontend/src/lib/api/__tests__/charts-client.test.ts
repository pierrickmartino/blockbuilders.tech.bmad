import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChartsApiClient, chartsKeys } from "@/lib/api/charts-client";
import * as api from "@/lib/api/internal/fetch";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);

const emptyChartResponse = {
  asset: "BTC/USDT",
  timeframe: "1h",
  start: null,
  end: null,
  candles: [],
  indicators: [],
  data_status: { has_candles: false, earliest_candle: null, latest_candle: null },
};

describe("chartsKeys", () => {
  it("all() returns root scope key", () => {
    expect(chartsKeys.all()).toEqual(["charts"]);
  });

  it("chartData(asset, timeframe, indicators) builds a full key", () => {
    expect(chartsKeys.chartData("BTC/USDT", "1h", "")).toEqual([
      "charts",
      "chart-data",
      "BTC/USDT",
      "1h",
      "",
    ]);
  });

  it("chartData with indicators param includes indicator string", () => {
    expect(chartsKeys.chartData("ETH/USDT", "4h", "sma_14")).toEqual([
      "charts",
      "chart-data",
      "ETH/USDT",
      "4h",
      "sma_14",
    ]);
  });
});

describe("ChartsApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue(emptyChartResponse);
  });

  describe("getChartData()", () => {
    it("calls /market/chart-data with asset and timeframe", async () => {
      await ChartsApiClient.getChartData("BTC/USDT", "1h", "");
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("asset=BTC%2FUSDT");
      expect(url).toContain("timeframe=1h");
    });

    it("omits indicators param when indicatorParam is empty", async () => {
      await ChartsApiClient.getChartData("BTC/USDT", "1h", "");
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).not.toContain("indicators=");
    });

    it("appends indicators param when provided", async () => {
      await ChartsApiClient.getChartData("BTC/USDT", "1h", "sma_14,rsi_14");
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("indicators=sma_14%2Crsi_14");
    });

    it("returns the response from apiFetch", async () => {
      mockApiFetch.mockResolvedValueOnce(emptyChartResponse);
      const result = await ChartsApiClient.getChartData("BTC/USDT", "1h", "");
      expect(result).toEqual(emptyChartResponse);
    });

    it("encodes asset special characters", async () => {
      await ChartsApiClient.getChartData("ETH/USDT", "4h", "");
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("ETH%2FUSDT");
    });
  });
});

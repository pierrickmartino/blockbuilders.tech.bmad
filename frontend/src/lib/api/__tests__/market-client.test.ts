import { describe, it, expect, vi, beforeEach } from "vitest";
import { MarketApiClient, marketKeys } from "@/lib/api/market-client";
import * as api from "@/lib/api/internal/fetch";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);

const emptyTickers = { items: [], as_of: "2026-01-01T00:00:00Z" };
const emptySentiment = {
  as_of: "2026-01-01",
  asset: "BTC/USDT",
  fear_greed: { value: null, history: [] },
  long_short_ratio: { value: null, history: [] },
  funding: { value: null, history: [] },
  source_status: { fear_greed: "unavailable", long_short_ratio: "unavailable", funding: "unavailable" },
};
const emptyAvailability = { has_data: false, earliest: null, latest: null };

describe("marketKeys", () => {
  it("all() returns root scope key", () => {
    expect(marketKeys.all()).toEqual(["market"]);
  });

  it("tickers() returns tickers-scoped key", () => {
    expect(marketKeys.tickers()).toEqual(["market", "tickers"]);
  });

  it("sentiment(asset) embeds asset in key", () => {
    expect(marketKeys.sentiment("BTC/USDT")).toEqual(["market", "sentiment", "BTC/USDT"]);
  });

  it("dataAvailability(asset, tf) embeds both params", () => {
    expect(marketKeys.dataAvailability("ETH/USDT", "1h")).toEqual([
      "market",
      "data-availability",
      "ETH/USDT",
      "1h",
    ]);
  });
});

describe("MarketApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue(emptyTickers);
  });

  describe("getTickers()", () => {
    it("calls /market/tickers", async () => {
      await MarketApiClient.getTickers();
      expect(mockApiFetch).toHaveBeenCalledWith("/market/tickers");
    });

    it("returns the response from apiFetch", async () => {
      mockApiFetch.mockResolvedValueOnce(emptyTickers);
      const result = await MarketApiClient.getTickers();
      expect(result).toEqual(emptyTickers);
    });
  });

  describe("getSentiment(asset)", () => {
    beforeEach(() => {
      mockApiFetch.mockResolvedValue(emptySentiment);
    });

    it("calls /market/sentiment with encoded asset param", async () => {
      await MarketApiClient.getSentiment("BTC/USDT");
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/market/sentiment?asset=BTC%2FUSDT"
      );
    });

    it("encodes special characters in asset", async () => {
      await MarketApiClient.getSentiment("ETH/USDT");
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/market/sentiment?asset=ETH%2FUSDT"
      );
    });

    it("returns the response from apiFetch", async () => {
      mockApiFetch.mockResolvedValueOnce(emptySentiment);
      const result = await MarketApiClient.getSentiment("BTC/USDT");
      expect(result).toEqual(emptySentiment);
    });
  });

  describe("getDataAvailability(asset, timeframe)", () => {
    beforeEach(() => {
      mockApiFetch.mockResolvedValue(emptyAvailability);
    });

    it("calls /market/data-availability with asset and timeframe", async () => {
      await MarketApiClient.getDataAvailability("BTC/USDT", "1h");
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/market/data-availability?asset=BTC%2FUSDT&timeframe=1h"
      );
    });

    it("encodes asset special characters", async () => {
      await MarketApiClient.getDataAvailability("ETH/USDT", "4h");
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("ETH%2FUSDT");
      expect(url).toContain("timeframe=4h");
    });

    it("returns the response from apiFetch", async () => {
      mockApiFetch.mockResolvedValueOnce(emptyAvailability);
      const result = await MarketApiClient.getDataAvailability("BTC/USDT", "1h");
      expect(result).toEqual(emptyAvailability);
    });
  });
});

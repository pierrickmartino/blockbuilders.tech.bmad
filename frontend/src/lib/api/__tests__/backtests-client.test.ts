import { describe, it, expect, vi, beforeEach } from "vitest";
import { BacktestsApiClient, backtestsKeys } from "@/lib/api/backtests-client";
import * as api from "@/lib/api/internal/fetch";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);
const mockApiFetchVoid = vi.mocked(api.apiFetchVoid);

const emptyPage = { items: [], total: 0 };
const stubRun = {
  run_id: "run-1",
  strategy_id: "strat-1",
  status: "completed" as const,
  asset: "BTC/USDT",
  timeframe: "1h",
  date_from: "2024-01-01T00:00:00Z",
  date_to: "2024-03-01T00:00:00Z",
  triggered_by: "user",
};

describe("backtestsKeys", () => {
  it("all() returns root scope key", () => {
    expect(backtestsKeys.all()).toEqual(["backtests"]);
  });

  it("lists() returns list-scoped key", () => {
    expect(backtestsKeys.lists()).toEqual(["backtests", "list"]);
  });

  it("list(filters) embeds filters in key", () => {
    expect(backtestsKeys.list({ strategy_id: "s1" })).toEqual([
      "backtests",
      "list",
      { strategy_id: "s1" },
    ]);
  });

  it("detail(runId) embeds runId in key", () => {
    expect(backtestsKeys.detail("run-1")).toEqual(["backtests", "detail", "run-1"]);
  });

  it("trades(runId) scopes under the run", () => {
    expect(backtestsKeys.trades("run-1")).toEqual(["backtests", "run-1", "trades"]);
  });

  it("tradeDetail(runId, idx) embeds both params", () => {
    expect(backtestsKeys.tradeDetail("run-1", 3)).toEqual(["backtests", "run-1", "trade", 3]);
  });

  it("equityCurve(runId) scopes correctly", () => {
    expect(backtestsKeys.equityCurve("run-1")).toEqual(["backtests", "run-1", "equity-curve"]);
  });

  it("benchmarkCurve(runId) scopes correctly", () => {
    expect(backtestsKeys.benchmarkCurve("run-1")).toEqual(["backtests", "run-1", "benchmark-curve"]);
  });

  it("batch(batchId) scopes under batch", () => {
    expect(backtestsKeys.batch("batch-1")).toEqual(["backtests", "batch", "batch-1"]);
  });

  it("compare(runIds) embeds sorted run ids", () => {
    expect(backtestsKeys.compare(["b", "a"])).toEqual(["backtests", "compare", ["a", "b"]]);
  });

  it("dataQuality(...) embeds all params", () => {
    expect(backtestsKeys.dataQuality("BTC/USDT", "1h", "2024-01-01", "2024-03-01")).toEqual([
      "backtests",
      "data-quality",
      "BTC/USDT",
      "1h",
      "2024-01-01",
      "2024-03-01",
    ]);
  });

  it("dataCompleteness(asset, tf) embeds both params", () => {
    expect(backtestsKeys.dataCompleteness("BTC/USDT", "1h")).toEqual([
      "backtests",
      "data-completeness",
      "BTC/USDT",
      "1h",
    ]);
  });
});

describe("BacktestsApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue(emptyPage);
    mockApiFetchVoid.mockResolvedValue(undefined);
  });

  describe("list(filters)", () => {
    it("calls /backtests/ with no params when filters are empty", async () => {
      await BacktestsApiClient.list({});
      expect(mockApiFetch).toHaveBeenCalledWith("/backtests/");
    });

    it("appends strategy_id param when provided", async () => {
      await BacktestsApiClient.list({ strategy_id: "strat-1" });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("strategy_id=strat-1");
    });

    it("appends limit and offset when provided", async () => {
      await BacktestsApiClient.list({ limit: 20, offset: 40 });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("limit=20");
      expect(url).toContain("offset=40");
    });

    it("returns the response from apiFetch", async () => {
      mockApiFetch.mockResolvedValueOnce(emptyPage);
      const result = await BacktestsApiClient.list({});
      expect(result).toEqual(emptyPage);
    });
  });

  describe("get(runId)", () => {
    it("calls /backtests/{runId}", async () => {
      mockApiFetch.mockResolvedValueOnce(stubRun);
      await BacktestsApiClient.get("run-1");
      expect(mockApiFetch).toHaveBeenCalledWith("/backtests/run-1");
    });

    it("returns the run detail", async () => {
      mockApiFetch.mockResolvedValueOnce(stubRun);
      const result = await BacktestsApiClient.get("run-1");
      expect(result).toEqual(stubRun);
    });
  });

  describe("create(data)", () => {
    it("POSTs to /backtests/", async () => {
      const payload = { strategy_id: "s1", date_from: "2024-01-01T00:00:00Z", date_to: "2024-03-01T23:59:59Z" };
      mockApiFetch.mockResolvedValueOnce({ run_id: "r1", status: "pending" });
      await BacktestsApiClient.create(payload);
      expect(mockApiFetch).toHaveBeenCalledWith("/backtests/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    });
  });

  describe("getTrades(runId)", () => {
    it("calls /backtests/{runId}/trades", async () => {
      mockApiFetch.mockResolvedValueOnce([]);
      await BacktestsApiClient.getTrades("run-1");
      expect(mockApiFetch).toHaveBeenCalledWith("/backtests/run-1/trades");
    });
  });

  describe("getTradeDetail(runId, tradeIdx)", () => {
    it("calls /backtests/{runId}/trades/{tradeIdx}", async () => {
      mockApiFetch.mockResolvedValueOnce({});
      await BacktestsApiClient.getTradeDetail("run-1", 2);
      expect(mockApiFetch).toHaveBeenCalledWith("/backtests/run-1/trades/2");
    });
  });

  describe("getEquityCurve(runId)", () => {
    it("calls /backtests/{runId}/equity-curve", async () => {
      mockApiFetch.mockResolvedValueOnce([]);
      await BacktestsApiClient.getEquityCurve("run-1");
      expect(mockApiFetch).toHaveBeenCalledWith("/backtests/run-1/equity-curve");
    });
  });

  describe("getBenchmarkEquityCurve(runId)", () => {
    it("calls /backtests/{runId}/benchmark-equity-curve", async () => {
      mockApiFetch.mockResolvedValueOnce([]);
      await BacktestsApiClient.getBenchmarkEquityCurve("run-1");
      expect(mockApiFetch).toHaveBeenCalledWith("/backtests/run-1/benchmark-equity-curve");
    });
  });

  describe("getDataQuality(asset, timeframe, dateFrom, dateTo)", () => {
    it("calls /backtests/data-quality with encoded asset and ISO datetimes", async () => {
      mockApiFetch.mockResolvedValueOnce({});
      await BacktestsApiClient.getDataQuality("BTC/USDT", "1h", "2024-01-01", "2024-03-01");
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("/backtests/data-quality");
      expect(url).toContain("BTC%2FUSDT");
      expect(url).toContain("timeframe=1h");
      expect(url).toContain("date_from=2024-01-01T00:00:00Z");
      expect(url).toContain("date_to=2024-03-01T23:59:59Z");
    });
  });

  describe("getDataCompleteness(asset, timeframe)", () => {
    it("calls /backtests/data-completeness with encoded asset", async () => {
      mockApiFetch.mockResolvedValueOnce({});
      await BacktestsApiClient.getDataCompleteness("ETH/USDT", "4h");
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("/backtests/data-completeness");
      expect(url).toContain("ETH%2FUSDT");
      expect(url).toContain("timeframe=4h");
    });
  });

  describe("createBatch(data)", () => {
    it("POSTs to /backtests/batch", async () => {
      const payload = { strategy_id: "s1", periods: ["2023-Q1", "2023-Q2"] };
      mockApiFetch.mockResolvedValueOnce({ batch_id: "b1", runs: [] });
      await BacktestsApiClient.createBatch(payload);
      expect(mockApiFetch).toHaveBeenCalledWith("/backtests/batch", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    });
  });

  describe("getBatchStatus(batchId)", () => {
    it("calls /backtests/batch/{batchId}", async () => {
      mockApiFetch.mockResolvedValueOnce({ batch_id: "b1", runs: [] });
      await BacktestsApiClient.getBatchStatus("batch-1");
      expect(mockApiFetch).toHaveBeenCalledWith("/backtests/batch/batch-1");
    });
  });

  describe("compare(runIds)", () => {
    it("POSTs to /backtests/compare with run_ids array", async () => {
      mockApiFetch.mockResolvedValueOnce({ runs: [] });
      await BacktestsApiClient.compare(["r1", "r2"]);
      expect(mockApiFetch).toHaveBeenCalledWith("/backtests/compare", {
        method: "POST",
        body: JSON.stringify({ run_ids: ["r1", "r2"] }),
      });
    });
  });

  describe("createShareLink(runId, data)", () => {
    it("POSTs to /backtests/{runId}/share-links", async () => {
      mockApiFetch.mockResolvedValueOnce({ url: "https://example.com/share/abc", token: "abc", expires_at: null });
      await BacktestsApiClient.createShareLink("run-1", { expires_at: null });
      expect(mockApiFetch).toHaveBeenCalledWith("/backtests/run-1/share-links", {
        method: "POST",
        body: JSON.stringify({ expires_at: null }),
      });
    });
  });
});

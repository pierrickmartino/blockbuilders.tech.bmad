import { describe, it, expect, vi, beforeEach } from "vitest";
import { StrategyTemplatesApiClient, strategyTemplatesKeys } from "@/lib/api/strategy-templates-client";
import * as api from "@/lib/api/internal/fetch";
import type { StrategyTemplate } from "@/types/strategy-template";
import type { Strategy } from "@/types/strategy";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);

const mockTemplate: StrategyTemplate = {
  id: "tmpl-1",
  name: "RSI Momentum",
  description: "A momentum strategy using RSI",
  logic_summary: "Buy when RSI < 30, sell when RSI > 70",
  use_cases: ["trending markets"],
  parameter_ranges: { period: "14" },
  asset: "BTC/USDT",
  timeframe: "1d",
  difficulty: "beginner",
  sort_order: 1,
  teaches_description: null,
  created_at: "2024-01-01T00:00:00Z",
};

const mockStrategy: Strategy = {
  id: "strat-1",
  name: "RSI Momentum Copy",
  asset: "BTC/USDT",
  timeframe: "1d",
  entry_path: null,
  is_archived: false,
  auto_update_enabled: false,
  auto_update_lookback_days: 30,
  last_auto_run_at: null,
  digest_email_enabled: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("strategyTemplatesKeys", () => {
  it("all() returns root scope key", () => {
    expect(strategyTemplatesKeys.all()).toEqual(["strategy-templates"]);
  });

  it("lists() returns list-scoped key", () => {
    expect(strategyTemplatesKeys.lists()).toEqual(["strategy-templates", "list"]);
  });

  it("list() returns parameterless list key", () => {
    expect(strategyTemplatesKeys.list()).toEqual(["strategy-templates", "list", {}]);
  });

  it("detail(id) embeds id in the key", () => {
    expect(strategyTemplatesKeys.detail("tmpl-1")).toEqual(["strategy-templates", "detail", "tmpl-1"]);
  });
});

describe("StrategyTemplatesApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue([]);
  });

  describe("list()", () => {
    it("calls GET /strategy-templates/", async () => {
      await StrategyTemplatesApiClient.list();
      expect(mockApiFetch).toHaveBeenCalledWith("/strategy-templates/");
    });

    it("returns the array from apiFetch", async () => {
      mockApiFetch.mockResolvedValueOnce([mockTemplate]);
      const result = await StrategyTemplatesApiClient.list();
      expect(result).toEqual([mockTemplate]);
    });
  });

  describe("clone()", () => {
    it("calls POST /strategy-templates/{id}/clone", async () => {
      mockApiFetch.mockResolvedValueOnce(mockStrategy);
      await StrategyTemplatesApiClient.clone("tmpl-1");
      expect(mockApiFetch).toHaveBeenCalledWith("/strategy-templates/tmpl-1/clone", {
        method: "POST",
      });
    });

    it("returns the cloned strategy", async () => {
      mockApiFetch.mockResolvedValueOnce(mockStrategy);
      const result = await StrategyTemplatesApiClient.clone("tmpl-1");
      expect(result).toEqual(mockStrategy);
    });
  });
});

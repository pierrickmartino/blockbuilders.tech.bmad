import { describe, it, expect, vi, beforeEach } from "vitest";
import { StrategiesApiClient, strategiesKeys } from "@/lib/api/strategies-client";
import * as api from "@/lib/api/internal/fetch";
import type {
  Strategy,
  StrategyVersion,
  StrategyVersionDetail,
  StrategyDraft,
  StrategyCreateRequest,
  StrategyUpdateRequest,
  StrategyDraftFromNlRequest,
  StrategyDraftFromNlResponse,
} from "@/types/strategy";
import type { ValidationResponse } from "@/types/canvas";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);
const mockApiFetchVoid = vi.mocked(api.apiFetchVoid);

const mockStrategy: Strategy = {
  id: "strat-1",
  name: "Test Strategy",
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

const mockVersion: StrategyVersion = {
  id: "ver-1",
  version_number: 1,
  created_at: "2024-01-01T00:00:00Z",
};

const mockVersionDetail: StrategyVersionDetail = {
  ...mockVersion,
  definition_json: { blocks: [], connections: [] },
};

const mockDraft: StrategyDraft = {
  strategy_id: "strategy-1",
  definition_json: { blocks: [], connections: [] },
  updated_at: "2024-01-01T00:00:00Z",
};

const bulkResponse = { success_count: 2, failed_count: 0, failed_ids: [] };

describe("strategiesKeys", () => {
  it("all() returns root scope key", () => {
    expect(strategiesKeys.all()).toEqual(["strategies"]);
  });

  it("lists() returns list-scoped key", () => {
    expect(strategiesKeys.lists()).toEqual(["strategies", "list"]);
  });

  it("list(filters) embeds the filter object in the key", () => {
    const filters = { include_archived: true };
    expect(strategiesKeys.list(filters)).toEqual(["strategies", "list", filters]);
  });

  it("detail(id) embeds id in the key", () => {
    expect(strategiesKeys.detail("strat-1")).toEqual(["strategies", "detail", "strat-1"]);
  });

  it("versions(id) scopes version list under strategy id", () => {
    expect(strategiesKeys.versions("strat-1")).toEqual(["strategies", "strat-1", "versions"]);
  });

  it("draft(id) scopes draft under strategy id", () => {
    expect(strategiesKeys.draft("strat-1")).toEqual(["strategies", "strat-1", "draft"]);
  });
});

describe("StrategiesApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue([]);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe("list()", () => {
    it("calls GET /strategies/ with no params by default", async () => {
      await StrategiesApiClient.list({});
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/");
    });

    it("appends include_archived=true when specified", async () => {
      await StrategiesApiClient.list({ include_archived: true });
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("include_archived=true"),
      );
    });

    it("returns the array from apiFetch", async () => {
      mockApiFetch.mockResolvedValueOnce([mockStrategy]);
      const result = await StrategiesApiClient.list({});
      expect(result).toEqual([mockStrategy]);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe("get()", () => {
    it("calls GET /strategies/{id}", async () => {
      mockApiFetch.mockResolvedValueOnce(mockStrategy);
      await StrategiesApiClient.get("strat-1");
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/strat-1");
    });

    it("returns the strategy", async () => {
      mockApiFetch.mockResolvedValueOnce(mockStrategy);
      const result = await StrategiesApiClient.get("strat-1");
      expect(result).toEqual(mockStrategy);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe("create()", () => {
    it("calls POST /strategies/ with the request body", async () => {
      const req: StrategyCreateRequest = {
        name: "New Strategy",
        asset: "BTC/USDT",
        timeframe: "1d",
      };
      mockApiFetch.mockResolvedValueOnce(mockStrategy);
      await StrategiesApiClient.create(req);
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/", {
        method: "POST",
        body: JSON.stringify(req),
      });
    });

    it("returns the created strategy", async () => {
      mockApiFetch.mockResolvedValueOnce(mockStrategy);
      const result = await StrategiesApiClient.create({
        name: "New Strategy",
        asset: "BTC/USDT",
        timeframe: "1d",
      });
      expect(result).toEqual(mockStrategy);
    });
  });

  // ── draftFromNl ──────────────────────────────────────────────────────────

  describe("draftFromNl()", () => {
    it("calls POST /strategies/draft-from-nl with the request body", async () => {
      const req: StrategyDraftFromNlRequest = {
        nl_text: "buy when RSI is oversold",
        asset: "BTC/USDT",
        timeframe: "1d",
      };
      const res: StrategyDraftFromNlResponse = {
        outcome: "success",
        strategy_id: "strat-1",
        reason: null,
      };
      mockApiFetch.mockResolvedValueOnce(res);
      const result = await StrategiesApiClient.draftFromNl(req);
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/draft-from-nl", {
        method: "POST",
        body: JSON.stringify(req),
      });
      expect(result).toEqual(res);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe("update()", () => {
    it("calls PATCH /strategies/{id} with the patch body", async () => {
      const patch: StrategyUpdateRequest = { name: "Renamed" };
      mockApiFetch.mockResolvedValueOnce({ ...mockStrategy, name: "Renamed" });
      await StrategiesApiClient.update("strat-1", patch);
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/strat-1", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    });

    it("returns the updated strategy", async () => {
      const updated = { ...mockStrategy, name: "Renamed" };
      mockApiFetch.mockResolvedValueOnce(updated);
      const result = await StrategiesApiClient.update("strat-1", { name: "Renamed" });
      expect(result).toEqual(updated);
    });
  });

  // ── duplicate ─────────────────────────────────────────────────────────────

  describe("duplicate()", () => {
    it("calls POST /strategies/{id}/duplicate", async () => {
      mockApiFetch.mockResolvedValueOnce(mockStrategy);
      await StrategiesApiClient.duplicate("strat-1");
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/strat-1/duplicate", {
        method: "POST",
      });
    });

    it("returns the duplicated strategy", async () => {
      mockApiFetch.mockResolvedValueOnce(mockStrategy);
      const result = await StrategiesApiClient.duplicate("strat-1");
      expect(result).toEqual(mockStrategy);
    });
  });

  // ── versions ──────────────────────────────────────────────────────────────

  describe("listVersions()", () => {
    it("calls GET /strategies/{id}/versions", async () => {
      mockApiFetch.mockResolvedValueOnce([mockVersion]);
      await StrategiesApiClient.listVersions("strat-1");
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/strat-1/versions");
    });

    it("returns the versions array", async () => {
      mockApiFetch.mockResolvedValueOnce([mockVersion]);
      const result = await StrategiesApiClient.listVersions("strat-1");
      expect(result).toEqual([mockVersion]);
    });
  });

  describe("getVersionDetail()", () => {
    it("calls GET /strategies/{id}/versions/{n}", async () => {
      mockApiFetch.mockResolvedValueOnce(mockVersionDetail);
      await StrategiesApiClient.getVersionDetail("strat-1", 1);
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/strat-1/versions/1");
    });

    it("returns the version detail", async () => {
      mockApiFetch.mockResolvedValueOnce(mockVersionDetail);
      const result = await StrategiesApiClient.getVersionDetail("strat-1", 1);
      expect(result).toEqual(mockVersionDetail);
    });
  });

  // ── draft ─────────────────────────────────────────────────────────────────

  describe("getDraft()", () => {
    it("calls GET /strategies/{id}/draft", async () => {
      mockApiFetch.mockResolvedValueOnce(mockDraft);
      await StrategiesApiClient.getDraft("strat-1");
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/strat-1/draft");
    });

    it("returns the draft", async () => {
      mockApiFetch.mockResolvedValueOnce(mockDraft);
      const result = await StrategiesApiClient.getDraft("strat-1");
      expect(result).toEqual(mockDraft);
    });
  });

  describe("putDraft()", () => {
    it("calls PUT /strategies/{id}/draft with definition_json body", async () => {
      const definition = { blocks: [], connections: [] };
      await StrategiesApiClient.putDraft("strat-1", definition);
      expect(mockApiFetchVoid).toHaveBeenCalledWith("/strategies/strat-1/draft", {
        method: "PUT",
        body: JSON.stringify({ definition_json: definition }),
      });
    });
  });

  describe("validateDraft()", () => {
    it("calls POST /strategies/{id}/draft/validate", async () => {
      const mockValidation = { status: "valid", errors: [] };
      mockApiFetch.mockResolvedValueOnce(mockValidation);
      await StrategiesApiClient.validateDraft("strat-1");
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/strategies/strat-1/draft/validate",
        { method: "POST" },
      );
    });
  });

  describe("validate()", () => {
    it("calls POST /strategies/{id}/validate with definition body", async () => {
      const definition = { blocks: [], connections: [] };
      const mockValidation: ValidationResponse = { status: "valid", errors: [] };
      mockApiFetch.mockResolvedValueOnce(mockValidation);
      await StrategiesApiClient.validate("strat-1", definition);
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/strat-1/validate", {
        method: "POST",
        body: JSON.stringify(definition),
      });
    });

    it("returns the validation response", async () => {
      const mockValidation: ValidationResponse = { status: "invalid", errors: [{ message: "err", block_id: "b1", code: "ERR" }] };
      mockApiFetch.mockResolvedValueOnce(mockValidation);
      const result = await StrategiesApiClient.validate("strat-1", {});
      expect(result).toEqual(mockValidation);
    });
  });

  // ── bulk ──────────────────────────────────────────────────────────────────

  describe("bulkArchive()", () => {
    it("calls POST /strategies/bulk/archive with strategy_ids body", async () => {
      mockApiFetch.mockResolvedValueOnce(bulkResponse);
      await StrategiesApiClient.bulkArchive(["strat-1", "strat-2"]);
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/bulk/archive", {
        method: "POST",
        body: JSON.stringify({ strategy_ids: ["strat-1", "strat-2"] }),
      });
    });

    it("returns the bulk response", async () => {
      mockApiFetch.mockResolvedValueOnce(bulkResponse);
      const result = await StrategiesApiClient.bulkArchive(["strat-1"]);
      expect(result).toEqual(bulkResponse);
    });
  });

  describe("bulkTag()", () => {
    it("calls POST /strategies/bulk/tag with strategy_ids and tag_ids body", async () => {
      mockApiFetch.mockResolvedValueOnce(bulkResponse);
      await StrategiesApiClient.bulkTag(["strat-1"], ["tag-1"]);
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/bulk/tag", {
        method: "POST",
        body: JSON.stringify({ strategy_ids: ["strat-1"], tag_ids: ["tag-1"] }),
      });
    });
  });

  describe("bulkDelete()", () => {
    it("calls POST /strategies/bulk/delete with strategy_ids body", async () => {
      mockApiFetch.mockResolvedValueOnce(bulkResponse);
      await StrategiesApiClient.bulkDelete(["strat-1", "strat-2"]);
      expect(mockApiFetch).toHaveBeenCalledWith("/strategies/bulk/delete", {
        method: "POST",
        body: JSON.stringify({ strategy_ids: ["strat-1", "strat-2"] }),
      });
    });
  });
});

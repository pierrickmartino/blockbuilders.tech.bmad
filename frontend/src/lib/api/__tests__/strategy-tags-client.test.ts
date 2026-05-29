import { describe, it, expect, vi, beforeEach } from "vitest";
import { StrategyTagsApiClient, strategyTagsKeys } from "@/lib/api/strategy-tags-client";
import * as api from "@/lib/api/internal/fetch";
import type { StrategyTag } from "@/types/strategy";

vi.mock("@/lib/api/internal/fetch", () => ({
  apiFetch: vi.fn(),
  apiFetchVoid: vi.fn(),
}));

const mockApiFetch = vi.mocked(api.apiFetch);

const mockTag: StrategyTag = {
  id: "tag-1",
  name: "momentum",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("strategyTagsKeys", () => {
  it("all() returns root scope key", () => {
    expect(strategyTagsKeys.all()).toEqual(["strategy-tags"]);
  });

  it("lists() returns list-scoped key", () => {
    expect(strategyTagsKeys.lists()).toEqual(["strategy-tags", "list"]);
  });

  it("list() returns parameterless list key", () => {
    expect(strategyTagsKeys.list()).toEqual(["strategy-tags", "list", {}]);
  });
});

describe("StrategyTagsApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue([]);
  });

  describe("list()", () => {
    it("calls GET /strategy-tags", async () => {
      await StrategyTagsApiClient.list();
      expect(mockApiFetch).toHaveBeenCalledWith("/strategy-tags");
    });

    it("returns the array from apiFetch", async () => {
      mockApiFetch.mockResolvedValueOnce([mockTag]);
      const result = await StrategyTagsApiClient.list();
      expect(result).toEqual([mockTag]);
    });
  });

  describe("create()", () => {
    it("calls POST /strategy-tags with the name body", async () => {
      mockApiFetch.mockResolvedValueOnce(mockTag);
      await StrategyTagsApiClient.create("momentum");
      expect(mockApiFetch).toHaveBeenCalledWith("/strategy-tags", {
        method: "POST",
        body: JSON.stringify({ name: "momentum" }),
      });
    });

    it("returns the created tag", async () => {
      mockApiFetch.mockResolvedValueOnce(mockTag);
      const result = await StrategyTagsApiClient.create("momentum");
      expect(result).toEqual(mockTag);
    });
  });
});

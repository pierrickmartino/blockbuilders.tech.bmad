import { apiFetch, apiFetchVoid } from "@/lib/api";
import type {
  Strategy,
  StrategyVersion,
  StrategyVersionDetail,
  StrategyDraft,
  StrategyCreateRequest,
  StrategyUpdateRequest,
} from "@/types/strategy";
import type { ValidationResponse } from "@/types/canvas";

interface StrategyListFilters {
  include_archived?: boolean;
}

interface BulkResponse {
  success_count: number;
  failed_count: number;
  failed_ids: string[];
}

export const strategiesKeys = {
  all: (): string[] => ["strategies"],
  lists: (): string[] => ["strategies", "list"],
  list: (filters: Record<string, unknown>): unknown[] => ["strategies", "list", filters],
  detail: (id: string): unknown[] => ["strategies", "detail", id],
  versions: (id: string): unknown[] => ["strategies", id, "versions"],
  draft: (id: string): unknown[] => ["strategies", id, "draft"],
};

export const StrategiesApiClient = {
  async list(filters: StrategyListFilters): Promise<Strategy[]> {
    const params = new URLSearchParams();
    if (filters.include_archived) {
      params.set("include_archived", "true");
    }
    const qs = params.toString();
    return apiFetch<Strategy[]>(qs ? `/strategies/?${qs}` : "/strategies/");
  },

  async get(id: string): Promise<Strategy> {
    return apiFetch<Strategy>(`/strategies/${id}`);
  },

  async create(data: StrategyCreateRequest): Promise<Strategy> {
    return apiFetch<Strategy>("/strategies/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: StrategyUpdateRequest): Promise<Strategy> {
    return apiFetch<Strategy>(`/strategies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async duplicate(id: string): Promise<Strategy> {
    return apiFetch<Strategy>(`/strategies/${id}/duplicate`, {
      method: "POST",
    });
  },

  async listVersions(id: string): Promise<StrategyVersion[]> {
    return apiFetch<StrategyVersion[]>(`/strategies/${id}/versions`);
  },

  async getVersionDetail(id: string, versionNumber: number): Promise<StrategyVersionDetail> {
    return apiFetch<StrategyVersionDetail>(`/strategies/${id}/versions/${versionNumber}`);
  },

  async createVersion(id: string, definition: Record<string, unknown>): Promise<StrategyVersion> {
    return apiFetch<StrategyVersion>(`/strategies/${id}/versions`, {
      method: "POST",
      body: JSON.stringify({ definition }),
    });
  },

  async archiveVersion(id: string, versionNumber: number): Promise<void> {
    await apiFetchVoid(`/strategies/${id}/versions/${versionNumber}/archive`, {
      method: "PATCH",
    });
  },

  async getDraft(id: string): Promise<StrategyDraft> {
    return apiFetch<StrategyDraft>(`/strategies/${id}/draft`);
  },

  async putDraft(id: string, definition: Record<string, unknown>): Promise<void> {
    await apiFetchVoid(`/strategies/${id}/draft`, {
      method: "PUT",
      body: JSON.stringify({ definition_json: definition }),
    });
  },

  async publishDraft(id: string): Promise<void> {
    await apiFetchVoid(`/strategies/${id}/draft/publish`, {
      method: "POST",
    });
  },

  async validateDraft(id: string): Promise<{ status: string; errors: unknown[] }> {
    return apiFetch(`/strategies/${id}/draft/validate`, {
      method: "POST",
    });
  },

  async validate(id: string, definition: Record<string, unknown>): Promise<ValidationResponse> {
    return apiFetch<ValidationResponse>(`/strategies/${id}/validate`, {
      method: "POST",
      body: JSON.stringify(definition),
    });
  },

  async bulkArchive(strategyIds: string[]): Promise<BulkResponse> {
    return apiFetch<BulkResponse>("/strategies/bulk/archive", {
      method: "POST",
      body: JSON.stringify({ strategy_ids: strategyIds }),
    });
  },

  async bulkTag(strategyIds: string[], tagIds: string[]): Promise<BulkResponse> {
    return apiFetch<BulkResponse>("/strategies/bulk/tag", {
      method: "POST",
      body: JSON.stringify({ strategy_ids: strategyIds, tag_ids: tagIds }),
    });
  },

  async bulkDelete(strategyIds: string[]): Promise<BulkResponse> {
    return apiFetch<BulkResponse>("/strategies/bulk/delete", {
      method: "POST",
      body: JSON.stringify({ strategy_ids: strategyIds }),
    });
  },
};

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRestoreSnapshot } from "@/hooks/useRestoreSnapshot";
import { StrategiesApiClient } from "@/lib/api/strategies-client";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api/strategies-client", () => ({
  StrategiesApiClient: {
    getVersionDetail: vi.fn(),
    putDraft: vi.fn(),
  },
}));

const mockGetVersionDetail = vi.mocked(StrategiesApiClient.getVersionDetail);
const mockPutDraft = vi.mocked(StrategiesApiClient.putDraft);

const STRATEGY_ID = "strat-abc";
const VERSION_NUMBER = 3;
const DEFINITION = { nodes: [], edges: [] };

describe("useRestoreSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVersionDetail.mockResolvedValue({
      id: "ver-1",
      version_number: VERSION_NUMBER,
      created_at: "2024-01-01T00:00:00Z",
      definition_json: DEFINITION,
    });
    mockPutDraft.mockResolvedValue(undefined);
  });

  it("fetches the version detail then writes to the draft", async () => {
    const { result } = renderHook(() => useRestoreSnapshot(STRATEGY_ID));

    await act(async () => {
      await result.current.restoreFromVersion(VERSION_NUMBER);
    });

    expect(mockGetVersionDetail).toHaveBeenCalledWith(STRATEGY_ID, VERSION_NUMBER);
    expect(mockPutDraft).toHaveBeenCalledWith(STRATEGY_ID, DEFINITION);
  });

  it("navigates to the strategy editor after restoring", async () => {
    const { result } = renderHook(() => useRestoreSnapshot(STRATEGY_ID));

    await act(async () => {
      await result.current.restoreFromVersion(VERSION_NUMBER);
    });

    expect(mockPush).toHaveBeenCalledWith(`/strategies/${STRATEGY_ID}`);
  });

  it("starts with isRestoring false and returns false after completing", async () => {
    const { result } = renderHook(() => useRestoreSnapshot(STRATEGY_ID));
    expect(result.current.isRestoring).toBe(false);

    await act(async () => {
      await result.current.restoreFromVersion(VERSION_NUMBER);
    });

    expect(result.current.isRestoring).toBe(false);
  });
});

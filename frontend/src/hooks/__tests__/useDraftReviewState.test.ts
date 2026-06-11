import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDraftReviewState } from "../useDraftReviewState";
import { trackEvent } from "@/lib/analytics";
import { isDraftUnderReview, resolveDraftReview } from "@/lib/draft-review-storage";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/draft-review-storage", () => ({
  isDraftUnderReview: vi.fn(),
  resolveDraftReview: vi.fn(),
}));

const mockTrackEvent = vi.mocked(trackEvent);
const mockIsDraftUnderReview = vi.mocked(isDraftUnderReview);
const mockResolveDraftReview = vi.mocked(resolveDraftReview);

describe("useDraftReviewState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("starts under review when entry path is nl_wedge and the strategy is flagged in storage", () => {
      // Arrange
      mockIsDraftUnderReview.mockReturnValue(true);

      // Act
      const { result } = renderHook(() =>
        useDraftReviewState({ strategyId: "strat-1", entryPath: "nl_wedge" })
      );

      // Assert
      expect(result.current.isUnderReview).toBe(true);
      expect(result.current.outcome).toBeNull();
    });

    it("does not start under review when entry path is not nl_wedge", () => {
      // Arrange
      mockIsDraftUnderReview.mockReturnValue(true);

      // Act
      const { result } = renderHook(() =>
        useDraftReviewState({ strategyId: "strat-1", entryPath: "wizard" })
      );

      // Assert
      expect(result.current.isUnderReview).toBe(false);
    });

    it("does not start under review when storage has no flag for the strategy", () => {
      // Arrange
      mockIsDraftUnderReview.mockReturnValue(false);

      // Act
      const { result } = renderHook(() =>
        useDraftReviewState({ strategyId: "strat-1", entryPath: "nl_wedge" })
      );

      // Assert
      expect(result.current.isUnderReview).toBe(false);
    });
  });

  describe("accept", () => {
    it("ends review, clears storage, and logs nl_draft_outcome = accepted", () => {
      // Arrange
      mockIsDraftUnderReview.mockReturnValue(true);
      const { result } = renderHook(() =>
        useDraftReviewState({ strategyId: "strat-1", entryPath: "nl_wedge", userId: "user-1" })
      );

      // Act
      act(() => {
        result.current.accept();
      });

      // Assert
      expect(result.current.isUnderReview).toBe(false);
      expect(result.current.outcome).toBe("accepted");
      expect(mockResolveDraftReview).toHaveBeenCalledWith("strat-1");
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "nl_draft_outcome",
        {
          strategy_id: "strat-1",
          outcome: "accepted",
          entry_path: "nl_wedge",
          authoring_mode: "nl",
        },
        "user-1"
      );
    });

    it("is a no-op when the draft is not under review", () => {
      // Arrange
      mockIsDraftUnderReview.mockReturnValue(false);
      const { result } = renderHook(() =>
        useDraftReviewState({ strategyId: "strat-1", entryPath: "nl_wedge" })
      );

      // Act
      act(() => {
        result.current.accept();
      });

      // Assert
      expect(result.current.outcome).toBeNull();
      expect(mockResolveDraftReview).not.toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe("edit", () => {
    it("ends review, clears storage, and logs nl_draft_outcome = edited on click", () => {
      // Arrange
      mockIsDraftUnderReview.mockReturnValue(true);
      const { result } = renderHook(() =>
        useDraftReviewState({ strategyId: "strat-1", entryPath: "nl_wedge", userId: "user-1" })
      );

      // Act
      act(() => {
        result.current.edit();
      });

      // Assert
      expect(result.current.isUnderReview).toBe(false);
      expect(result.current.outcome).toBe("edited");
      expect(mockResolveDraftReview).toHaveBeenCalledWith("strat-1");
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "nl_draft_outcome",
        {
          strategy_id: "strat-1",
          outcome: "edited",
          entry_path: "nl_wedge",
          authoring_mode: "nl",
        },
        "user-1"
      );
    });
  });

  describe("exit guard (isUnderReview arm/disarm)", () => {
    it("is armed (isUnderReview = true) while a disposition is pending", () => {
      // Arrange
      mockIsDraftUnderReview.mockReturnValue(true);

      // Act
      const { result } = renderHook(() =>
        useDraftReviewState({ strategyId: "strat-1", entryPath: "nl_wedge" })
      );

      // Assert
      expect(result.current.isUnderReview).toBe(true);
    });

    it.each(["accept", "edit", "keep", "reject"] as const)(
      "disarms (isUnderReview = false) once %s is chosen",
      (method) => {
        // Arrange
        mockIsDraftUnderReview.mockReturnValue(true);
        const { result } = renderHook(() =>
          useDraftReviewState({ strategyId: "strat-1", entryPath: "nl_wedge" })
        );
        expect(result.current.isUnderReview).toBe(true);

        // Act
        act(() => {
          result.current[method]();
        });

        // Assert
        expect(result.current.isUnderReview).toBe(false);
      }
    );
  });
});

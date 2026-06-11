import { describe, it, expect, beforeEach } from "vitest";
import { markDraftUnderReview, isDraftUnderReview, resolveDraftReview } from "../draft-review-storage";

describe("draft-review-storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("markDraftUnderReview / isDraftUnderReview", () => {
    it("returns false for a strategy that was never marked", () => {
      // Arrange
      const strategyId = "strategy-1";

      // Act
      const result = isDraftUnderReview(strategyId);

      // Assert
      expect(result).toBe(false);
    });

    it("returns true after a strategy is marked under review", () => {
      // Arrange
      const strategyId = "strategy-1";

      // Act
      markDraftUnderReview(strategyId);

      // Assert
      expect(isDraftUnderReview(strategyId)).toBe(true);
    });

    it("scopes the under-review flag by strategy id", () => {
      // Arrange
      markDraftUnderReview("strategy-1");

      // Act / Assert
      expect(isDraftUnderReview("strategy-2")).toBe(false);
    });
  });

  describe("resolveDraftReview", () => {
    it("clears the under-review flag for the strategy", () => {
      // Arrange
      const strategyId = "strategy-1";
      markDraftUnderReview(strategyId);

      // Act
      resolveDraftReview(strategyId);

      // Assert
      expect(isDraftUnderReview(strategyId)).toBe(false);
    });

    it("is a no-op when the strategy was never marked", () => {
      // Arrange
      const strategyId = "strategy-1";

      // Act / Assert
      expect(() => resolveDraftReview(strategyId)).not.toThrow();
      expect(isDraftUnderReview(strategyId)).toBe(false);
    });
  });
});

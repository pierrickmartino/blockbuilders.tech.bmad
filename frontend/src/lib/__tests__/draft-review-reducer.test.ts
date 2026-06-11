import { describe, it, expect } from "vitest";
import {
  draftReviewReducer,
  initialDraftReviewState,
  type DraftReviewState,
} from "../draft-review-reducer";

describe("draftReviewReducer", () => {
  describe("INIT", () => {
    it("marks the draft as under review when not yet reviewed", () => {
      // Arrange
      const state = initialDraftReviewState;

      // Act
      const next = draftReviewReducer(state, { type: "INIT" });

      // Assert
      expect(next).toEqual({ isUnderReview: true, outcome: null });
    });

    it("does not mutate the previous state", () => {
      // Arrange
      const state = initialDraftReviewState;

      // Act
      draftReviewReducer(state, { type: "INIT" });

      // Assert
      expect(state).toEqual({ isUnderReview: false, outcome: null });
    });

    it("is a no-op when already under review", () => {
      // Arrange
      const state: DraftReviewState = { isUnderReview: true, outcome: null };

      // Act
      const next = draftReviewReducer(state, { type: "INIT" });

      // Assert
      expect(next).toBe(state);
    });

    it("is a no-op when a disposition has already been recorded", () => {
      // Arrange
      const state: DraftReviewState = { isUnderReview: false, outcome: "accepted" };

      // Act
      const next = draftReviewReducer(state, { type: "INIT" });

      // Assert
      expect(next).toBe(state);
    });
  });

  describe("ACCEPT", () => {
    it("ends review with an accepted outcome", () => {
      // Arrange
      const state: DraftReviewState = { isUnderReview: true, outcome: null };

      // Act
      const next = draftReviewReducer(state, { type: "ACCEPT" });

      // Assert
      expect(next).toEqual({ isUnderReview: false, outcome: "accepted" });
    });

    it("is a no-op when not under review", () => {
      // Arrange
      const state: DraftReviewState = { isUnderReview: false, outcome: null };

      // Act
      const next = draftReviewReducer(state, { type: "ACCEPT" });

      // Assert
      expect(next).toBe(state);
    });

    it("does not mutate the previous state", () => {
      // Arrange
      const state: DraftReviewState = { isUnderReview: true, outcome: null };

      // Act
      draftReviewReducer(state, { type: "ACCEPT" });

      // Assert
      expect(state).toEqual({ isUnderReview: true, outcome: null });
    });
  });

  describe("EDIT", () => {
    it("ends review with an edited outcome", () => {
      // Arrange
      const state: DraftReviewState = { isUnderReview: true, outcome: null };

      // Act
      const next = draftReviewReducer(state, { type: "EDIT" });

      // Assert
      expect(next).toEqual({ isUnderReview: false, outcome: "edited" });
    });

    it("is a no-op when not under review", () => {
      // Arrange
      const state: DraftReviewState = { isUnderReview: false, outcome: null };

      // Act
      const next = draftReviewReducer(state, { type: "EDIT" });

      // Assert
      expect(next).toBe(state);
    });
  });

  describe("KEEP", () => {
    it("ends review with a kept outcome", () => {
      // Arrange
      const state: DraftReviewState = { isUnderReview: true, outcome: null };

      // Act
      const next = draftReviewReducer(state, { type: "KEEP" });

      // Assert
      expect(next).toEqual({ isUnderReview: false, outcome: "kept" });
    });

    it("is a no-op when not under review", () => {
      // Arrange
      const state: DraftReviewState = { isUnderReview: false, outcome: null };

      // Act
      const next = draftReviewReducer(state, { type: "KEEP" });

      // Assert
      expect(next).toBe(state);
    });
  });

  describe("REJECT", () => {
    it("ends review with a rejected outcome", () => {
      // Arrange
      const state: DraftReviewState = { isUnderReview: true, outcome: null };

      // Act
      const next = draftReviewReducer(state, { type: "REJECT" });

      // Assert
      expect(next).toEqual({ isUnderReview: false, outcome: "rejected" });
    });

    it("is a no-op when not under review", () => {
      // Arrange
      const state: DraftReviewState = { isUnderReview: false, outcome: null };

      // Act
      const next = draftReviewReducer(state, { type: "REJECT" });

      // Assert
      expect(next).toBe(state);
    });
  });
});

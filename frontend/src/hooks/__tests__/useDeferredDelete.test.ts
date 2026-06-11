import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toast } from "sonner";
import { useDeferredDelete, DEFERRED_DELETE_GRACE_MS } from "../useDeferredDelete";

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

const mockToast = vi.mocked(toast);

describe("useDeferredDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("commits the delete after the grace window elapses without undo", () => {
    // Arrange
    const onCommit = vi.fn();
    const { result } = renderHook(() => useDeferredDelete({ onCommit }));

    // Act
    act(() => {
      result.current.scheduleDelete("Strategy rejected");
    });
    act(() => {
      vi.advanceTimersByTime(DEFERRED_DELETE_GRACE_MS);
    });

    // Assert
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it("cancels the pending delete when Undo is clicked", () => {
    // Arrange
    const onCommit = vi.fn();
    const onUndo = vi.fn();
    const { result } = renderHook(() => useDeferredDelete({ onCommit, onUndo }));

    // Act
    act(() => {
      result.current.scheduleDelete("Strategy rejected");
    });
    const [, options] = mockToast.mock.calls[0];
    const { onClick } = (options as unknown as { action: { onClick: () => void } }).action;
    act(() => {
      onClick();
    });
    act(() => {
      vi.advanceTimersByTime(DEFERRED_DELETE_GRACE_MS);
    });

    // Assert
    expect(onCommit).not.toHaveBeenCalled();
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it("resolves to keep when an unmount interrupts the grace window", () => {
    // Arrange
    const onCommit = vi.fn();
    const { result, unmount } = renderHook(() => useDeferredDelete({ onCommit }));

    // Act
    act(() => {
      result.current.scheduleDelete("Strategy rejected");
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(DEFERRED_DELETE_GRACE_MS);
    });

    // Assert
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("shows an Undo toast for the grace window duration", () => {
    // Arrange
    const { result } = renderHook(() => useDeferredDelete({ onCommit: vi.fn() }));

    // Act
    act(() => {
      result.current.scheduleDelete("Strategy rejected");
    });

    // Assert
    expect(mockToast).toHaveBeenCalledWith(
      "Strategy rejected",
      expect.objectContaining({
        duration: DEFERRED_DELETE_GRACE_MS,
        action: expect.objectContaining({ label: "Undo" }),
      })
    );
  });
});

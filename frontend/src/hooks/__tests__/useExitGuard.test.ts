import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useExitGuard } from "../useExitGuard";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("useExitGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hard browser exit (beforeunload)", () => {
    it("prevents default on beforeunload while armed, resolving a hard exit to keep", () => {
      // Arrange
      const onKeep = vi.fn();
      const onDiscard = vi.fn();
      renderHook(() => useExitGuard({ isArmed: true, onKeep, onDiscard }));

      // Act
      const event = new Event("beforeunload", { cancelable: true });
      const preventDefault = vi.spyOn(event, "preventDefault");
      window.dispatchEvent(event);

      // Assert
      expect(preventDefault).toHaveBeenCalled();
      expect(onKeep).not.toHaveBeenCalled();
      expect(onDiscard).not.toHaveBeenCalled();
    });

    it("does not prevent default on beforeunload when not armed", () => {
      // Arrange
      renderHook(() => useExitGuard({ isArmed: false, onKeep: vi.fn(), onDiscard: vi.fn() }));

      // Act
      const event = new Event("beforeunload", { cancelable: true });
      const preventDefault = vi.spyOn(event, "preventDefault");
      window.dispatchEvent(event);

      // Assert
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("in-app navigation", () => {
    function clickLink(href: string) {
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.textContent = "Back to Strategies";
      document.body.appendChild(anchor);

      const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
      act(() => {
        anchor.dispatchEvent(event);
      });

      document.body.removeChild(anchor);
      return event;
    }

    it("intercepts an in-app link click while armed and opens the modal", () => {
      // Arrange
      const { result } = renderHook(() =>
        useExitGuard({ isArmed: true, onKeep: vi.fn(), onDiscard: vi.fn() })
      );

      // Act
      const event = clickLink("/strategies");

      // Assert
      expect(event.defaultPrevented).toBe(true);
      expect(result.current.isModalOpen).toBe(true);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("does not intercept link clicks when not armed", () => {
      // Arrange
      const { result } = renderHook(() =>
        useExitGuard({ isArmed: false, onKeep: vi.fn(), onDiscard: vi.fn() })
      );

      // Act
      const event = clickLink("/strategies");

      // Assert
      expect(event.defaultPrevented).toBe(false);
      expect(result.current.isModalOpen).toBe(false);
    });

    it("Keep closes the modal, resolves to kept, and proceeds with the pending navigation", () => {
      // Arrange
      const onKeep = vi.fn();
      const { result } = renderHook(() =>
        useExitGuard({ isArmed: true, onKeep, onDiscard: vi.fn() })
      );
      clickLink("/strategies");
      expect(result.current.isModalOpen).toBe(true);

      // Act
      act(() => {
        result.current.handleKeep();
      });

      // Assert
      expect(onKeep).toHaveBeenCalledOnce();
      expect(result.current.isModalOpen).toBe(false);
      expect(mockPush).toHaveBeenCalledWith("/strategies");
    });

    it("Discard closes the modal, runs the reject cascade, and proceeds with the pending navigation", async () => {
      // Arrange
      const onDiscard = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useExitGuard({ isArmed: true, onKeep: vi.fn(), onDiscard })
      );
      clickLink("/strategies");
      expect(result.current.isModalOpen).toBe(true);

      // Act
      await act(async () => {
        result.current.handleDiscard();
        await Promise.resolve();
      });

      // Assert
      expect(onDiscard).toHaveBeenCalledOnce();
      expect(result.current.isModalOpen).toBe(false);
      expect(mockPush).toHaveBeenCalledWith("/strategies");
    });

    it("Cancel closes the modal without resolving the draft or navigating", () => {
      // Arrange
      const onKeep = vi.fn();
      const onDiscard = vi.fn();
      const { result } = renderHook(() =>
        useExitGuard({ isArmed: true, onKeep, onDiscard })
      );
      clickLink("/strategies");
      expect(result.current.isModalOpen).toBe(true);

      // Act
      act(() => {
        result.current.handleCancel();
      });

      // Assert
      expect(result.current.isModalOpen).toBe(false);
      expect(onKeep).not.toHaveBeenCalled();
      expect(onDiscard).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});

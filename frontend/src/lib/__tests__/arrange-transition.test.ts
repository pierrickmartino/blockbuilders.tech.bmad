import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  applyArrangeTransition,
  ARRANGE_TRANSITION_CLASS,
  ARRANGE_TRANSITION_DURATION,
} from "../arrange-transition";

function makeContainer(): HTMLElement {
  return document.createElement("div");
}

describe("applyArrangeTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds the transition class immediately when called", () => {
    const el = makeContainer();
    applyArrangeTransition(el, false);
    expect(el.classList.contains(ARRANGE_TRANSITION_CLASS)).toBe(true);
  });

  it("removes the class after ARRANGE_TRANSITION_DURATION ms", () => {
    const el = makeContainer();
    applyArrangeTransition(el, false);
    vi.advanceTimersByTime(ARRANGE_TRANSITION_DURATION);
    expect(el.classList.contains(ARRANGE_TRANSITION_CLASS)).toBe(false);
  });

  it("class is still present just before the duration elapses", () => {
    const el = makeContainer();
    applyArrangeTransition(el, false);
    vi.advanceTimersByTime(ARRANGE_TRANSITION_DURATION - 1);
    expect(el.classList.contains(ARRANGE_TRANSITION_CLASS)).toBe(true);
  });

  it("does nothing when container is null", () => {
    expect(() => applyArrangeTransition(null, false)).not.toThrow();
  });

  it("skips class toggle when prefersReducedMotion is true", () => {
    const el = makeContainer();
    applyArrangeTransition(el, true);
    expect(el.classList.contains(ARRANGE_TRANSITION_CLASS)).toBe(false);
    vi.advanceTimersByTime(ARRANGE_TRANSITION_DURATION);
    expect(el.classList.contains(ARRANGE_TRANSITION_CLASS)).toBe(false);
  });

  it("does not fire a cleanup timer when reduced motion skips the class", () => {
    const spy = vi.spyOn(globalThis, "setTimeout");
    const el = makeContainer();
    applyArrangeTransition(el, true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("ARRANGE_TRANSITION_DURATION is at least 300 (covers the 300ms animation)", () => {
    expect(ARRANGE_TRANSITION_DURATION).toBeGreaterThanOrEqual(300);
  });

  it("ARRANGE_TRANSITION_CLASS is a non-empty string", () => {
    expect(typeof ARRANGE_TRANSITION_CLASS).toBe("string");
    expect(ARRANGE_TRANSITION_CLASS.length).toBeGreaterThan(0);
  });
});

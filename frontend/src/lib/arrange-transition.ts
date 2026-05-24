export const ARRANGE_TRANSITION_CLASS = "canvas-arranging";
export const ARRANGE_TRANSITION_DURATION = 320;

/**
 * Adds a CSS class to `container` that enables smooth node position transitions
 * during Auto-arrange, then removes it after ARRANGE_TRANSITION_DURATION ms.
 *
 * Skipped entirely when `prefersReducedMotion` is true so nodes update instantly.
 */
export function applyArrangeTransition(
  container: HTMLElement | null,
  prefersReducedMotion: boolean
): void {
  if (!container || prefersReducedMotion) return;
  container.classList.add(ARRANGE_TRANSITION_CLASS);
  setTimeout(() => container.classList.remove(ARRANGE_TRANSITION_CLASS), ARRANGE_TRANSITION_DURATION);
}

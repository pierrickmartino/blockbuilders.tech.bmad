import { Page, expect } from '@playwright/test';

/**
 * Mobile compatibility test utilities
 * Aligned with Tailwind breakpoints: md = 768px
 */

export const VIEWPORTS = {
  mobile: { width: 375, height: 667 }, // iPhone SE
  tablet: { width: 768, height: 1024 }, // iPad Mini
  desktop: { width: 1280, height: 720 }, // Desktop
} as const;

/**
 * Check if element is visible and not clipped/overflowing horizontally
 */
export async function expectNoHorizontalOverflow(
  page: Page,
  selector: string
): Promise<void> {
  const element = page.locator(selector).first();
  await expect(element).toBeVisible();

  const box = await element.boundingBox();
  if (!box) {
    throw new Error(`Element ${selector} has no bounding box`);
  }

  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error('No viewport size set');
  }

  // Element should not extend beyond viewport width
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
}

/**
 * Check if element is fully visible within viewport (no scrolling needed)
 */
export async function expectInViewport(
  page: Page,
  selector: string
): Promise<void> {
  const element = page.locator(selector).first();
  await expect(element).toBeVisible();

  const box = await element.boundingBox();
  if (!box) {
    throw new Error(`Element ${selector} has no bounding box`);
  }

  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error('No viewport size set');
  }

  // Element should be within viewport bounds
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
}

/**
 * Check for horizontal scroll on page body
 */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(() => document.body.clientWidth);

  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for rounding
}

/**
 * Check that mobile layout is active (table hidden, cards visible)
 */
export async function expectMobileLayout(page: Page): Promise<void> {
  // Mobile cards should be visible
  const mobileCards = page.locator('.md\\:hidden').first();
  await expect(mobileCards).toBeVisible();

  // Desktop table should be hidden
  const desktopTable = page.locator('.hidden.md\\:block').first();
  await expect(desktopTable).toBeHidden();
}

/**
 * Check that desktop layout is active (table visible, cards hidden)
 */
export async function expectDesktopLayout(page: Page): Promise<void> {
  // Desktop table should be visible
  const desktopTable = page.locator('.hidden.md\\:block').first();
  await expect(desktopTable).toBeVisible();

  // Mobile cards should be hidden
  const mobileCards = page.locator('.md\\:hidden').first();
  await expect(mobileCards).toBeHidden();
}

/**
 * Check that buttons are touch-friendly (min 44x44px per Apple/Android guidelines)
 */
export async function expectTouchFriendlyButtons(
  page: Page,
  selector: string
): Promise<void> {
  const buttons = page.locator(selector);
  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    const box = await button.boundingBox();

    if (box) {
      // Minimum touch target size: 44x44px
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
}

/**
 * Check that text is readable (not too small)
 */
export async function expectReadableText(
  page: Page,
  selector: string,
  minFontSize = 14
): Promise<void> {
  const element = page.locator(selector).first();
  const fontSize = await element.evaluate((el) =>
    parseFloat(window.getComputedStyle(el).fontSize)
  );

  expect(fontSize).toBeGreaterThanOrEqual(minFontSize);
}

import { test, expect } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  expectNoHorizontalScroll,
  expectMobileLayout,
  expectDesktopLayout,
  VIEWPORTS,
} from '../helpers/mobile-utils';

test.describe('Strategies Page - Mobile Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth state - adjust based on your auth setup
    await page.goto('/strategies');
    // Wait for content to load
    await page.waitForLoadState('networkidle');
  });

  test('should display mobile layout on small screens', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await expectMobileLayout(page);
  });

  test('should display desktop layout on large screens', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await expectDesktopLayout(page);
  });

  test('should not have horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await expectNoHorizontalScroll(page);
  });

  test('Browse Templates button should be fully visible on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await expectNoHorizontalOverflow(page, 'button:has-text("Browse Templates")');
  });

  test('Import button should be fully visible on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await expectNoHorizontalOverflow(page, 'button:has-text("Import")');
  });

  test('New Strategy button should be fully visible on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    // The purple "+" button for new strategy
    const newStrategyBtn = page.locator('a[href="/strategies/new"]').first();
    await expect(newStrategyBtn).toBeVisible();

    const box = await newStrategyBtn.boundingBox();
    const viewport = page.viewportSize();

    if (box && viewport) {
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    }
  });

  test('strategy cards should display correctly on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Wait for strategy cards to load
    const cards = page.locator('.md\\:hidden .rounded-lg.border');
    const count = await cards.count();

    if (count > 0) {
      // Check first card doesn't overflow
      const firstCard = cards.first();
      await expect(firstCard).toBeVisible();

      const box = await firstCard.boundingBox();
      const viewport = page.viewportSize();

      if (box && viewport) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('filter controls should be accessible on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Asset filter
    await expectNoHorizontalOverflow(page, 'button:has-text("All Assets")');

    // Performance filter
    await expectNoHorizontalOverflow(
      page,
      'button:has-text("All Performance")'
    );

    // Runs filter
    await expectNoHorizontalOverflow(page, 'button:has-text("All Runs")');
  });

  test('search input should be fully visible on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await expectNoHorizontalOverflow(page, 'input[placeholder*="Search"]');
  });

  test('should switch layouts at md breakpoint (768px)', async ({ page }) => {
    // Just below breakpoint - should show mobile
    await page.setViewportSize({ width: 767, height: 1024 });
    await expectMobileLayout(page);

    // At breakpoint - should show desktop
    await page.setViewportSize({ width: 768, height: 1024 });
    await expectDesktopLayout(page);
  });

  test('action buttons in strategy cards should be accessible on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Check if dropdown menu trigger exists and is visible
    const dropdownTrigger = page
      .locator('.md\\:hidden button[aria-label*="more"]')
      .first();

    if ((await dropdownTrigger.count()) > 0) {
      await expect(dropdownTrigger).toBeVisible();

      // Check it's not clipped
      const box = await dropdownTrigger.boundingBox();
      const viewport = page.viewportSize();

      if (box && viewport) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('tag badges should not cause horizontal overflow on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Check strategy cards with tags
    const tagContainers = page.locator('.md\\:hidden .flex.flex-wrap.gap-1');
    const count = await tagContainers.count();

    if (count > 0) {
      const firstContainer = tagContainers.first();
      const box = await firstContainer.boundingBox();
      const viewport = page.viewportSize();

      if (box && viewport) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });
});

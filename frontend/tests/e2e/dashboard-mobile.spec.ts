import { test, expect } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  expectNoHorizontalScroll,
  VIEWPORTS,
} from '../helpers/mobile-utils';

test.describe('Dashboard Page - Mobile Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should not have horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await expectNoHorizontalScroll(page);
  });

  test('welcome message should be visible on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    const welcome = page.locator('h1:has-text("Welcome")').first();
    await expect(welcome).toBeVisible();
    await expectNoHorizontalOverflow(page, 'h1:has-text("Welcome")');
  });

  test('recent strategies section should display correctly on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    const recentStrategies = page.locator('h2:has-text("Recent Strategies")');
    if ((await recentStrategies.count()) > 0) {
      await expect(recentStrategies.first()).toBeVisible();
    }
  });

  test('strategy cards should not overflow on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Check strategy items in the list
    const strategyItems = page.locator('a[href^="/strategies/"]');
    const count = await strategyItems.count();

    if (count > 0) {
      const firstItem = strategyItems.first();
      const box = await firstItem.boundingBox();
      const viewport = page.viewportSize();

      if (box && viewport) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('clone buttons should be accessible on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    const cloneButtons = page.locator('button:has-text("Clone")');
    const count = await cloneButtons.count();

    if (count > 0) {
      const firstButton = cloneButtons.first();
      await expect(firstButton).toBeVisible();

      const box = await firstButton.boundingBox();
      const viewport = page.viewportSize();

      if (box && viewport) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('view all strategies link should be visible on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    const viewAllLink = page.locator('a:has-text("View all strategies")');
    if ((await viewAllLink.count()) > 0) {
      await expect(viewAllLink.first()).toBeVisible();
    }
  });

  test('create strategy link should be visible on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    const createLink = page.locator('a:has-text("Create your first strategy")');
    if ((await createLink.count()) > 0) {
      await expect(createLink.first()).toBeVisible();
    }
  });

  test('strategy metadata should stack vertically on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Check that strategy info (asset, timeframe) displays without overflow
    const assetLabels = page.locator('text=/BTC\\/USDT|ETH\\/USDT/');
    const count = await assetLabels.count();

    if (count > 0) {
      const firstLabel = assetLabels.first();
      const box = await firstLabel.boundingBox();
      const viewport = page.viewportSize();

      if (box && viewport) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('should maintain readability at tablet size', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    const fontSize = await heading.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).fontSize)
    );
    expect(fontSize).toBeGreaterThanOrEqual(24);
  });
});

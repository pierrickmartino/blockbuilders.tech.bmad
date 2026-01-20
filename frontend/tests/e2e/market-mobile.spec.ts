import { test, expect } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  expectNoHorizontalScroll,
  expectMobileLayout,
  expectDesktopLayout,
  VIEWPORTS,
} from '../helpers/mobile-utils';

test.describe('Market Overview Page - Mobile Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/market');
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

  test('asset selector should be fully visible on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await expectNoHorizontalOverflow(page, 'button:has-text("BTC/USDT")');
  });

  test('market sentiment panel should display correctly on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Check Market Sentiment heading
    const sentimentPanel = page.locator('text=Market Sentiment').first();
    await expect(sentimentPanel).toBeVisible();

    // Check panel doesn't overflow
    const panel = page.locator('div:has-text("Market Sentiment")').first();
    const box = await panel.boundingBox();
    const viewport = page.viewportSize();

    if (box && viewport) {
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    }
  });

  test('Fear & Greed Index should display correctly on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    const fearGreedSection = page.locator('text=Fear & Greed Index').first();
    await expect(fearGreedSection).toBeVisible();

    // Check the progress bar doesn't overflow
    const progressBar = page
      .locator('div:has-text("Fear & Greed Index") + div .bg-blue-500')
      .first();

    if ((await progressBar.count()) > 0) {
      const box = await progressBar.boundingBox();
      const viewport = page.viewportSize();

      if (box && viewport) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('funding rate chart should display correctly on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    const fundingRate = page.locator('text=Funding Rate').first();
    await expect(fundingRate).toBeVisible();

    // Check chart container
    const chartContainer = page
      .locator('div:has-text("Funding Rate (7d)") svg')
      .first();

    if ((await chartContainer.count()) > 0) {
      const box = await chartContainer.boundingBox();
      const viewport = page.viewportSize();

      if (box && viewport) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('ticker cards should not overflow on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Get mobile ticker cards
    const tickerCards = page.locator('.md\\:hidden .rounded-lg.border.p-4');
    const count = await tickerCards.count();

    if (count > 0) {
      // Check first ticker card
      const firstCard = tickerCards.first();
      await expect(firstCard).toBeVisible();

      const box = await firstCard.boundingBox();
      const viewport = page.viewportSize();

      if (box && viewport) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('ticker metrics should be readable on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Check for price, change, and volume displays
    const priceElements = page.locator('.md\\:hidden .text-xl.font-bold');
    const count = await priceElements.count();

    if (count > 0) {
      const firstPrice = priceElements.first();
      await expect(firstPrice).toBeVisible();

      // Check font size is readable (at least 14px)
      const fontSize = await firstPrice.evaluate((el) =>
        parseFloat(window.getComputedStyle(el).fontSize)
      );
      expect(fontSize).toBeGreaterThanOrEqual(14);
    }
  });

  test('last updated timestamp should be visible on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    const timestamp = page.locator('text=Last updated:').first();
    if ((await timestamp.count()) > 0) {
      await expect(timestamp).toBeVisible();
      await expectNoHorizontalOverflow(page, 'text=Last updated:');
    }
  });

  test('should switch layouts at md breakpoint (768px)', async ({ page }) => {
    // Just below breakpoint - should show mobile
    await page.setViewportSize({ width: 767, height: 1024 });
    await expectMobileLayout(page);

    // At breakpoint - should show desktop
    await page.setViewportSize({ width: 768, height: 1024 });
    await expectDesktopLayout(page);
  });

  test('volatility metrics should display correctly on mobile', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Check for Vol (Std), Vol (ATR%), Vol %ile labels
    const volMetrics = page.locator('.md\\:hidden text=/Vol \\(/').first();

    if ((await volMetrics.count()) > 0) {
      await expect(volMetrics).toBeVisible();
    }
  });

  test('trend indicators should be visible on mobile cards', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Check for trend icons (TrendingUp/TrendingDown)
    const trendIcons = page.locator('.md\\:hidden svg.lucide-trending').first();

    if ((await trendIcons.count()) > 0) {
      await expect(trendIcons).toBeVisible();
    }
  });
});

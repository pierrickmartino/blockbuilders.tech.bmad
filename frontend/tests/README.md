# Mobile Compatibility Tests

This directory contains mobile compatibility tests to prevent layout issues on small screens.

## Overview

These tests ensure that all pages in Blockbuilders are fully responsive and work correctly on mobile devices, tablets, and desktops.

### Test Coverage

- **Strategies Page** (`e2e/strategies-mobile.spec.ts`)
  - Mobile vs desktop layout switching
  - Button visibility (Browse Templates, Import, New Strategy)
  - Strategy cards display
  - Filter controls accessibility
  - No horizontal overflow

- **Market Overview Page** (`e2e/market-mobile.spec.ts`)
  - Mobile vs desktop layout switching
  - Market sentiment panel display
  - Fear & Greed Index display
  - Funding rate charts
  - Ticker cards and metrics
  - No horizontal overflow

- **Dashboard Page** (`e2e/dashboard-mobile.spec.ts`)
  - Welcome message visibility
  - Recent strategies list
  - Strategy cards display
  - Clone buttons accessibility
  - No horizontal overflow

## Running Tests

### Prerequisites

First, install Playwright browsers (if not already done):

```bash
npx playwright install chromium
```

### Run All Tests

```bash
npm test
```

### Run Mobile Tests Only

```bash
npm run test:mobile
```

### Run Tests in UI Mode (Interactive)

```bash
npm run test:ui
```

### Run Tests in Headed Mode (See Browser)

```bash
npm run test:headed
```

### View Test Report

After running tests, view the HTML report:

```bash
npm run test:report
```

## Test Viewports

Tests run against multiple viewports to ensure compatibility:

| Viewport | Width | Device | Breakpoint |
|----------|-------|--------|------------|
| Mobile   | 375px | iPhone SE | < md |
| Tablet   | 768px | iPad Mini | md |
| Desktop  | 1280px | Standard Desktop | > md |

## Helper Functions

The `helpers/mobile-utils.ts` file provides reusable test utilities:

- `expectNoHorizontalOverflow(page, selector)` - Check element doesn't overflow viewport
- `expectNoHorizontalScroll(page)` - Check page has no horizontal scroll
- `expectMobileLayout(page)` - Verify mobile layout is active
- `expectDesktopLayout(page)` - Verify desktop layout is active
- `expectTouchFriendlyButtons(page, selector)` - Check buttons meet 44x44px minimum
- `expectReadableText(page, selector, minSize)` - Check text is large enough

## Writing New Tests

When adding new pages or features, follow this pattern:

```typescript
import { test, expect } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  expectNoHorizontalScroll,
  VIEWPORTS,
} from '../helpers/mobile-utils';

test.describe('New Page - Mobile Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/new-page');
    await page.waitForLoadState('networkidle');
  });

  test('should not have horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await expectNoHorizontalScroll(page);
  });

  test('critical button should be visible on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await expectNoHorizontalOverflow(page, 'button:has-text("Critical Action")');
  });

  // Add more tests...
});
```

## What to Test

When adding mobile compatibility tests, check for:

1. **No horizontal scroll** at any viewport size
2. **All buttons visible** and within viewport bounds
3. **Layout switching** at `md` breakpoint (768px)
4. **Touch targets** are at least 44x44px
5. **Text readability** (minimum 14px font size)
6. **Cards and tables** display correctly on mobile
7. **Images and charts** are responsive

## CI Integration

These tests should be run in CI before merging PRs:

```yaml
- name: Run mobile compatibility tests
  run: |
    npm ci
    npx playwright install --with-deps chromium
    npm run test:mobile
```

## Debugging Failed Tests

If a test fails:

1. Run with `--headed` to see the browser:
   ```bash
   npm run test:headed
   ```

2. Run with `--ui` for interactive debugging:
   ```bash
   npm run test:ui
   ```

3. Check screenshots in `test-results/` directory

4. Review the HTML report:
   ```bash
   npm run test:report
   ```

## Mobile Breakpoint

Blockbuilders uses Tailwind's `md` breakpoint (768px) as the mobile/desktop boundary:

- **< 768px**: Mobile layout (cards, vertical stacking)
- **≥ 768px**: Desktop layout (tables, horizontal layout)

Use the `md:` prefix in Tailwind for desktop-specific styles:

```tsx
<div className="hidden md:block">Desktop only</div>
<div className="md:hidden">Mobile only</div>
```

## Guidelines

See `.mobile-guidelines.md` for complete mobile compatibility guidelines and best practices.

---

**Remember:** Always test at 375px, 768px, and 1280px viewports before submitting code.

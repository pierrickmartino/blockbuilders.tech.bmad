# Mobile Compatibility Testing

## Overview

This document describes the mobile compatibility testing setup for Blockbuilders to prevent layout issues on mobile devices.

## Problem

The Strategies and Market Overview pages had mobile compatibility issues where buttons and content were cut off or caused horizontal scrolling on small screens.

## Solution

A comprehensive mobile compatibility testing system with:

1. **Automated E2E Tests** (Playwright)
2. **ESLint Guardrails** (jsx-a11y plugin)
3. **Developer Guidelines** (`.mobile-guidelines.md`)
4. **Test Helper Utilities** (mobile-utils.ts)

## Test Coverage

### Pages Tested

- **Strategies Page** - Layout switching, button visibility, filter controls
- **Market Overview Page** - Sentiment panel, charts, ticker cards
- **Dashboard Page** - Strategy list, welcome message, metadata display

### What We Test

✅ No horizontal scroll at any viewport size
✅ All buttons visible and within viewport bounds
✅ Layout switching at `md` breakpoint (768px)
✅ Touch targets meet minimum size (44x44px)
✅ Text readability (minimum 14px)
✅ Cards and tables display correctly
✅ Images and charts are responsive

## Running Tests

```bash
# Run all mobile tests
npm run test:mobile

# Run with UI (interactive)
npm run test:ui

# Run with browser visible
npm run test:headed

# View test report
npm run test:report
```

## Test Viewports

| Viewport | Width | Device | Use Case |
|----------|-------|--------|----------|
| Mobile   | 375px | iPhone SE | Primary mobile testing |
| Tablet   | 768px | iPad Mini | Breakpoint boundary |
| Desktop  | 1280px | Standard Desktop | Desktop layout |

## Mobile Breakpoint

Blockbuilders uses **768px** (Tailwind's `md` breakpoint) as the mobile/desktop boundary:

- **< 768px**: Mobile layout (cards, vertical stacking)
- **≥ 768px**: Desktop layout (tables, horizontal layout)

## Responsive Patterns

### Table → Card Pattern (Required for Data Tables)

```tsx
{/* Desktop table */}
<div className="hidden md:block">
  <Table>...</Table>
</div>

{/* Mobile cards */}
<div className="md:hidden">
  {items.map(item => (
    <Card key={item.id}>...</Card>
  ))}
</div>
```

### Grid → Stack Pattern

```tsx
<div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
  {/* 2 columns on mobile, flex row on sm+ */}
</div>
```

## ESLint Guardrails

Added accessibility rules to `.eslintrc.json`:

```json
{
  "extends": ["next/core-web-vitals", "next/typescript", "plugin:jsx-a11y/recommended"],
  "rules": {
    "jsx-a11y/click-events-have-key-events": "error",
    "jsx-a11y/no-static-element-interactions": "error",
    "jsx-a11y/interactive-supports-focus": "error"
  }
}
```

These rules help ensure:
- Keyboard accessibility
- Semantic HTML usage
- Focusable interactive elements

## Developer Workflow

### Before Submitting Code

1. Test manually at 375px, 768px, and 1280px viewports
2. Run `npm run lint` to check ESLint rules
3. Run `npm run test:mobile` to verify mobile compatibility
4. Check that no horizontal scroll appears

### Writing New Features

1. Follow mobile-first approach (write mobile styles first)
2. Use Tailwind's responsive utilities (`md:`, `lg:`)
3. Reference `.mobile-guidelines.md` for best practices
4. Add mobile compatibility tests for new pages

## CI Integration

Mobile tests should run automatically on PRs. Example workflow in:
`.github/workflows/mobile-tests.yml.example`

To activate, rename to `.github/workflows/mobile-tests.yml`

## Common Issues and Fixes

### Issue: Horizontal scroll on mobile
**Fix:** Use `max-w-full` on images/containers, avoid fixed widths

### Issue: Buttons cut off
**Fix:** Ensure buttons are inside responsive containers, not fixed-width parents

### Issue: Text too small
**Fix:** Use `text-sm` (14px) minimum, prefer `text-base` (16px)

### Issue: Table doesn't fit
**Fix:** Use Table → Card pattern (see above)

### Issue: Charts overflow
**Fix:** Use parent container width, not fixed widths

## File Structure

```
frontend/
├── tests/
│   ├── e2e/
│   │   ├── strategies-mobile.spec.ts
│   │   ├── market-mobile.spec.ts
│   │   └── dashboard-mobile.spec.ts
│   ├── helpers/
│   │   └── mobile-utils.ts
│   └── README.md
├── .mobile-guidelines.md
└── playwright.config.ts
```

## Test Helper Functions

Located in `tests/helpers/mobile-utils.ts`:

- `expectNoHorizontalOverflow()` - Check element doesn't overflow
- `expectNoHorizontalScroll()` - Check page has no horizontal scroll
- `expectMobileLayout()` - Verify mobile layout is active
- `expectDesktopLayout()` - Verify desktop layout is active
- `expectTouchFriendlyButtons()` - Check 44x44px minimum
- `expectReadableText()` - Check text size

## Resources

- **Mobile Guidelines:** `frontend/.mobile-guidelines.md`
- **Test Documentation:** `frontend/tests/README.md`
- **Playwright Config:** `frontend/playwright.config.ts`
- **Test Helpers:** `frontend/tests/helpers/mobile-utils.ts`

## Future Enhancements

Potential additions:

- Visual regression testing (screenshot comparison)
- Performance testing on mobile devices
- Touch gesture testing for canvas interactions
- Accessibility audit (WCAG compliance)

---

**Remember:** Mobile-first, responsive by default. Test at 375px, 768px, and 1280px before submitting code.

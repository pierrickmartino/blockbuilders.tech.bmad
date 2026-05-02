# Test Checklist – Strategy Performance by Period Grid

> Source PRD: `prd-strategy-performance-by-period-grid.md`

## 1. Column Visibility

- [ ] Strategy list shows columns `30d`, `60d`, `90d`, `1y` for Free users
- [ ] Strategy list shows columns `30d`, `60d`, `90d`, `1y` for Pro users
- [ ] Strategy list shows columns `30d`, `60d`, `90d`, `1y`, `2y`, `3y` for Premium users
- [ ] Non-premium users never see `2y` or `3y` columns

## 2. Cell Formatting & Color

- [ ] Positive return renders with `+` sign, `%`, and green style
- [ ] Negative return renders with `-` sign, `%`, and red style
- [ ] Zero return renders `0.0%` (or configured precision) with neutral style
- [ ] Missing return renders `—` placeholder
- [ ] Percentage precision is consistent across all period columns

## 3. Sorting Behavior

- [ ] Clicking each period header sorts ascending on first click
- [ ] Clicking same header again sorts descending
- [ ] Sorting works for all visible period columns (`30d`, `60d`, `90d`, `1y`, and premium `2y`/`3y`)
- [ ] Rows with `—` are excluded from numeric sort comparisons and always sort to the end in both ascending and descending order
- [ ] Tie values use deterministic tie-breaker (strategy name ascending)

## 4. Data Source Priority

- [ ] When cached batch value exists for a period, it is used
- [ ] When cache is missing, latest matching completed run is used
- [ ] When neither source exists, API returns null and UI shows `—`
- [ ] Only completed runs are considered for period values
- [ ] Source fallback does not trigger per-row API requests (no N+1 behavior)

## 5. API Contract

- [ ] `GET /strategies` includes period-performance payload per strategy row
- [ ] Payload supports keys for `30d`, `60d`, `90d`, `1y`, `2y`, `3y` (as available)
- [ ] Endpoint remains backward compatible with existing fields
- [ ] Invalid or stale period entries are safely ignored/fallback applied

## 6. UI States

- [ ] Loading state shows skeleton/placeholder in period cells
- [ ] Empty strategy state remains correct with no layout break
- [ ] Error state shows plain-language message and retry path
- [ ] Success state renders all available values without overflow on common desktop widths

## 7. Plan-Tier Gating

- [ ] Downgrading Premium to Pro/Free hides `2y` and `3y` immediately on next list load
- [ ] Upgrading to Premium reveals `2y` and `3y` on next list load
- [ ] Premium gating relies on existing plan tier source, not duplicated logic

## 8. Performance & Robustness

- [ ] Strategy list render time remains acceptable with period columns enabled
- [ ] Sorting interactions remain responsive on large strategy sets
- [ ] No frontend crash when all period values are missing (`—` in all cells)
- [ ] No backend errors when some strategies have partial period coverage

## 9. Regression Checks

- [ ] Existing search by strategy name still works
- [ ] Existing non-period sorts (name/asset/last run, etc.) still work
- [ ] Existing quick actions (Open/Clone/Archive) still work
- [ ] Existing bulk actions still work with new columns present

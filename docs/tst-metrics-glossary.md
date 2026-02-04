# Test Checklist -- Metrics Glossary Page

> Source PRD: `prd-metrics-glossary.md`

## 1. Page Existence & Navigation

- [ ] A dedicated `/metrics-glossary` page exists
- [ ] Page is accessible from the backtest results UI (link placement)
- [ ] Page loads without errors
- [ ] Page is readable on desktop
- [ ] Page is readable on mobile

## 2. Metric Entries -- Completeness

- [ ] Total Return % entry is present
- [ ] CAGR % entry is present
- [ ] Max Drawdown % entry is present
- [ ] Win Rate % entry is present
- [ ] Number of Trades entry is present
- [ ] Benchmark Return % entry is present
- [ ] Alpha entry is present
- [ ] Beta entry is present
- [ ] Sharpe Ratio entry is present

## 3. Metric Entry Content Structure

- [ ] Each metric entry includes a Name
- [ ] Each metric entry includes a Definition (1--2 short paragraphs)
- [ ] Each metric entry includes a Formula (plain text or simple math)
- [ ] Each metric entry includes Interpretation guidance (what it tells you)
- [ ] Each metric entry includes Good vs Bad ranges (with caveat)
- [ ] Each metric entry includes a short, realistic Example

## 4. Content Quality -- Definitions

- [ ] Total Return definition is accurate and plain-language
- [ ] CAGR definition is accurate and includes formula
- [ ] Max Drawdown definition is accurate and includes formula
- [ ] Win Rate definition is accurate and includes formula
- [ ] Number of Trades definition is accurate
- [ ] Benchmark Return definition is accurate
- [ ] Alpha definition is accurate and includes formula
- [ ] Beta definition is accurate and includes formula
- [ ] Sharpe Ratio definition is accurate and includes formula

## 5. Content Quality -- Good vs Bad Ranges

- [ ] CAGR ranges are provided (e.g., > 10% strong, 0--10% modest, < 0% losing)
- [ ] Max Drawdown ranges are provided (e.g., < 20% manageable, > 40% risky)
- [ ] Win Rate ranges are provided (e.g., > 55% strong, 45--55% average, < 45% weak)
- [ ] Sharpe Ratio ranges are provided (e.g., > 1.0 good, 0.5--1.0 acceptable, < 0.5 poor)
- [ ] All ranges include a caveat that "context matters"

## 6. Examples

- [ ] Each metric entry has at least one short, concrete example
- [ ] Examples use realistic values (not trivially obvious)
- [ ] Examples help make the metric intuitive for newer traders

## 7. Client-Side Search

- [ ] Search input is visible at the top of the page
- [ ] Typing in the search input filters the metric list instantly
- [ ] Search is case-insensitive
- [ ] Search matches on metric name
- [ ] Search matches on keywords in the definition
- [ ] Clearing the search input shows all metrics again
- [ ] No backend search calls are made (client-side only)
- [ ] Search with no matches shows an appropriate empty state

## 8. Anchor Links

- [ ] Each metric has an anchor link (e.g., `#cagr`, `#max-drawdown`)
- [ ] Navigating to the anchor URL scrolls to the correct metric
- [ ] Anchor links can be shared and used for deep linking

## 9. Layout & Design

- [ ] Simple single-column layout is used
- [ ] Typography is readable and follows the design system
- [ ] Cards or sections visually separate each metric
- [ ] Spacing and padding are consistent with the rest of the app
- [ ] Existing styles and components are reused

## 10. Implementation Constraints

- [ ] No backend changes or new APIs are introduced
- [ ] No new dependencies or libraries are added
- [ ] No database updates are required
- [ ] Metric data is stored as a static data array in the frontend
- [ ] Filtering uses simple case-insensitive substring matching

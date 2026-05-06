# Market Page Audit

Audit Health Score: **13/20, Acceptable**

| Dimension | Score | Key Finding |
|---|---:|---|
| Accessibility | 2/4 | Chart and sortable table state are not fully accessible |
| Performance | 3/4 | Mostly fine, but chart resize/rebuild strategy is coarse |
| Responsive | 2/4 | Mobile cards exist, but touch targets are often too small |
| Theming | 3/4 | Good token use, with a few hard-coded style leaks |
| Anti-Patterns | 3/4 | Calm and product-appropriate, but sentiment cards create nested-card density |

## Anti-Patterns Verdict

This does **not** read as AI-generated. It is restrained, task-oriented, and mostly follows the Blockbuilders "instrument, not terminal" direction. The main slop tells are smaller: emoji in sentiment narrative, nested card-like sentiment panels, hard-coded amber classes, and tiny icon/button affordances.

## Findings

### P1: Chart data is not meaningfully accessible outside the visual canvas

Location: `frontend/src/components/MarketChartPanel.tsx:485`

The chart containers expose only broad `aria-label`s, while the actual candle/indicator data lives in `lightweight-charts`. Keyboard and screen-reader users cannot inspect the chart except through the pointer-driven crosshair readout. Add an accessible fallback table or structured summary for latest OHLCV, active indicators, min/max range, and selected candle state. WCAG: 1.1.1, 1.3.1, 2.1.1.

### P1: Sort state is visual-only in the market table

Location: `frontend/src/app/(app)/market/page.tsx:214`

Sortable headers show arrows, but the table does not expose `aria-sort`, and the buttons do not announce the next sort action. Screen-reader users will hear "Price" without knowing current direction. Put `aria-sort` on the active `th`, add clearer button labels like "Sort by price, currently descending", and ensure focus styling is visible.

### P2: Touch targets are below the 44px mobile guideline

Location: `frontend/src/app/(app)/market/page.tsx:131`, `frontend/src/components/MarketChartPanel.tsx:276`

The clear-filter button, table sort buttons, asset buttons, indicator toggles, and period inputs are visually compact. That suits desktop density, but mobile and touch use will feel fiddly. Use the existing button/control sizing vocabulary or add minimum hit areas without inflating the visual chrome.

### P2: Sentiment error and partial states bypass design tokens

Location: `frontend/src/components/MarketSentimentPanel.tsx:84`, `frontend/src/components/SentimentSparkline.tsx:64`

Hard-coded `amber-*` Tailwind classes leak around the token system. Replace with `warning`, `warning-soft`, and tokenized foreground classes so contrast and dark mode stay centralized.

### P2: Sentiment panel creates card-inside-card density

Location: `frontend/src/components/MarketSentimentPanel.tsx:13`, `frontend/src/components/SentimentGauge.tsx:54`

The outer sentiment panel is card-like, then each metric is also a `Card`. It is not catastrophic, but it pushes against the project's "no nested cards" rule and makes the section feel heavier than the market table. A cleaner version would make the outer section unframed or turn the three inner metrics into simple cells.

## Positive Findings

The page uses real semantic table primitives, skeleton states, live "last updated" text, explicit empty/error states, mono numeric styling via `.data-text`, and chart colors are mostly routed through the theme adapter. The overall tone is calm and product-appropriate.

## Verification

I attempted `npm run lint`, but `npm` is not available on this shell PATH. No files were edited during the audit.

Recommended next pass: `impeccable harden market page`, then `impeccable adapt market page`, then `impeccable polish market page`.

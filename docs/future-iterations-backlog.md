# Future Iterations Backlog

Items collected from explicit "Non-Goals" and "Out of Scope" sections across all PRDs. These are not rejected ideas — they are deferred to keep current iterations simple and focused. Review this document when scoping future phases.

---

## 1. Analytics & Statistics

Items deferred because they exceed current analytical complexity targets.

| Source PRD | Deferred Item |
|---|---|
| prd-seasonality-analysis | Per-year seasonality breakdowns or filters |
| prd-seasonality-analysis | Advanced statistics (median, variance, significance tests) |
| prd-seasonality-analysis | Multi-asset or multi-timeframe aggregation |
| prd-risk-metrics-expansion | New risk analytics beyond Sharpe, Sortino, Calmar, max consecutive losses |
| prd-risk-metrics-expansion | Configurable risk-free rate or benchmark tuning |
| prd-transaction-cost-analysis | Per-venue spread modeling |
| prd-transaction-cost-analysis | "What-if" re-runs for fee changes |
| prd-trade-distribution-analysis | Custom bin configuration by users |
| prd-trade-distribution-analysis | Advanced statistics (skewness, kurtosis, Monte Carlo) |
| prd-backtest-comparison-view | Advanced statistical analysis (correlation, significance testing) |
| prd-backtest-comparison-view | More than 4 runs compared at once |
| prd-benchmark-comparison | Multi-asset benchmarks |
| prd-benchmark-comparison | Factor models or advanced attribution |
| prd-drawdown-chart | Ulcer index, rolling drawdown stats |
| prd-drawdown-chart | Configurable drawdown windows or multiple overlays |
| prd-backtest-results-trades-section | MAE/MFE, excursions, trade tagging, charts per trade |
| prd-backtest-results-trades-section | Export (CSV), filtering, or complex multi-column sorting on trade list |
| prd-position-analysis | Percentiles, distributions, rolling windows |
| prd-position-analysis | User-configurable filters or date range overrides |
| prd-phase2 | Walk-forward optimization / Monte Carlo |
| prd-phase3 | Walk-forward optimization / Monte Carlo |
| prd-phase3 | Overfitting indicator |
| prd-phase3 | Bear-market fragility warning |
| prd-phase3 | Parameter sensitivity notice |

---

## 2. AI / LLM Features

Items deferred because they introduce AI complexity beyond the deterministic engine.

| Source PRD | Deferred Item |
|---|---|
| prd-strategy-explanation-generator | AI/LLM-based explanation generation |
| prd-backtest-narrative-summary-generation-backend | LLM/AI-based narrative generation |
| prd-market-sentiment-indicators | Custom sentiment scoring or ML |
| prd-phase3 | AI-generated strategies |

---

## 3. Social & Community Features

Items deferred because they require social infrastructure not yet in scope.

| Source PRD | Deferred Item |
|---|---|
| prd-share-backtest-results-links | Public indexing, discovery, or social feed |
| prd-share-backtest-results-links | Edit, comment, or like features on shared results |
| prd-strategy-import-export | In-app sharing links or public strategy marketplace |
| prd-strategy-templates-marketplace | Paid marketplace, ratings, or reviews |
| prd-strategy-templates-marketplace | Public profile pages for template authors |
| prd-strategy-templates-marketplace | Social feeds, comments, or "follow" mechanics |
| prd-user-profiles-reputation | Social feed, comments, likes, or activity streams |
| prd-user-profiles-reputation | Advanced reputation scoring or gamification |
| prd-user-profiles-reputation | Public display of private strategies, emails, or billing data |
| prd-progress-dashboard | Social features (leaderboards, sharing, comparisons) |
| prd-progress-dashboard | Complex gamification (streaks across products, XP systems) |
| prd-phase2 | Community-contributed templates |
| prd-phase2 | Public profiles & social features expansion |
| prd-phase3 | Strategy marketplace with monetization |

---

## 4. Multi-Asset, Multi-Timeframe & Portfolio

Items deferred because the single-asset / single-timeframe constraint is deliberate.

| Source PRD | Deferred Item |
|---|---|
| prd-strategy-explanation-generator | Multi-asset/multi-timeframe explanations |
| prd-expanded-indicator-palette | Multi-timeframe indicators or multi-asset overlays |
| prd-multiple-entry-exit-conditions | Multi-asset or multi-timeframe strategies |
| prd-seasonality-analysis | Multi-asset or multi-timeframe aggregation |
| prd-benchmark-comparison | Multi-asset benchmarks |
| prd-strategy-templates-marketplace | Multi-asset or multi-timeframe templates |
| prd-additional-crypto-pairs | Multi-asset strategies |
| prd-additional-crypto-pairs | New timeframes |
| prd-backtest-trade-details-drawer | Multi-timeframe or multi-asset context in chart |
| prd-multi-strategy-dashboard | Portfolio-level aggregation or allocation analysis |
| prd-phase2 | Multi-asset portfolio strategies |
| prd-phase2 | Additional timeframes (15m, 5m, 1w) |
| prd-phase3 | Sub-daily timeframes (1h, 15m, 5m) — deliberate daily-only constraint |
| prd-phase3 | Multi-asset portfolio strategies |

---

## 5. Trading & Exchange Integration

Items deferred because live/real-time trading is explicitly out of scope.

| Source PRD | Deferred Item |
|---|---|
| prd-real-time-price-tickers | Trading actions or alerts from the ticker view |
| prd-real-time-price-tickers | Multi-exchange routing or complex data normalization |
| prd-performance-alerts-simple | Real-time alerts or streaming updates |
| prd-price-alerts | Sub-minute latency or streaming real-time alerts |
| prd-price-alerts | SMS, push, or third-party integrations beyond basic webhook |
| prd-in-app-notifications | Real-time streaming or websocket updates |
| prd-multiple-entry-exit-conditions | Complex order types (limit/stop-limit) |
| prd-multiple-entry-exit-conditions | Advanced trailing stop modes (ATR-based, chandelier) |
| prd-multiple-entry-exit-conditions | Short selling or position reversal logic |
| prd-backtest-trade-details-drawer | Editing trades or re-running backtests from the drawer |
| prd-phase2 | Exchange / webhook integration |
| prd-phase3 | Exchange integration / webhooks |
| prd-phase3 | Live trading / execution |
| prd-phase3 | Short selling support |
| prd-phase3 | Advanced order types (limit, stop-limit) |

---

## 6. Billing & Subscription Complexity

Items deferred to keep billing simple.

| Source PRD | Deferred Item |
|---|---|
| prd-annual-subscription-discounts | Multi-seat or team billing |
| prd-annual-subscription-discounts | Promotional coupon systems or limited-time discounts |
| prd-one-time-credit-packs | Usage-based pricing or per-backtest billing |
| prd-one-time-credit-packs | Time-limited or expiring credits |
| prd-one-time-credit-packs | Complex add-on bundles or tiered metering |
| prd-one-time-credit-packs | Team or seat-based capacity |
| prd-simple-tiered-subscription-plans | Usage-based pricing or per-backtest charges |
| prd-simple-tiered-subscription-plans | Complex quota tracking, metering, or credits |
| prd-simple-tiered-subscription-plans | Team accounts, seats, or enterprise contracts |
| prd-simple-tiered-subscription-plans | Add-on feature bundles or per-feature pricing |
| prd-grandfathered-beta-user-benefits | Time-limited perks or expiring benefits |
| prd-grandfathered-beta-user-benefits | Complex usage-based billing or add-on bundles |
| prd-profile-page-settings-and-usage-limits | Billing upgrades, payments, multiple plans on profile page |
| prd-phase2 | Team billing / collaboration |
| prd-phase3 | Team billing / collaboration |

---

## 7. Notifications & Email

Items deferred to keep notification surface area minimal.

| Source PRD | Deferred Item |
|---|---|
| prd-performance-alerts-simple | SMS, push, or webhook notifications |
| prd-performance-alerts-simple | Complex rule builders (multiple metrics, AND/OR logic) |
| prd-performance-alerts-simple | Alerts for manual backtests |
| prd-price-alerts | Complex rule builders (AND/OR, multi-step conditions) |
| prd-in-app-notifications | Email/SMS/push notifications |
| prd-in-app-notifications | Complex preference management or notification rules |
| prd-digest-email-opt-out-controls | New digest content templates |
| prd-digest-email-opt-out-controls | New email providers, delivery retries, or custom unsubscribe token mechanics |
| prd-phase2 | Weekly digest email — deferred until beta cohort is active |

---

## 8. Canvas & Editor Enhancements

Items deferred to keep the canvas simple for MVP+ iterations.

| Source PRD | Deferred Item |
|---|---|
| prd-canvas-undo-redo | Persistence of undo history |
| prd-canvas-undo-redo | Multi-user collaboration or shared history |
| prd-canvas-undo-redo | Branching history visualization |
| prd-copy-paste-blocks-subgraphs | Backend clipboard storage or API changes |
| prd-copy-paste-blocks-subgraphs | Advanced grouping or template management |
| prd-copy-paste-blocks-subgraphs | Deep conflict resolution for connections outside selection |
| prd-canvas-auto-layout-connection-tidying | Automatic re-layout on every edit |
| prd-canvas-auto-layout-connection-tidying | Complex layout customization beyond flow direction and tidy option |
| prd-compact-node-display-mode | Redesign of the Inspector panel or block palette |
| prd-canvas-minimap-section-shortcuts | New section classification system beyond existing block types |
| prd-canvas-bottom-action-bar | New canvas tools or shortcuts |
| prd-keyboard-shortcuts | Shortcuts for strategy list, dashboard, or global navigation |
| prd-keyboard-shortcuts | Keyboard shortcut customization |
| prd-inline-parameter-popover | Persisting partial drafts when popover is open across page reloads |
| prd-mobile-bottom-sheet-parameter-editing | New gestures beyond Sheet's existing close behavior |
| prd-mobile-bottom-sheet-parameter-editing | Persisting partially edited values across reloads or route changes |
| prd-mobile-optimized-canvas | Custom gesture libraries or complex touch physics |
| prd-mobile-optimized-canvas | Native app or offline mode |
| prd-inspector-panel-block-parameters | Changes to validation rules or parameter ranges |

---

## 9. Indicators & Block Library

Items deferred to keep the indicator/block surface area contained.

| Source PRD | Deferred Item |
|---|---|
| prd-expanded-indicator-palette | "Everything indicator" catalog or user-defined indicators |
| prd-expanded-indicator-palette | New charting panels or visual overlays beyond existing indicator cards |
| prd-expanded-indicator-palette | Advanced Fibonacci tools (drawing, anchoring, custom pivot selection) |
| prd-block-library-bottom-sheet-search | New personalization system beyond simple recent/favorite storage |
| prd-essentials-first-block-palette-toggle | Server-side preference storage for toggle state |
| prd-market-sentiment-indicators | Predictive analytics, alerts, or trading signals from sentiment |
| prd-market-sentiment-indicators | User configuration or saved preferences for sentiment |
| prd-market-sentiment-indicators | Additional charts beyond simple gauges/sparklines |

---

## 10. Data & Infrastructure

Items deferred to keep the data layer and infrastructure simple.

| Source PRD | Deferred Item |
|---|---|
| prd-data-completeness-indicators | New data vendors or cross-vendor reconciliation |
| prd-data-completeness-indicators | Per-user overrides or manual data correction UI |
| prd-data-quality-indicators | New market data vendors or reconciliation between vendors |
| prd-data-quality-indicators | Complex anomaly detection or machine-learning models |
| prd-additional-crypto-pairs | Vendor switching or multi-vendor fallback |
| prd-backtest-data-export-csv-json | Scheduled exports or email delivery |
| prd-backtest-data-export-csv-json | Export of raw candle data |
| prd-structured-logging-correlation-ids | (see PRD for any advanced log aggregation beyond current spec) |
| prd-posthog-analytics-privacy-consent | Cross-product analytics federation |
| prd-posthog-analytics-privacy-consent | Server-side event relay |
| prd-posthog-analytics-privacy-consent | A/B testing setup |
| prd-onboarding-funnel-dashboard | In-app dashboard embedding |
| prd-onboarding-funnel-dashboard | Automated alerts based on funnel conversion thresholds |
| prd-phase2 | Data vendor fallback — deferred to v2.1 |
| prd-phase2 | Regime awareness in results — deferred to v2.1 |

---

## 11. User Accounts & Profile

Items deferred to keep account management simple.

| Source PRD | Deferred Item |
|---|---|
| prd-profile-page-settings-and-usage-limits | Advanced account management (team accounts, SSO, 2FA) |
| prd-profile-page-settings-and-usage-limits | Full "user preferences" system beyond fee/slippage/timezone |
| prd-recently-viewed-dashboard-shortcuts | Cross-device sync or long-term persistence |
| prd-recently-viewed-dashboard-shortcuts | Analytics or recommendations based on view history |
| prd-user-profiles-reputation | Monetization, paid subscriptions to creators, or tips |

---

## 12. Internationalization & Accessibility

Items deferred to keep initial scope focused on English/desktop.

| Source PRD | Deferred Item |
|---|---|
| prd-display-formatting-consistency | Full i18n framework or multi-language rollout |
| prd-display-formatting-consistency | Complex per-exchange formatting rules |
| prd-first-run-guided-metric-explanations | Localization/i18n work |
| prd-contextual-help-tooltips | Localization or multi-language support |
| prd-phase2 | i18n / Localization |

---

## 13. Theming & Personalization

Items deferred to keep the UI consistent and simple.

| Source PRD | Deferred Item |
|---|---|
| prd-dark-mode-theme | Multiple theme palettes or custom color pickers |
| prd-dark-mode-theme | Per-page theme overrides |
| prd-dark-mode-theme | Advanced theming engine or design token overhaul |
| prd-favorite-metrics-backtest-summary | Per-strategy or per-backtest custom metric layouts |
| prd-favorite-metrics-backtest-summary | Team/shared preferences or public sharing of metric views |
| prd-favorite-metrics-backtest-summary | Complex dashboards or widget systems |

---

## 14. Sharing & Export

Items deferred to keep sharing mechanics simple.

| Source PRD | Deferred Item |
|---|---|
| prd-share-backtest-results-links | Complex permission model beyond token-based access |
| prd-strategy-import-export | Importing backtest runs, results, or notifications |
| prd-strategy-import-export | Multi-strategy bundle export/import |
| prd-strategy-import-export | Schema version upgrades or migrations |
| prd-backtest-results-equity-curve-chart | Comparing multiple runs on one equity curve chart |
| prd-backtest-results-equity-curve-chart | Saving/exporting chart images |
| prd-phase2 | Export to Pine Script / other platforms |
| prd-phase3 | Export to Pine Script / other platforms |

---

## 15. Platform & Infrastructure

Items deferred to keep the architecture simple.

| Source PRD | Deferred Item |
|---|---|
| prd-phase2 | Mobile native apps |
| prd-phase3 | Mobile native apps |
| prd-real-time-price-tickers | Full charting, order book, or depth data |

---

## How to Use This Document

1. **When scoping a new phase** — scan the relevant category above to see if any deferred items now fit.
2. **When a deferred item is picked up** — remove it from this file and create a proper `docs/prd-<feature>.md` for it.
3. **When a new item is deferred** — add it here under the appropriate category, citing the source PRD.

Keep entries concise. This is a backlog reference, not a spec.

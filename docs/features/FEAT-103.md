# FEAT-103: Dashboard Strategy Lab Instrument

## Goal
The dashboard page helps returning traders assess their strategy workspace with the feel of a precise strategy lab instrument rather than a generic application dashboard. It should make strategy inventory, recent backtest activity, readiness signals, and next actions immediately scannable while preserving the current dashboard role as the protected landing page after onboarding.

## Non-goals
- This feature does not add, remove, or change backend endpoints.
- This feature does not change strategy creation, cloning, archiving, tagging, filtering, or backtest execution behavior.
- This feature does not add new persisted user preferences, dashboard configuration, or database fields.
- This feature does not change onboarding routing, authentication routing, plan limits, or billing behavior.
- This feature does not replace the full strategy management page at `/strategies`.
- This feature does not add live market data, live trading, automated recommendations, or AI-generated advice.
- This feature does not redesign app shell layout or pages outside the dashboard route and its directly visible navigation chrome.
- This feature does not introduce new frontend dependencies.

## Acceptance criteria
1. **AC-001** Given an authenticated onboarded user opens `/dashboard`, when the first viewport loads, then the primary dashboard job is clearly about resuming or validating strategy work, with a prominent next action such as continuing the last edited strategy, reviewing the last backtest result, or running the next backtest.
2. **AC-002** Given dashboard strategy and backtest data is available, when the top signal area renders, then the three generic count-only KPI cards are replaced by exactly these three decision-grade signals, all derived from existing `Strategy` fields returned by `GET /strategies/` with no backend changes:
   - **Drafts / unvalidated** — count of strategies where `last_run_at == null` (a strategy without any backtest run is treated as a draft).
   - **Last run** — `latest_total_return_pct` and `latest_max_drawdown_pct` of the strategy with the most recent `last_run_at`, linking to that strategy's backtest view.
   - **Data freshness** — time elapsed since the most recent `last_run_at` (or `last_auto_run_at`, whichever is newer) across the workspace.
   "Triggered alerts" is explicitly out of scope for this feature.
3. **AC-003** Given the dashboard is shown with the app navigation chrome, when the sidebar logo and active dashboard navigation item render, then the logo uses a flat mark and the active state uses background/text treatment without a decorative gradient logo or active left-side border stripe.
4. **AC-004** Given the dashboard route and its Storybook dashboard documentation are both available, when a reviewer compares them, then the documented dashboard sections match the rendered route. Specifically, the "Recently Viewed Strategies" section is removed from `frontend/src/stories/pages/Dashboard.mdx` (intentionally absent from both the route and the doc), and the documented hero, signal cards, recent-backtests section, and your-strategies section match the rendered route.

## UI behaviour
- `/dashboard` remains the protected post-onboarding landing page.
- The page uses focused lab language such as strategy workspace, backtest activity, readiness, and recent runs rather than broad greeting-led dashboard copy.
- The top of the page prioritizes a clear work-resume or validation action over greeting-led copy.
- The top signal area favors trading-specific decision signals over generic inventory counts.
- Dashboard navigation chrome avoids decorative gradient branding and active side-stripe treatment.
- Dashboard Storybook documentation stays aligned with the route's rendered sections.
- The dashboard keeps navigation paths to existing strategy creation, strategy details, strategy management, and backtest views.
- The visual direction should feel precise, dense, and analytical rather than decorative, oversized, or generic.

## Hero next-action rule (deterministic)
The hero CTA is selected in this order from the strategies returned by `GET /strategies/` (filtered to non-archived):
1. If any strategy's most recent `last_run_at` is **newer** than that strategy's `updated_at` → primary CTA "Review last backtest" linking to that strategy's backtest view.
2. Else if any strategy has `last_run_at == null` → primary CTA "Continue editing {name}" linking to the strategy with the most recent `updated_at` among unvalidated drafts.
3. Else → primary CTA "Run a backtest" linking to the strategy with the most recent `updated_at`.
If the user has no strategies at all, the hero falls back to the existing empty-state "Create Strategy" CTA.

## Implementation Plan
_Produced by Opus. Approved: [pending human review]_

1. **`frontend/src/components/app-sidebar/app-sidebar.tsx`** (frontend, no migration) — Replace the gradient logo tile (`bg-gradient-to-br from-primary to-primary/80 ... shadow-primary/25`) with a flat mark (e.g. `bg-primary text-primary-foreground`, no shadow), and remove the `border-l-2 border-primary` active stripe so `SidebarMenuButton`'s built-in `data-[active]` background/text treatment is the sole active indicator. Satisfies AC-003. _Independent — can run first._
2. **`frontend/src/lib/dashboard-signals.ts`** (frontend, new file, no migration) — Add pure helpers `selectNextAction(strategies)` (implements the deterministic rule above, returns `{ kind, label, href, strategy? }`) and `computeSignals(strategies)` (returns `{ draftsCount, lastRun: { strategyId, name, returnPct, drawdownPct, runAt } | null, freshness: { mostRecentRunAt: string | null } }`). Pure, unit-test-friendly, no I/O. _Must complete before bullet 3._
3. **`frontend/src/app/(app)/dashboard/page.tsx`** (frontend, no migration) — Replace the "Welcome back, {name}" hero with a lab-language heading ("Strategy workspace") plus a deterministic primary CTA from `selectNextAction`; replace the three KPI cards (Strategies / Recently viewed backtests / New Strategy) with the three signal cards from `computeSignals` (Drafts, Last run with return + drawdown, Data freshness with relative time); keep the existing Recent backtests and Your strategies sections; preserve the empty-state for zero strategies. Satisfies AC-001 and AC-002. _Depends on bullet 2._
4. **`frontend/src/stories/pages/Dashboard.mdx`** (frontend docs, no migration) — Delete the "Recently Viewed Strategies" section; rewrite the hero section to describe the lab-language heading and deterministic CTA; replace the Quick stats table with the three signal cards (Drafts, Last run, Data freshness) and their data sources; keep Recent Backtests and Your Strategies sections aligned with the rendered route. Satisfies AC-004. _Depends on bullet 3 (must reflect final route copy)._
5. **Manual verification + gates** (no file change) — Per the test plan's fallback (`npm test` runner gap), run `cd frontend && npm run lint` and `cd frontend && npx tsc --noEmit`; manually verify TC-01..TC-04 against `/dashboard` and the Storybook Dashboard MDX page in dev. _Must run last._

═════════════════════════════════════════════
PLAN COMPLETE. Close this session.
Open a new Sonnet session to implement:
  claude --model $IMPLEMENTATION_MODEL
  /build-feature FEAT-103 backend
  /build-feature FEAT-103 frontend
═════════════════════════════════════════════

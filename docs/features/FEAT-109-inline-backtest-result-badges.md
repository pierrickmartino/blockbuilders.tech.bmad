## Status: Implemented
## Source issue: #340
## Goal (one paragraph)
Make the latest backtest outcome visible directly on the strategy canvas so traders can review a strategy without leaving the visual editor. Each eligible canvas node should show a compact status badge for the most recent relevant backtest state, and selecting a node with available result context should open a right-side Sheet drawer that keeps the canvas visible while showing deeper result details such as metrics, charts, and trades tied to that node context where available.

## Non-goals (explicit list — what this does NOT do)
- This does not change backtesting numerical logic, indicator calculations, execution semantics, or result aggregation.
- This does not add, remove, or rename FastAPI endpoints.
- This does not change SQLModel models, database tables, migrations, or stored backtest result schemas.
- This does not change authentication, billing, usage limits, strategy validation rules, or scheduled backtest behavior.
- This does not create a new backtest comparison workflow or replace the existing backtest results page.
- This does not require a new frontend dependency if existing React Flow node data, shadcn/ui Sheet, and chart/table components can satisfy the UI.
- This does not make note nodes or unsupported decorative canvas elements participate in backtest result badges.

## Acceptance criteria (numbered AC-001, AC-002, …)
1. AC-001  
   **Given** a strategy canvas has a most recent backtest result available for the displayed strategy,  
   **When** the canvas renders eligible strategy block nodes,  
   **Then** each eligible node shows a compact result badge in a consistent corner position without hiding handles, labels, validation indicators, compact-node summaries, or connection controls.

2. AC-002  
   **Given** a node has a latest result state of pending, running, success, or error,  
   **When** its badge is displayed,  
   **Then** the badge clearly communicates that state and, when a completed metric is available, includes one concise key metric such as Sharpe ratio or total return.

3. AC-003  
   **Given** a user selects or activates a node that has result context,  
   **When** the node result details are opened,  
   **Then** a shadcn/ui Sheet opens from the right side with the canvas still visible behind it and displays the node label, latest status, headline metrics, and any available chart or trade-log context for that node.

4. AC-004  
   **Given** a node has no latest backtest context, an unsupported node type, or incomplete result details,  
   **When** the canvas renders or the user selects that node,  
   **Then** the UI shows a clear empty or unavailable state without blocking normal canvas editing, node selection, dragging, connection editing, or parameter inspection.

5. AC-005  
   **Given** a backtest run changes state while the user remains on the canvas,  
   **When** the frontend receives updated backtest status or refreshed result data,  
   **Then** badges and an already-open details Sheet update to the latest known state without requiring a full page reload.

6. AC-006  
   **Given** the user is on a mobile viewport or using keyboard navigation,  
   **When** badges and the Sheet are used,  
   **Then** touch targets, focus order, accessible names, keyboard dismissal, and responsive Sheet sizing remain usable without overlapping the mobile bottom action bar or existing canvas controls.

7. AC-007  
   **Given** this feature is disabled, there is no backtest result for the strategy, or result loading fails,  
   **When** the strategy canvas renders,  
   **Then** the existing canvas remains functionally equivalent to the current experience and the user can still run backtests through the existing backtest runner.

## Data model changes (SQLModel if any)
None.

## UI behaviour (frontend if any)
- Result badges appear on eligible custom strategy nodes and use compact visual states for pending, running, success, and error.
- Completed badges may show one concise metric when available; if the preferred metric is missing, the badge falls back to status-only display.
- Badges must coexist with compact node display mode, validation highlights, note nodes, connection handles, minimap, health bar, mobile bottom action bar, and existing canvas toolbar controls.
- Opening node result details uses a right-side shadcn/ui Sheet on desktop and a responsive Sheet on smaller screens.
- The Sheet keeps the canvas visible, identifies the selected node, and presents deeper result context without navigating away from the editor.
- The Sheet supports empty, loading, success, and error states and closes through the standard Sheet close affordance, Escape key, and outside interaction behavior where supported by the existing component.
- Canvas editing interactions remain available when the Sheet is closed, and unsupported nodes do not gain misleading result states.

## Edge cases
- A strategy may have no completed backtests, only queued/running backtests, or a latest failed backtest.
- Latest backtest summary metrics may be partially missing, null, or unavailable for zero-trade runs.
- Multiple selected nodes should not produce conflicting detail drawers; one active node context should be shown at a time.
- Compact node mode may leave less visual space for badges than expanded mode.
- Validation errors and result badges can appear on the same node and must remain visually distinguishable.
- Mobile controls, bottom action bar, keyboard focus, and Sheet content must not overlap in a way that prevents editing or review.
- Result refreshes may arrive while the details Sheet is open or after the selected node is deleted from the canvas.
- Note nodes and unsupported node types should not imply that they generated trades or metrics.

## Open questions
- Which completed metric should be the default badge metric when several are available: Sharpe ratio, total return, or another favorite/pinned metric?
- Should the details Sheet show full strategy-level backtest results filtered by selected node context, or only node-adjacent summary context when true per-node attribution is unavailable?
- Should this feature be controlled by an existing SmartCanvas/PostHog feature flag, and if so, what should the flag key be?
- Should selecting a node always open the result Sheet when results exist, or should the user click the badge specifically to avoid interfering with parameter editing?

## Implementation Plan
_Produced by Claude. Approved: [pending]_

### Resolved open questions
- Default badge metric: **Total return** (`total_return_pct`); fall back to status-only when missing.
- Sheet scope: **Strategy-level results** — Sheet header shows the selected node label/status; body reuses existing strategy backtest result UI (summary metrics, equity curve chart, trade log) for the strategy's latest run. No per-node attribution.
- Feature flag: **No flag**. Feature presence is controlled solely by availability of a latest backtest result for the strategy.
- Sheet trigger: **Badge click only**. Node selection continues to drive existing parameter inspection/editing; Sheet opens only when the badge is clicked (or activated via keyboard).

### Plan (frontend-only; no backend, no Alembic migration)

1. **frontend/src/hooks/useLatestStrategyBacktest.ts** — New hook that fetches the strategy's most recent backtest run id + status + summary (via existing `/backtests` endpoints used by `useBacktestResults` and the backtest page), and exposes `{ run, status, summary, isLoading, error, refetch }` with lightweight polling while status is `pending`/`running`. Frontend. Alembic: no. Order: 1 (prerequisite for steps 2, 5, 6).

2. **frontend/src/components/canvas/NodeResultBadge.tsx** — New compact badge component rendering pending/running/success/error visual states with optional `total_return_pct` metric, accessible name, keyboard-activatable, sized to coexist with compact-node mode, validation indicators, handles, and the health bar. Frontend. Alembic: no. Order: 2 (depends on step 1's status type only).

3. **frontend/src/components/canvas/BaseNode.tsx** — Add optional `resultBadge?: ReactNode` prop and render it in a consistent corner that does not collide with `InfoIcon`, validation highlight, handles, or compact summary; eligibility (skip note/unsupported nodes) decided by the caller passing `undefined`. Frontend. Alembic: no. Order: 3 (depends on step 2).

4. **frontend/src/components/canvas/StrategyCanvas.tsx** — Thread a new optional prop `nodeResultsByBlockId: Record<string, NodeResultState>` (and `onBadgeActivate: (blockId) => void`) down through React Flow `nodeTypes`/`data`, so each node component receives its result state and an activation callback; ineligible block types (NoteNode, unsupported) receive no state. Frontend. Alembic: no. Order: 4 (depends on step 3).

5. **frontend/src/components/canvas/NodeResultSheet.tsx** — New right-side shadcn/ui `Sheet` wrapper that takes the selected node label + the latest strategy `BacktestStatusResponse` and reuses existing result presentation (summary metrics block, equity curve chart, trade log) with empty/loading/error states, Escape/outside-close, and mobile-responsive sizing without overlapping `MobileBottomBar`. Frontend. Alembic: no. Order: 5 (depends on step 1).

6. **frontend/src/app/(app)/strategies/[id]/page.tsx** — Wire `useLatestStrategyBacktest` into the editor, compute `nodeResultsByBlockId` from the latest run (per-node entry only when block type is eligible), pass it plus the badge-activation handler into `SmartCanvas`, manage `activeResultBlockId` state, and render `NodeResultSheet` controlled by badge clicks; gracefully no-op when no run, loading fails, or feature is otherwise unusable (preserves AC-007). Frontend. Alembic: no. Order: 6 (depends on steps 1, 4, 5).

7. **frontend/src/components/canvas/NodeResultBadge.stories.tsx** + **NodeResultSheet.stories.tsx** — Storybook coverage for badge states (pending/running/success-with-metric/success-no-metric/error) and Sheet states (loading/success/empty/error) per `frontend/CLAUDE.md` Storybook rules. Frontend. Alembic: no. Order: 7 (depends on steps 2, 5).

8. **frontend/src/__tests__/NodeResultBadge.test.tsx** and **NodeResultSheet.test.tsx** — Unit tests covering badge state rendering, metric fallback, accessible name, keyboard activation, and Sheet open/close + state branches; mock `useLatestStrategyBacktest` where needed. Drives AC-001…AC-007 verification via `cd frontend && npm test && npm run lint && npm run build`. Frontend. Alembic: no. Order: 8 (depends on steps 2, 5, 6).

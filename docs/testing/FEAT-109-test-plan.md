# FEAT-109 Test Plan: Inline Backtest Result Badges and Sheet Drawer

## Test cases

### TC-001 Eligible nodes show compact result badges without obstructing canvas controls
**Acceptance criterion:** AC-001

**Input:** Open a strategy with at least one latest backtest result and multiple eligible strategy block nodes on the canvas.

**Expected output:** Eligible nodes show compact result badges in a consistent corner position, and labels, compact summaries, validation indicators, handles, and connection controls remain visible and usable.

**Exact command:** `cd frontend && npm test && npm run lint && npm run build`

**Manual verification:** Start the frontend, open `/strategies/{id}`, load a strategy with latest backtest data, inspect expanded and compact node modes, and verify badges do not hide node controls or validation UI.

### TC-002 Badge states communicate pending, running, success, error, and optional metric
**Acceptance criterion:** AC-002

**Input:** View canvas nodes with mocked or real latest result states covering pending, running, success, and error, including at least one completed result with Sharpe ratio or total return available.

**Expected output:** Each badge communicates the correct state, completed badges include one concise available metric, and missing metrics fall back to status-only display.

**Exact command:** `cd frontend && npm test && npm run lint && npm run build`

**Manual verification:** Exercise or mock each latest result state in the canvas, confirm the badge copy/icon/color treatment is distinct, and confirm no badge displays a fabricated metric.

### TC-003 Selecting a node opens a right-side result details Sheet
**Acceptance criterion:** AC-003

**Input:** Select or activate a canvas node that has latest result context.

**Expected output:** A shadcn/ui Sheet opens from the right, the canvas remains visible behind it, and the Sheet shows the node label, latest status, headline metrics, and available chart or trade-log context.

**Exact command:** `cd frontend && npm test && npm run lint && npm run build`

**Manual verification:** Start the frontend, open `/strategies/{id}`, activate a node result badge or supported node selection path, and verify the Sheet content and close behavior.

### TC-004 Unsupported or missing result context preserves normal editing
**Acceptance criterion:** AC-004

**Input:** Open a strategy with note nodes, unsupported nodes, and nodes without latest result context.

**Expected output:** Unsupported or result-less nodes show no misleading badge or show an explicit unavailable state, and normal selection, dragging, connection editing, and parameter inspection continue to work.

**Exact command:** `cd frontend && npm test && npm run lint && npm run build`

**Manual verification:** Interact with unsupported and result-less nodes in the canvas, drag them, edit parameters where applicable, create and remove connections, and confirm no result UI blocks the workflow.

### TC-005 Badges and open Sheet refresh when latest backtest state changes
**Acceptance criterion:** AC-005

**Input:** Keep the canvas open while a backtest changes from queued or running to success or error.

**Expected output:** Badge state and any open details Sheet update to the latest known state without a full page reload.

**Exact command:** `cd frontend && npm test && npm run lint && npm run build`

**Manual verification:** Start or simulate a backtest while the canvas remains open, keep one node detail Sheet open, and verify both badge and Sheet state refresh after polling or result refetch completes.

### TC-006 Mobile and keyboard interactions remain accessible
**Acceptance criterion:** AC-006

**Input:** Use the canvas on a mobile-width viewport and with keyboard navigation.

**Expected output:** Badges and Sheet controls have usable touch targets, accessible names, logical focus order, Escape or close-button dismissal, and responsive sizing that does not overlap the mobile bottom action bar or canvas controls.

**Exact command:** `cd frontend && npm test && npm run lint && npm run build`

**Manual verification:** Test at a mobile viewport below 768px and with keyboard-only navigation; verify focus enters and exits the Sheet predictably and canvas controls remain usable after closing it.

### TC-007 Disabled, empty, and failed-loading states preserve existing canvas behavior
**Acceptance criterion:** AC-007

**Input:** Render the strategy canvas with the feature disabled, with no strategy backtest result, and with result loading failure.

**Expected output:** The existing canvas behavior remains functionally equivalent, no blocking result UI appears, and users can still navigate to or run backtests through the existing backtest runner.

**Exact command:** `cd frontend && npm test && npm run lint && npm run build`

**Manual verification:** Exercise the disabled or no-data path, then use the existing run-backtest workflow from the strategy editor/backtest route to confirm it remains available.

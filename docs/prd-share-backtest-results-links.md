# PRD: Shareable Backtest Result Links

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary
Allow users to generate read-only, shareable links for a specific backtest run so others can view performance metrics and the equity curve without seeing strategy logic. Links are token-based and can expire.

---

## 2. Goals
- Generate a shareable link for a single backtest run (results only).
- Provide a public, read-only view of metrics + equity curve.
- Support optional expiration dates for privacy.
- Keep implementation minimal (single table + simple endpoint).

## 3. Non-Goals
- No sharing of strategy logic, blocks, or parameters.
- No public indexing, discovery, or social feed.
- No edit, comment, or like features.
- No complex permission model (token only).

---

## 4. Target Users
- Users who want to share impressive results on social media.
- Users who want to show friends or colleagues performance without exposing strategy logic.

---

## 5. User Stories
1. As a user, I can generate a share link for a completed backtest run.
2. As a user, I can set an expiration date (or leave it open).
3. As a viewer, I can open the link and see summary metrics + equity curve.

---

## 6. UX Flow (Minimal)
1. User opens a completed backtest result page.
2. Clicks “Share Results”.
3. Modal or inline panel shows:
   - Expiration selector (e.g., 7 days / 30 days / never).
   - “Generate Link” button.
4. UI shows a copyable URL.

Public view:
1. Viewer opens the link.
2. Sees summary metrics and equity curve only.
3. If the link is invalid or expired, show a plain-language error.

---

## 7. Data Model (Minimal)
**Table:** `shared_backtest_links`
- `id` (uuid)
- `backtest_run_id` (uuid, foreign key)
- `token` (unique, random string)
- `expires_at` (nullable timestamp)
- `created_at`

Notes:
- Token is the only access key.
- One backtest run can have multiple links if needed.

---

## 8. API (Minimal)
### Create Link (auth)
`POST /backtests/{run_id}/share-links`
- Body: `{ "expires_at": "2026-02-01T00:00:00Z" | null }`
- Returns: `{ "url": "https://app.../share/backtests/{token}", "expires_at": ... }`

### Public View (no auth)
`GET /share/backtests/{token}`
- Validates token + expiration.
- Returns:
  - Summary metrics (same as `GET /backtests/{run_id}` subset)
  - Equity curve data (same as `GET /backtests/{run_id}/equity-curve`)
- Does **not** return strategy definition or trades list.

---

## 9. Public View UI (Minimal)
- Header: asset, timeframe, date range.
- Summary metrics cards (Total Return, CAGR, Max Drawdown, Trades, Win Rate).
- Equity curve chart.
- Small note: “Shared results — strategy logic hidden.”

---

## 10. Privacy & Security
- Tokens are unguessable (e.g., 32+ chars).
- Expired links return 404 with plain-language message.
- No user-identifying details unless already shown in backtest results (avoid email/user name).

---

## 11. Acceptance Criteria
- ✅ User can generate a link for a completed backtest run.
- ✅ Link opens a public, read-only results view (metrics + equity curve only).
- ✅ Link can have an expiration date, and expired links are blocked.
- ✅ Strategy logic and blocks are never exposed in the public view.

---

## 12. Implementation Notes
- Keep endpoints minimal and reuse existing result serializers.
- Avoid new dependencies; use existing chart component on the public view.
- Store expiration in UTC and compare server-side on read.

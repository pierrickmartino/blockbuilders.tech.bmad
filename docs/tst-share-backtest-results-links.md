# Test Checklist – Shareable Backtest Result Links

> Source PRD: `prd-share-backtest-results-links.md`

## 1. Link Generation (Authenticated)

- [x] `POST /backtests/{run_id}/share-links` creates a share link for a completed backtest run
- [x] Endpoint requires authentication; unauthenticated requests return 401
- [ ] User can only generate links for their own backtest runs (authorization check returns 403 for others)
- [x] Request with a valid `expires_at` timestamp creates a link that expires at that time
- [x] Request with `expires_at: null` creates a link that never expires
- [x] Response includes a `url` field with the shareable URL containing the token
- [x] Response includes an `expires_at` field matching the request
- [x] Token in the URL is unique and unguessable (at least 32 characters)
- [x] Multiple share links can be generated for the same backtest run
- [x] Attempting to create a share link for a non-existent run returns 404
- [x] Attempting to create a share link for an incomplete/running backtest returns an appropriate error

## 2. Data Model

- [x] `shared_backtest_links` table exists with columns: `id`, `backtest_run_id`, `token`, `expires_at`, `created_at`
- [x] `id` is a UUID primary key
- [x] `backtest_run_id` is a UUID foreign key referencing the backtest runs table
- [x] `token` column has a unique constraint
- [x] `expires_at` is nullable (null means no expiration)
- [x] `created_at` is auto-populated on insert

## 3. Public View API (No Auth)

- [ ] `GET /share/backtests/{token}` returns backtest results without requiring authentication
- [x] Response includes summary metrics (Total Return, CAGR, Max Drawdown, Trades, Win Rate)
- [x] Response includes equity curve data
- [x] Response includes header info: asset, timeframe, date range
- [x] Response does NOT include strategy definition, blocks, or parameters
- [x] Response does NOT include the trades list
- [x] Response does NOT include user-identifying details (email, user name)
- [x] Valid, non-expired token returns 200 with data
- [x] Expired token returns 404 with a plain-language error message
- [x] Invalid/non-existent token returns 404 with a plain-language error message
- [x] Expiration check is performed server-side using UTC timestamps

## 4. Public View UI

- [x] Public view page renders without requiring login
- [x] Header displays asset, timeframe, and date range
- [x] Summary metric cards display: Total Return, CAGR, Max Drawdown, Trades, Win Rate
- [ ] Equity curve chart renders correctly
- [x] A note is displayed: "Shared results -- strategy logic hidden" (or similar)
- [x] No navigation to strategy editor or other authenticated pages is available
- [ ] Public view renders correctly on desktop
- [ ] Public view renders correctly on mobile
- [x] Expired link shows a user-friendly error page with plain-language message
- [x] Invalid link shows a user-friendly error page with plain-language message

## 5. Share UX Flow (Authenticated User)

- [x] "Share Results" button is visible on completed backtest result pages
- [x] "Share Results" button is NOT visible on incomplete/running backtests
- [x] Clicking "Share Results" opens a modal or inline panel
- [x] Expiration selector offers options (e.g., 7 days, 30 days, never)
- [x] "Generate Link" button triggers link creation
- [x] Generated URL is displayed and easily copyable (copy-to-clipboard)
- [x] UI provides feedback after copying (e.g., "Copied!" confirmation)

## 6. Privacy & Security

- [x] Tokens are cryptographically random and at least 32 characters long
- [x] Tokens cannot be enumerated or guessed via sequential patterns
- [x] Expired links are blocked server-side (not just client-side)
- [x] Public view does not leak strategy logic in any response field or HTML source
- [x] Public view does not expose user email, name, or other PII
- [ ] No public indexing or discoverability of shared links (no sitemap, no search listing)

## 7. Edge Cases & Negative Tests

- [ ] Sharing a backtest whose underlying strategy was deleted still works (link references backtest run, not strategy)
- [x] Generating a link with an `expires_at` in the past returns an appropriate error or immediately expires
- [x] Very long or malformed token in the URL returns 404 gracefully (no 500 error)
- [ ] Concurrent link generation for the same backtest run produces distinct tokens
- [ ] No new frontend or backend dependencies are introduced
- [ ] Existing backtest result serializers are reused (no duplicated serialization logic)

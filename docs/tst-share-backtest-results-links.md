# Test Checklist – Shareable Backtest Result Links

> Source PRD: `prd-share-backtest-results-links.md`

## 1. Link Generation (Authenticated)

- [x] `POST /backtests/{run_id}/share-links` creates a share link for a completed backtest run
- [ ] Endpoint requires authentication; unauthenticated requests return 401
- [ ] User can only generate links for their own backtest runs (authorization check returns 403 for others)
- [ ] Request with a valid `expires_at` timestamp creates a link that expires at that time
- [ ] Request with `expires_at: null` creates a link that never expires
- [ ] Response includes a `url` field with the shareable URL containing the token
- [ ] Response includes an `expires_at` field matching the request
- [ ] Token in the URL is unique and unguessable (at least 32 characters)
- [ ] Multiple share links can be generated for the same backtest run
- [ ] Attempting to create a share link for a non-existent run returns 404
- [ ] Attempting to create a share link for an incomplete/running backtest returns an appropriate error

## 2. Data Model

- [ ] `shared_backtest_links` table exists with columns: `id`, `backtest_run_id`, `token`, `expires_at`, `created_at`
- [ ] `id` is a UUID primary key
- [ ] `backtest_run_id` is a UUID foreign key referencing the backtest runs table
- [ ] `token` column has a unique constraint
- [ ] `expires_at` is nullable (null means no expiration)
- [ ] `created_at` is auto-populated on insert

## 3. Public View API (No Auth)

- [ ] `GET /share/backtests/{token}` returns backtest results without requiring authentication
- [ ] Response includes summary metrics (Total Return, CAGR, Max Drawdown, Trades, Win Rate)
- [ ] Response includes equity curve data
- [ ] Response includes header info: asset, timeframe, date range
- [ ] Response does NOT include strategy definition, blocks, or parameters
- [ ] Response does NOT include the trades list
- [ ] Response does NOT include user-identifying details (email, user name)
- [ ] Valid, non-expired token returns 200 with data
- [ ] Expired token returns 404 with a plain-language error message
- [ ] Invalid/non-existent token returns 404 with a plain-language error message
- [ ] Expiration check is performed server-side using UTC timestamps

## 4. Public View UI

- [ ] Public view page renders without requiring login
- [ ] Header displays asset, timeframe, and date range
- [ ] Summary metric cards display: Total Return, CAGR, Max Drawdown, Trades, Win Rate
- [ ] Equity curve chart renders correctly
- [ ] A note is displayed: "Shared results -- strategy logic hidden" (or similar)
- [ ] No navigation to strategy editor or other authenticated pages is available
- [ ] Public view renders correctly on desktop
- [ ] Public view renders correctly on mobile
- [ ] Expired link shows a user-friendly error page with plain-language message
- [ ] Invalid link shows a user-friendly error page with plain-language message

## 5. Share UX Flow (Authenticated User)

- [ ] "Share Results" button is visible on completed backtest result pages
- [ ] "Share Results" button is NOT visible on incomplete/running backtests
- [ ] Clicking "Share Results" opens a modal or inline panel
- [ ] Expiration selector offers options (e.g., 7 days, 30 days, never)
- [ ] "Generate Link" button triggers link creation
- [ ] Generated URL is displayed and easily copyable (copy-to-clipboard)
- [ ] UI provides feedback after copying (e.g., "Copied!" confirmation)

## 6. Privacy & Security

- [ ] Tokens are cryptographically random and at least 32 characters long
- [ ] Tokens cannot be enumerated or guessed via sequential patterns
- [ ] Expired links are blocked server-side (not just client-side)
- [ ] Public view does not leak strategy logic in any response field or HTML source
- [ ] Public view does not expose user email, name, or other PII
- [ ] No public indexing or discoverability of shared links (no sitemap, no search listing)

## 7. Edge Cases & Negative Tests

- [ ] Sharing a backtest whose underlying strategy was deleted still works (link references backtest run, not strategy)
- [ ] Generating a link with an `expires_at` in the past returns an appropriate error or immediately expires
- [ ] Very long or malformed token in the URL returns 404 gracefully (no 500 error)
- [ ] Concurrent link generation for the same backtest run produces distinct tokens
- [ ] No new frontend or backend dependencies are introduced
- [ ] Existing backtest result serializers are reused (no duplicated serialization logic)

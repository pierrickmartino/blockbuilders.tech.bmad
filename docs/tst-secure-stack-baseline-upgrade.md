# Test Checklist – Secure Stack Baseline Upgrade

> Source PRD: `prd-secure-stack-baseline-upgrade.md`

---

## 1. Version Baseline Validation

- [ ] Frontend dependency lock shows Next.js 16.x
- [ ] Backend dependencies show FastAPI 0.129.x
- [ ] API runtime reports Python 3.12
- [ ] Worker runtime reports Python 3.12
- [ ] Scheduler runtime reports Python 3.12

## 2. Service Startup & Health

- [ ] `docker compose up --build` completes without upgrade-related failures
- [ ] Frontend starts successfully and serves the app
- [ ] API starts successfully and serves OpenAPI docs
- [ ] Worker starts successfully and connects to Redis
- [ ] Scheduler starts successfully and connects to Redis
- [ ] `GET /health` returns healthy status

## 3. Route Regression Checks

- [ ] Public auth pages load (`/`, `/forgot-password`, `/reset-password?token=...`)
- [ ] OAuth callback route remains reachable (`/auth/callback`)
- [ ] Dashboard route remains reachable after login (`/dashboard`)
- [ ] Strategy list route remains reachable (`/strategies`)
- [ ] Public shared result route remains reachable (`/share/backtests/[token]`)

## 4. Functional Smoke Tests

### 4.1 Login
- [ ] User can log in with valid email/password
- [ ] Invalid credentials return expected plain-language error

### 4.2 Strategy Creation
- [ ] User can create a strategy from the existing strategy flow
- [ ] New strategy appears in the strategy list

### 4.3 Backtest Run
- [ ] User can run a backtest from a saved strategy
- [ ] Run completes with expected status (`completed` or expected non-failure terminal state)
- [ ] Backtest results page loads key summary metrics

## 5. OAuth Callback Flow

- [ ] Google OAuth callback still completes login flow (or returns expected safe error in non-configured environments)
- [ ] GitHub OAuth callback still completes login flow (or returns expected safe error in non-configured environments)
- [ ] OAuth state validation behavior remains intact (invalid/missing state rejected)

## 6. Shared Result Links

- [ ] Existing valid shared link still opens read-only results page
- [ ] Invalid token shared link returns expected not-found/error state
- [ ] Expired link behavior remains correct if expiration is configured
- [ ] Shared page does not expose strategy logic details

## 7. Non-Functional Sanity

- [ ] No new infrastructure/services were introduced for this upgrade
- [ ] No unrelated product behavior changes were introduced
- [ ] Upgrade-specific logs/errors are documented in PR notes if encountered

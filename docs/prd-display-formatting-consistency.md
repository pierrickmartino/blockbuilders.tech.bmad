# PRD — Display Formatting Consistency (Numbers, Currency, Timezones)

**File purpose:** Standardize how the app renders numbers (prices, P&L, metrics), currencies, and datetimes across all UI surfaces.

**Applies to MVP surfaces:** strategy list, backtest overview metrics, equity curve tooltips, and trades table.

---

## 1) Problem

Today the UI shows **mixed number separators** (e.g., `12,345.67` vs `12.345,67`) and inconsistent decimal precision. Datetimes also vary by screen and don’t offer a clear UTC vs local choice.

This makes results harder to trust and harder to compare across screens.

---

## 2) Goals

1. **Consistent number formatting** across the entire UI (no mixed locale separators).
2. **Clear currency display + precision rules** for common values (price, equity, P&L, %).
3. **Timezone toggle** (UTC vs user local) that affects all displayed datetimes.
4. **One consistent datetime format** everywhere.

---

## 3) Non-goals (keep it simple)

- No full i18n framework or multi-language rollout.
- No complex per-exchange formatting rules.
- No reformatting of *stored* data; this is a **display-layer** change.
- No new advanced analytics or reporting features.

---

## 4) Scope

### In-scope UI surfaces
- Strategy list + strategy detail pages: last modified, last run, headline metrics. fileciteturn0file0
- Backtest results:
  - Metrics cards (return, CAGR, max drawdown, # trades, win rate). fileciteturn0file0
  - Equity curve tooltip values (equity, drawdown).
  - Trades table (entry/exit time & price, P&L). fileciteturn0file0

### In-scope settings
- A simple **Timezone** toggle: `Local` / `UTC`.
- (Optional but recommended) Persist the toggle in local storage so it sticks on refresh.

---

## 5) UX / Display Standards

### 5.1 One formatting source-of-truth
All UI rendering of numbers and datetimes MUST go through shared helpers (e.g., `format.ts`), not ad-hoc `toFixed()`, string concatenation, or random date formatting per component.

**Rule:** “No raw numbers/dates in JSX.” Only formatted strings.

### 5.2 Locale choice (stop mixed separators)
Pick **one locale per session** and use it everywhere:
- Default: `navigator.language` (browser locale)
- Fallback: `en-US`

Do not hardcode different locales in different places.

> This fixes mixed separators by ensuring a single formatting engine and locale is used throughout.

---

## 6) Formatting Rules

### 6.1 Number formatting (generic)
- Use `Intl.NumberFormat(locale, { useGrouping: true, ... })`.
- Never manually insert separators.
- Handle invalid values (`null`, `undefined`, `NaN`) by rendering `—`.

### 6.2 Currency display
**MVP assumption:** Most values are denominated in the strategy’s **quote currency** (e.g., `USDT`). fileciteturn0file0

Because `USDT` is not a standard ISO currency for `Intl.NumberFormat`, render currency as a **suffix**:

- Example: `12,345.67 USDT`
- Negative P&L: `−123.45 USDT` (minus sign)
- Positive P&L: `+123.45 USDT` (explicit plus sign)

If later you support ISO currencies (USD, EUR), you may switch to `currencyDisplay: "symbol"` for those only.

### 6.3 Precision rules (simple defaults)

| Value type | Precision | Example |
|---|---:|---|
| **Price (BTC/USDT, ETH/USDT)** | **2 decimals** | `43,210.55 USDT` |
| **Equity / Balance** | **2 decimals** | `10,000.00 USDT` |
| **P&L (per trade + totals)** | **2 decimals** | `+120.34 USDT` |
| **Percent values** (return, CAGR, win rate, drawdown) | **2 decimals** | `12.34%` |
| **Fees & slippage** (if displayed as money) | **2 decimals** | `3.21 USDT` |
| **Quantities** (if shown) | up to **6 decimals**, trim trailing zeros | `0.1234 BTC` |

**Notes**
- If an asset is added later where 2-decimal price is misleading, add a *single* per-asset override in a small config map (don’t invent complex heuristics).

### 6.4 Consistent datetime format
Display all datetimes as:

**`YYYY-MM-DD HH:mm` (24-hour clock)**

Examples:
- Local: `2025-12-23 14:05`
- UTC: `2025-12-23 13:05`

Optional (nice-to-have): show a small label in tooltips like `UTC` when in UTC mode.

---

## 7) Timezone Toggle

### 7.1 Behavior
- Toggle options: **Local** (default) and **UTC**
- Applies globally to all datetime rendering:
  - Backtest run timestamps
  - Strategy “last modified”
  - Trades table times
  - Chart tooltips

### 7.2 Storage (simple)
- Persist to `localStorage` key: `bb.display.timezone` = `local` | `utc`
- Load on app boot; fallback to `local` if missing.

(If you already have `/users/me` settings, you can later store it there, but do not block this PRD on backend changes.) fileciteturn0file1

---

## 8) API & Data Contract Notes (minimal but important)

- API should return:
  - **Numbers as numbers** (not pre-formatted strings).
  - **Timestamps in ISO 8601 UTC** (e.g., `2025-12-23T13:05:00Z`) or epoch ms.
- Frontend is responsible for display formatting only.

---

## 9) Acceptance Criteria (Definition of Done)

### Consistency
- On all in-scope pages, numbers use **one locale** and never mix separators.
- No UI component uses `toFixed()` or manual concatenation for display (except inside the shared formatter helpers).

### Precision & currency
- BTC/USDT and ETH/USDT prices are displayed with **2 decimals** and include `USDT`.
- All P&L values show **2 decimals**, include currency, and include a `+` for positive.

### Datetimes
- All displayed datetimes use **`YYYY-MM-DD HH:mm`**.
- Switching timezone toggle updates all datetimes on the page without a refresh.

### Persistence
- Timezone toggle persists across refresh via `localStorage`.

### QA checklist
- Strategy list: metrics + last modified.
- Backtest overview: all metric cards.
- Trades table: entry/exit times, entry/exit prices, P&L column.
- Chart tooltip: equity values and timestamps.

---

## 10) Implementation Notes (recommended approach)

### 10.1 Frontend utilities (TypeScript)
Create a single module, e.g. `src/lib/format.ts`:

- `formatPrice(value, { quote, pair })`
- `formatMoney(value, { quote, sign })`
- `formatPercent(value)`
- `formatQuantity(value, { base })`
- `formatDateTime(dateOrIsoString, { tzMode })`

Implementation uses only:
- `Intl.NumberFormat`
- `Intl.DateTimeFormat` with `timeZone: "UTC"` when UTC is selected, otherwise omit `timeZone` (local).

### 10.2 UI wiring
- Add a small toggle in an obvious place (e.g., top-right user menu or settings).
- Store preference in localStorage and expose it via a tiny React context/hook, e.g. `useDisplaySettings()`.

---

## 11) Rollout Plan

1. Add formatter utilities + timezone setting.
2. Update the 3 most visible surfaces first:
   - Backtest metrics
   - Trades table
   - Strategy list
3. Sweep remaining components and remove old formatting calls.
4. Quick regression pass using the QA checklist above.

---

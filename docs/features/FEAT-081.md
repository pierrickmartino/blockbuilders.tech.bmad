# PRD: Strategy Building Wizard (Frontend)

**Status:** Implemented
**Owner:** Product
**Last Updated:** 2025-12-30

---

## 1. Summary
A guided, beginner-friendly wizard that asks a few simple questions and auto-generates a basic strategy definition JSON. The strategy opens on the canvas and is fully editable. This is a **frontend-only** feature that creates existing block types and connections.

---

## 2. Goals
- Help non-technical users create their first strategy quickly.
- Teach canvas patterns by generating a readable starter structure.
- Keep the wizard short (4–6 questions) and simple.
- Generate valid definition JSON compatible with the existing canvas/backtest engine.

## 3. Non-Goals
- No backend changes or new APIs.
- No new block types.
- No advanced strategy customization (multi-asset, multi-timeframe, shorting, etc.).
- No strategy validation beyond existing validation.

---

## 4. Target Users
- Beginner retail traders new to strategy building.
- Users who want a quick starting point rather than a blank canvas.

---

## 5. User Stories
1. As a beginner, I want to answer a few questions and see a basic strategy appear on the canvas.
2. As a user, I want to edit the generated strategy like any other canvas strategy.
3. As a user, I want the wizard to keep things simple with clear, plain-language questions.

---

## 6. UX Flow
**Entry points:**
- Strategy list empty state (“Create with wizard”)
- New strategy modal (“Use wizard”)

**Flow (single-column):**
1. Choose a signal type.
2. Configure indicator parameters (fast/slow or RSI period).
3. Choose an exit rule (simple opposite signal or RSI reversion).
4. Optional: choose risk defaults (stop loss, take profit). Defaults pre-filled.
5. Review summary → Create strategy.

**Completion:**
- Create strategy + version (existing flow) with generated definition JSON.
- Navigate to strategy editor with the generated canvas loaded.

---

## 7. Wizard Questions (Minimal Set)
1. **What signal do you want to trade?**
   - Moving average crossover
   - RSI mean reversion
2. **How fast should the signal be?**
   - If MA crossover: fast period (default 10), slow period (default 30)
   - If RSI: period (default 14)
3. **When should it exit?**
   - Exit on opposite signal (default)
   - Exit on RSI returning to neutral (for RSI flow only, default 50)
4. **Risk controls (optional)**
   - Stop loss % (default 5)
   - Take profit % (default 10)

Defaults are pre-filled to keep the flow short (user can accept and continue).

---

## 8. Strategy Templates (JSON Generation)
All templates generate:
- `price` input (close)
- One or two indicator blocks
- One logic block (compare or crossover)
- `entry_signal` block
- `exit_signal` block (if applicable)
- Optional `stop_loss` + `take_profit` blocks

### 8.1 Template A — Moving Average Crossover
**Blocks:**
- `price` (close)
- `sma` (fast)
- `sma` (slow)
- `crossover` (fast crosses above slow)
- `entry_signal`
- `crossover` (fast crosses below slow)
- `exit_signal`
- Optional `stop_loss`, `take_profit`

**Connections:**
- price → sma(fast)
- price → sma(slow)
- sma(fast) + sma(slow) → crossover(entry)
- crossover(entry) → entry_signal
- sma(fast) + sma(slow) → crossover(exit)
- crossover(exit) → exit_signal

### 8.2 Template B — RSI Mean Reversion
**Blocks:**
- `price` (close)
- `rsi` (period)
- `compare` (rsi < 30) → entry
- `entry_signal`
- `compare` (rsi > 50) → exit
- `exit_signal`
- Optional `stop_loss`, `take_profit`

**Connections:**
- price → rsi
- rsi + constant(30) → compare(entry)
- compare(entry) → entry_signal
- rsi + constant(50) → compare(exit)
- compare(exit) → exit_signal

---

## 9. Data & Types
- Use existing `CanvasDefinition` structure (`frontend/src/types/canvas.ts`).
- Block IDs generated via `crypto.randomUUID()`.
- Use existing canvas utilities for conversion/normalization (`frontend/src/lib/canvas-utils.ts`).
- No API schema changes.

---

## 10. Error Handling
- Require all wizard steps to be answered (defaults satisfy this).
- Guard against invalid ranges (reuse existing min/max for indicators).
- If generation fails, show a single error toast and stay on wizard step.

---

## 11. Analytics (Optional)
Keep it minimal (optional):
- Track wizard start and completion events only if existing analytics pipeline is in place.

---

## 12. Acceptance Criteria
- Wizard is accessible from strategy creation entry points.
- Wizard completes in ≤6 questions.
- Generates valid definition JSON with existing block types.
- Generated strategy opens on the canvas and is editable.
- No backend changes required.
- Default values produce a valid strategy without user edits.

---

## 13. Open Questions
- Should the wizard create a strategy name automatically (e.g., “MA Crossover 10/30”)?
- Should we offer EMA instead of SMA for the crossover template?

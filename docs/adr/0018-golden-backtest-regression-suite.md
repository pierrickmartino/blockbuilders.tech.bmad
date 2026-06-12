# ADR-0018 — Golden-backtest regression suite is full-pipeline, template-sourced, and bootstraps CI

- **Status**: Accepted
- **Date**: 2026-06-12
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Block Catalogue, Interpreter,
  Engine, Strategy validator; `docs/ACTIONS.md` #11 (this item), #10 /
  [ADR-0017](./0017-how-backtests-work-is-a-public-trust-artifact.md) (the
  trust page this suite mechanically backs); `backend/tests/test_backtest_engine.py`
  (`TestGoldenSnapshot`, `TestCrossConditionSnapshot`) and
  `backend/tests/test_backtest_characterization.py` (the existing
  engine-only golden tests this ADR extends, not replaces).

## Context

ACTIONS #11 reads as greenfield ("a suite of known-good golden strategies +
expected metrics, run in CI, that fails the build on any deviation"), but two
things are already true and one thing is missing:

1. **Engine-level golden tests already exist.** `TestGoldenSnapshot`,
   `TestCrossConditionSnapshot`, and `TestCharacterizationAllPaths` lock
   `run_backtest()` output bit-for-bit against hand-fed `StrategySignals` and
   synthetic candles, with a documented rounding contract (summary fields
   exact, unrounded per-trade floats via `pytest.approx(rel=1e-9)`, equity
   curve approx). These protect the **Engine** and **PositionManager** but
   bypass the **Interpreter**, the **Block Catalogue**, and the **Strategy
   validator** entirely — a regression in any of those three would not be
   caught.
2. **Real strategy graphs already exist as fixtures.** The three seed
   templates (`backend/app/data/strategy_templates.py` — RSI Oversold
   Bounce, MA Crossover, Bollinger Breakout) are real, user-facing
   `definition_json` graphs covering ~9 of ~23 catalogue block types
   (`rsi`, `sma`, `bollinger`, `compare`, `crossover`, `constant`, `price`,
   `entry_signal`, `exit_signal`).
3. **There is no CI anywhere in this repo** — no `.github/workflows/`, no
   other CI config — despite `CLAUDE.md` describing "GitHub Actions CI" as
   part of the stack. #11's "fails the build" promise has nowhere to run.

So #11 is not "write golden tests from scratch." It is "close the
Interpreter/Catalogue/Validator gap the existing engine-only goldens don't
cover, using strategies that already exist — and, as a prerequisite, give
the repo its first CI."

## Decision

**A new file, `backend/tests/test_golden_backtest_regression.py`, runs the
real worker pipeline** — `StrategyDefinitionValidate.model_validate(definition_json)`
→ `validate_strategy()` → `interpret_strategy()` → `run_backtest()` (the same
sequence as `app/worker/jobs.py::run_backtest_job`) — **against the three
existing seed templates**, with deterministic synthetic candle series
(generated in Python, same convention as `test_interpreter.py` /
`test_backtest_engine.py` — no recorded market data fixtures). Assertions
follow the existing rounding contract verbatim (exact equality on rounded
summary/cost fields, `pytest.approx(rel=1e-9)` on unrounded per-trade floats
and the equity curve), as inline pytest asserts — no external snapshot
library.

**Look-ahead-bias tests, in the same file**, use a single-cut-point mutation
per golden strategy: pick a candle index after at least one trade has closed,
replace every candle from that index onward with a sharply reversed synthetic
series (uptrend → downtrend or vice versa), re-run the full pipeline, and
assert that every trade with `entry_time <= cut` and every equity-curve point
up to `cut` is bit-for-bit identical to the unmutated golden run. This
directly tests the **no-look-ahead guarantee** the Trust page
([ADR-0017](./0017-how-backtests-work-is-a-public-trust-artifact.md))
documents to users, at the full-pipeline level — distinct from (and a
superset of) the structural `i+1`-open execution `engine.py` already
implements.

**Catalogue coverage is intentionally partial.** The ~14 block types not
exercised by the three seed templates (MACD, ADX, Ichimoku, ATR, stochastic,
fibonacci, OBV, ATR-based trailing stop, etc.) are **not** given golden
coverage in this slice. Extending coverage to the full catalogue is a
follow-up, not blocking #11.

**CI is bootstrapped as a prerequisite, scoped to the full backend suite, not
just the golden tests.** A new `.github/workflows/backend-tests.yml` runs
`pytest` (the entire `backend/tests/` suite — ~50 files, SQLite per
`pytest.ini`) on push/PR. Scoping CI to *only* the new golden file was
rejected: a CI pipeline that exists but runs 3 of 50 test files would be
stranger than the gap it closes, and the golden suite's value (catching
silent drift) is only meaningful alongside the rest of the suite also being
gated. Frontend CI is explicitly out of scope — a separate decision for a
separate item.

## Consequences

**Positive:**
- Closes the real gap: a regression in `interpret_strategy()`, a catalogue
  `BlockHandler.compute()`, or `validate_strategy()` now fails a test, where
  before only `run_backtest()` itself was protected.
- Reuses real, maintained artifacts (seed templates) rather than inventing
  parallel "golden" graphs that could drift from what users actually run.
- The look-ahead mutation test is a direct, automated check of the claim the
  public Trust page (ADR-0017) makes to prospects — #11's "underwrites the
  trust page with real guarantees" win is now literally true.
- The repo gets CI for the first time, gating *all* existing backend tests,
  not just the new ones — a foundational win beyond #11's literal scope.

**Negative / non-obvious:**
- CI appearing as a side effect of a "golden backtest" backlog item will look
  odd in git history without this ADR — hence recording it here.
- Catalogue coverage remains partial (~9/23 block types). A future regression
  in an uncovered indicator (e.g. MACD) will not be caught by this suite.
  Flagged as a known gap, not a silent one.
- As with the existing engine-only goldens, any *intentional* engine/
  interpreter change requires re-capturing baseline values by hand (no
  auto-regenerate tooling) — consistent with current practice, but a
  recurring maintenance cost as the suite grows.
- If CI run time becomes a problem as the suite grows, "full suite on every
  push" may need revisiting (e.g. path filters, matrix splitting) — not a
  concern at current size (~50 files).

## Alternatives considered

- **Hand-craft new minimal graphs per block type** instead of reusing seed
  templates. Rejected: duplicates maintenance surface and risks drifting from
  what users actually run; the seed templates are already real and maintained.
- **Recorded real-market OHLCV fixtures** instead of synthetic candles.
  Rejected: non-deterministic provenance, larger diffs, and no precedent in
  the existing test suite — synthetic candles are already the established
  pattern and fully reproducible.
- **External snapshot library** (e.g. syrupy) instead of inline asserts.
  Rejected: introduces a new test dependency and a less-reviewable "blob" diff
  in PRs; the existing inline-assert convention with a documented rounding
  contract already works and this suite should look like its neighbours.
- **Multiple look-ahead cut points** (one per trade boundary) instead of a
  single cut. Rejected for this slice: multiplies full-pipeline runs per
  golden strategy for marginal extra confidence; a single cut after at least
  one closed trade already proves the no-look-ahead property end-to-end.
- **Defer CI entirely, write tests only.** Rejected: #11 explicitly promises
  "fails the build on any deviation," which is meaningless without CI: the
  prerequisite is in scope.
- **Full catalogue coverage now.** Rejected: would roughly triple the new
  file's size for block types with no current golden regression history;
  follow-up item once this slice lands.

# PRD — Golden-backtest regression suite (ACTIONS #11)

> Design record: [ADR-0018](./adr/0018-golden-backtest-regression-suite.md).
> Backlog item: `docs/ACTIONS.md` #11.

## Problem Statement

Blockbuilders' core promise is "find out if your idea works" — and the
trust page tells prospects exactly how the number is computed (default
fees/slippage/spread, next-candle-open execution, OHLCV-only,
completed-candles-only / no look-ahead). That trust is only as good as the
guarantee that the number doesn't silently change underneath users.

Today, the only automated protection against a silent change is a set of
golden tests that feed hand-built signals directly into the backtest
**Engine**, skipping the **Interpreter**, the **Block Catalogue**, and the
**Strategy validator**. A regression in any of those three — e.g. an RSI
calculation drifting, a `compare` block's operator handling changing, or a
validation rule becoming stricter — would not be caught by any existing
test, and would not fail any build, because there is no CI in this repo at
all.

## Solution

Extend the golden-regression approach to the **full pipeline** that real
backtests run through (`validate_strategy` → `interpret_strategy` →
`run_backtest`, the same sequence as `app/worker/jobs.py`), using the three
real strategy graphs already shipped as seed templates (RSI Oversold Bounce,
MA Crossover, Bollinger Breakout) against deterministic synthetic candle
data. Each golden strategy gets:

- A **golden snapshot test** asserting every observable field of the
  resulting `BacktestResult` against a captured baseline, using the same
  rounding contract as the existing engine-level golden tests.
- A **look-ahead-bias test** that mutates the candle series after a cut
  point (reversing the trend) and proves every trade and equity-curve point
  up to that cut is bit-for-bit unchanged — a mechanical, automated check of
  the no-look-ahead guarantee the trust page promises.

This also bootstraps the repo's **first CI workflow**, running the full
backend `pytest` suite (not just the new golden file) on every push/PR — so
"fails the build on any deviation" becomes literally true, for this suite
and the ~50 existing test files alike.

## User Stories

1. As a developer refactoring the backtest **Engine**, I want a full-pipeline
   golden regression suite, so that I can detect unintended changes to real
   strategy outcomes before merging.
2. As a developer modifying the **Interpreter**, I want golden tests that
   exercise real strategy graphs through `validate_strategy` →
   `interpret_strategy` → `run_backtest`, so that interpreter-level
   regressions are caught even when the Engine itself is unchanged.
3. As a developer modifying a **Block Catalogue** handler (RSI, SMA,
   Bollinger, compare, crossover, constant, price), I want golden tests
   covering strategies that use those blocks, so that catalogue regressions
   surface immediately.
4. As a developer, I want the golden strategies sourced from the existing
   seed templates (`app/data/strategy_templates.py`), so the suite reflects
   strategies real users actually run rather than parallel test-only graphs
   that can drift from reality.
5. As a developer, I want deterministic synthetic candle data per golden
   strategy, so test runs are fully reproducible without depending on
   external market data or providers.
6. As a developer, I want golden assertions to follow the existing rounding
   contract (exact equality on rounded `BacktestResult` summary/cost fields
   and equity-curve values; `pytest.approx(rel=1e-9)` on unrounded per-trade
   `pnl`/`exit_price`), so the new suite is exactly as strict as — and
   consistent with — the existing engine-level golden tests.
7. As a developer, I want a reusable pipeline-runner helper that encapsulates
   the validate → interpret → run_backtest sequence behind one call, so
   future golden tests (e.g. extended catalogue coverage) don't need to
   re-wire the pipeline.
8. As a product owner relying on the trust page's "no look-ahead" claim, I
   want an automated test proving future candle data cannot change past
   trade outcomes, so the guarantee documented to users is mechanically
   enforced, not just asserted in prose.
9. As a developer, I want the look-ahead test to use a single cut point per
   golden strategy — chosen after at least one trade has closed — with a
   sharply reversed candle tail, so the test is a strong, cheap proof without
   multiplying full-pipeline runs per strategy.
10. As a developer, I want a reusable mutation/comparison helper
    (`mutate_tail` + `assert_prefix_unchanged`) with its own unit tests, so
    the look-ahead test's correctness doesn't silently depend on the specific
    shape of each golden strategy's candles.
11. As a developer pushing a commit or opening a PR, I want CI to
    automatically run the full backend `pytest` suite, so I get fast feedback
    on any regression — golden or otherwise — without running tests locally.
12. As a maintainer, I want this to be the repo's first CI workflow, so all
    ~50 existing backend test files are gated on every push/PR going forward,
    not just the new golden suite.
13. As a developer, I want the CI workflow's Python version and dependency
    install to match `backend/Dockerfile` (Python 3.12, `requirements.txt`),
    so CI accurately reflects the production runtime.
14. As a developer, I want CI to run with the same environment overrides as
    `pytest.ini` (SQLite `test.db`, fake Stripe/S3/Redis values), so CI runs
    match local `pytest` runs exactly and require no secrets or service
    containers.
15. As a developer extending catalogue coverage in a follow-up, I want the
    golden suite's helper modules (pipeline runner, candle generators,
    mutation helper) to be easily reusable, so adding golden strategies for
    currently-uncovered block types (MACD, ADX, Ichimoku, ATR, stochastic,
    fibonacci, OBV, ATR trailing stop) is low-friction.
16. As a developer, I want the new golden test file to document its rounding
    contract and the provenance of its baseline values inline, matching the
    documentation style of `TestGoldenSnapshot` and
    `TestCharacterizationAllPaths`, so future maintainers know "do not change
    these assertions unless the change is intentional — and re-capture from
    main first."
17. As a developer, I want each golden strategy's candle series shaped to
    produce at least one realized (non-end-of-data) trade plus a final
    end-of-data forced close, so golden coverage is meaningful rather than a
    zero-trade no-op.
18. As a developer running `pytest` locally, I want the new golden and
    look-ahead tests to run as part of the normal `pytest` invocation — no
    special markers or flags — so they're exercised by default both locally
    and in CI.
19. As a reviewer of a PR that intentionally changes engine/interpreter/
    catalogue behavior, I want a failing golden test to show a clear
    pytest diff between expected and actual values, so I can quickly verify
    whether the new baseline values are correct before updating the test.
20. As a maintainer, I want `docs/ACTIONS.md` #11 and ADR-0018 to remain the
    canonical record of why this suite exists in this shape, so future
    readers understand the design rationale without re-deriving it from the
    test code.

## Implementation Decisions

- **Pipeline scope**: the new suite runs the real worker sequence —
  `StrategyDefinitionValidate.model_validate(definition_json)` →
  `validate_strategy(...)` → `interpret_strategy(validated_strategy,
  candles)` → `run_backtest(...)` — mirroring `app/worker/jobs.py`'s
  `run_backtest_job`. A golden strategy that fails `validate_strategy` is
  itself a regression and should raise/fail loudly, not be silently skipped.

- **Golden strategies**: the three existing seed templates (RSI Oversold
  Bounce, MA Crossover, Bollinger Breakout) from
  `app/data/strategy_templates.py`, used as-is (their `definition_json`,
  unmodified). No new template graphs are introduced in this slice.

- **Candle data**: synthetic, generated in Python following the existing
  `make_candle`-style helper convention used in
  `test_backtest_engine.py`/`test_interpreter.py`. One candle series per
  golden strategy, sized and shaped so that:
  - the strategy's entry/exit logic fires at least once,
  - at least one trade closes via a non-`end_of_data` exit reason,
  - the series ends with a final candle producing an `end_of_data` forced
    close (matching the "all paths" pattern in
    `TestCharacterizationAllPaths`).

- **Pipeline-runner helper**: a single function with the shape
  `run_golden_pipeline(definition_json: dict, candles: list[Candle],
  run_config: dict) -> BacktestResult`. Encapsulates the four-step pipeline
  above. `run_config` carries `initial_balance`, `fee_rate`,
  `slippage_rate`, `spread_rate`, `timeframe` (mirrors `run_backtest`'s
  existing keyword arguments). Raises on any `validate_strategy` error
  (non-empty `ValidationResult.errors`).

- **Assertion / rounding contract**: identical to
  `TestGoldenSnapshot`/`TestCharacterizationAllPaths` —
  - `BacktestResult` summary fields, cost totals, and equity-curve `equity`
    values: exact equality (already rounded by the engine).
  - Per-trade unrounded floats (`pnl`, `pnl_pct`, `exit_price`,
    `entry_price`, `qty`, `sl_price_at_entry`, `tp_price_at_entry`):
    `pytest.approx(rel=1e-9)`.
  - One test class per golden strategy, with focused test methods
    (trade count + exit reasons, summary metrics, cost totals, equity
    curve, per-trade full-field checks) — same structure as
    `TestCharacterizationAllPaths`.

- **Look-ahead mutation design**:
  - `mutate_tail(candles: list[Candle], cut_index: int) -> list[Candle]` —
    returns a new candle list where every candle from `cut_index` onward is
    replaced by a synthetic series with the trend reversed (e.g. an uptrend
    tail becomes a downtrend, or vice versa), same length and timestamps as
    the original tail. Candles before `cut_index` are untouched (by value,
    not by reference — immutability per coding-style rules).
  - `assert_prefix_unchanged(golden_result: BacktestResult, mutated_result:
    BacktestResult, cut_timestamp: datetime) -> None` — asserts every trade
    in both results with `entry_time <= cut_timestamp` is identical
    (`exit_reason`, `exit_time` exact; `pnl`/`exit_price`/etc. via
    `approx(rel=1e-9)`), and every `equity_curve` point with timestamp
    `<= cut_timestamp` has an identical `equity` value.
  - One look-ahead test per golden strategy: pick `cut_index` as the index
    of the candle on which the strategy's first trade closes (from the
    golden test's own captured `exit_time`), call `mutate_tail`, re-run
    `run_golden_pipeline`, and call `assert_prefix_unchanged`.

- **CI workflow**: new `.github/workflows/backend-tests.yml`.
  - Triggers: `push` and `pull_request`.
  - Python 3.12 (matches `backend/Dockerfile`'s `python:3.12-slim`).
  - Install: `pip install -r backend/requirements.txt`.
  - Run: `pytest` from the `backend/` directory.
  - No service containers (Postgres/Redis/MinIO/Stripe) — `pytest.ini`
    already overrides `DATABASE_URL` to SQLite and provides fake
    Redis/S3/Stripe values for the test environment.

- **No changes** to `app/backtest/*`, `app/services/strategy_validation.py`,
  `app/data/strategy_templates.py`, or `app/worker/jobs.py` — this slice is
  additive (new test file + CI workflow), not a refactor.

## Testing Decisions

- **What makes a good test here**: assert on `BacktestResult`'s observable
  fields (trades, summary metrics, cost totals, equity curve) — never on
  `Interpreter`/`Catalogue` internals. This matches the existing golden-test
  philosophy: the contract under test is "what a user would see," not how
  it's computed internally.

- **New golden snapshot tests**: three test classes (one per seed template:
  RSI Oversold Bounce, MA Crossover, Bollinger Breakout), each following the
  `TestCharacterizationAllPaths` structure — multiple focused test methods
  per class rather than one giant assertion blob.

- **New look-ahead tests**: three tests (one per seed template), in the same
  new file, using `mutate_tail` + `assert_prefix_unchanged`.

- **Mutation/comparison helper gets dedicated unit tests** (the one helper in
  this slice with real logic worth isolating):
  - `mutate_tail`: asserts output length/timestamps match input, candles
    before `cut_index` are byte-identical to the input, and candles from
    `cut_index` onward differ and exhibit the reversed trend.
  - `assert_prefix_unchanged`: asserts it passes on two identical
    `BacktestResult`s, and raises `AssertionError` when a pre-cut trade or
    equity-curve point differs between the two results.

- **Pipeline runner and candle generators**: no dedicated unit tests —
  exercised implicitly by every golden/look-ahead test that calls them
  (per YAGNI: "if a test adds more code than confidence, skip it").

- **CI verification**: no separate "test for the CI config" — correctness is
  verified by the workflow running green on the PR that introduces it.

- **Prior art**:
  - `backend/tests/test_backtest_engine.py::TestGoldenSnapshot`,
    `TestCrossConditionSnapshot` — rounding contract and snapshot structure.
  - `backend/tests/test_backtest_characterization.py::TestCharacterizationAllPaths`
    — "all paths in one scenario" candle-shaping pattern and documentation
    style.
  - `backend/tests/test_interpreter.py` — candle-generation helper
    conventions (`make_descending_candles`, `make_uptrend_candles`) and
    `ValidatedStrategy` construction pattern.

## Out of Scope

- Full catalogue coverage (MACD, ADX, Ichimoku, ATR, stochastic, fibonacci,
  OBV, ATR-based trailing stop, and other block types not used by the three
  seed templates) — flagged in ADR-0018 as a follow-up item.
- Recorded real-market OHLCV fixtures — synthetic candles only.
- External snapshot libraries (e.g. syrupy) — inline pytest asserts only.
- Multiple look-ahead cut points per strategy — single cut point only.
- Frontend CI, or any frontend test changes.
- Auto-regeneration tooling for golden baseline values (baselines are
  captured by hand and hardcoded, as with the existing golden tests).
- Any changes to the seed templates, Interpreter, Engine, Catalogue, or
  `strategy_validation.py` themselves.
- CI optimizations (dependency caching, matrix splits, path filters) — not
  warranted at the current suite size (~50 test files).

## Further Notes

- Baseline values for the new golden and look-ahead tests cannot be derived
  a priori — the implementer runs the new tests once against the current
  (unmodified) engine/interpreter/catalogue, captures the actual output
  values, and hardcodes them as the asserted baseline, exactly as documented
  in `TestCharacterizationAllPaths`'s own comments ("Baseline was captured
  from the unmodified engine on the main branch").
- Full design rationale, rejected alternatives, and consequences are recorded
  in [ADR-0018](./adr/0018-golden-backtest-regression-suite.md); `docs/ACTIONS.md`
  #11 carries a short pointer to it.

# ADR-0025 — Run finalization owns its commit and runs after completion

- **Status**: Accepted
- **Date**: 2026-06-24
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Run finalization, Backtest
  pipeline, RunOutcome; [ADR-0021](0021-performance-alert-inherits-engine-trust.md)
  (performance alert firing / watermark durability); deepening candidate #1
  (extract post-run side-effects from `worker/jobs.py`)

## Context

`run_backtest_job` is documented as the *thin shell* around the pure
**Backtest pipeline**, but the completed-run side-effects had no interface:
the completion **Notification**, the onboarding flag, the auto-run
`last_auto_run_at` touch, and **performance alert** dispatch were inlined in
the success branch (`jobs.py:260–294`), and the 192-line
`_evaluate_pinned_alert` lived in the worker module. The only test surface for
*which* effects fire for *which* `triggered_by` was the whole job — candles,
pipeline, S3 upload included.

Extracting a `finalize_run(run, session)` module (**Run finalization**) forced
two boundary questions that the inline code answered only by accident:

1. **Transaction boundary.** Marking `status="completed"` and the four
   side-effects shared *one* transaction, committed at `jobs.py:295`, *inside*
   the job's `try/except`. So a side-effect exception (an S3 read hiccup, a
   malformed trade record in alert evaluation) rolled the transaction back and
   the `except` flipped the run to **failed** — destroying a successful,
   expensive backtest result. A notification bug could lose a completed run.

2. **Commit ownership.** The general worker convention (CONTEXT.md, Working
   copy) is *"every function flushes; the calling route or worker owns the
   commit."* But `_evaluate_pinned_alert` deliberately commits the alert
   watermark **before** slow email/webhook delivery (ADR-0021), so a stalled
   endpoint that blows the job timeout cannot leave the alert un-watermarked
   and re-fire next run. That ordering is intrinsic to the effect's
   correctness, not a caller's choice.

## Decision

**Run finalization runs *after* the completion commit, owns its own
transaction, and never fails the run.**

- The worker shell commits `status="completed"` + metrics + artifact keys
  **first**, then emits the `backtest_job_completed` lifecycle event, then
  calls `finalize_run(run, session)`. The expensive result is durable before
  any side-effect runs.
- `finalize_run` is wrapped so its exceptions are logged
  (`run_finalization_failed`) but **never** reach the failure handler. A
  side-effect error can no longer flip a completed run to failed or lose it.
- `finalize_run` **owns its commit** — an explicit, documented exception to
  "the calling shell owns the commit." Internally it `session.add`s every DB
  write (notification, onboarding, `last_auto_run_at`, alert watermark) and
  commits them **once, before** any best-effort email/webhook delivery. The
  watermark therefore lands in that single pre-delivery commit and ADR-0021's
  durability ordering holds by construction.
- Finalization is keyed off the persisted `run`, not the **RunOutcome**
  (metrics are already on the row), and is reached **only** from the success
  path. The failure branch, lifecycle analytics, and error→status mapping stay
  in the shell.

## Consequences

**Positive:**
- A completed backtest survives any side-effect failure — the result and its
  artifacts are committed before finalization is even called.
- One commit story: notification, onboarding, and watermark commit together in
  a single transaction, replacing the old split where the auto path was
  committed by the shell and the pinned path committed itself.
- `finalize_run(run, session)` is unit-testable against a committed
  completed-run fixture — assert notification present/skipped by
  `triggered_by`, onboarding flips once, watermark advances, delivery intents
  produced — with no pipeline, candle fetch, or artifact upload. This is the
  leverage the extraction was for.
- The internal "return a delivery intent, commit once, then deliver" seam is
  the exact shape candidate #2 consolidates the two alert paths onto.

**Negative:**
- The completion **Notification** is no longer atomic with run completion. A
  crash in the gap between the completion commit and finalization leaves a
  completed run with no "done" notification (recoverable, minor — the result
  is intact and visible).
- "Shell owns the commit" now has an exception a reader must know about. The
  CONTEXT.md entry and this ADR carry that knowledge so it is not rediscovered
  by surprise.

## Alternatives considered

- **Keep one transaction (status + side-effects commit together).** Rejected:
  it preserves notification atomicity but carries the latent bug forward — a
  side-effect exception still rolls back and fails a successful run.
- **`finalize_run` flushes and returns a delivery plan; the shell commits then
  delivers.** Rejected: it preserves "shell owns the commit" but re-splits
  alert logic across the seam (decision in the module, delivery in the shell),
  reintroducing the very duplication candidate #2 exists to remove.
- **Co-locate in `backtest/finalize.py` next to the pipeline.** Rejected: the
  `backtest/` package is the *pure* pipeline's home; an I/O-bearing module
  there muddies that invariant. Finalization lives in `services/`.

## How to apply

- **Worker / service authors**: only completed runs finalize. If you need a
  side-effect on the failure path, that is shell/analytics territory, not
  `finalize_run`. Never make finalization atomic with the completion commit,
  and never let its exceptions propagate to the run's status.
- **Reviewers**: a PR that moves `finalize_run` before the completion commit,
  lets its exceptions fail the run, or defers its commit to the caller is a
  boundary change — require it to update this ADR.

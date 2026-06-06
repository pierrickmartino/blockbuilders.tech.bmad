# Blockbuilders — Roadmap

**Status:** Living roadmap (vision of next developments)
**Date:** 2026-06-06
**Altitude:** This is the *time-phased narrative* — where we are going, in what
order, and what proves each stage is done. It is **not** the task list
(see [`ACTIONS.md`](./ACTIONS.md), items referenced below by `#`) and **not**
the reasoning (see [`BRAINSTORM.md`](./BRAINSTORM.md)). For canonical terms,
see [`../CONTEXT.md`](../CONTEXT.md) § Strategy & roadmap concepts.

---

## The bet

> Blockbuilders is **the Iron Man suit of crypto strategy design**: a tool where
> a non-technical person types an idea they already believe, watches it become an
> auditable strategy graph, and gets an honest, plain-English verdict from a
> backtest engine they trust — with their hand always on the autonomy slider and
> their money never on the line.

The moat is **trust in the number**. The wedge is the **Idea check**. Distribution
is the **Verified-result artifact** and agent-legibility. Retention is *learning*.
The one thing we measure above all else is **Activation** — the share of signups
who reach a first completed backtest, the only moment the core promise is delivered.

---

## How to read this roadmap

- **Gate-based, not calendar-based.** Horizons advance when their **exit criteria**
  are met, not when a quarter ends. Crypto-cycle engagement is exogenous and
  reliability is earned one nine at a time — committing to dates would be theatre.
- **Each horizon has** a goal, the `ACTIONS.md` items it contains, and an explicit
  **gate** that must be cleared before the next horizon opens.
- **Numeric thresholds are deliberately deferred** until the Activation baseline is
  trusted (Horizon 1). Inventing percentages now would be fiction. Gates are written
  as falsifiable *conditions*; the exact numbers get set against the real baseline.

---

## North-star metric

**Activation = % of signups who reach a first completed backtest.**

Everything downstream is unfalsifiable until this number is trustworthy — which is
precisely why it is the gate out of Horizon 1. Secondary signal that routes the
whole roadmap: the **iterators-vs-executors split** (do returning users iterate on
strategies, or ask to go live?).

---

## Horizon 1 — Foundation: see the truth, clear the deck

**Goal:** make Activation a trusted, instrumented number, and reclaim surface area
that doesn't defend the core sentence ("does this help someone find out if their
idea works?").

**In scope**
- `#1` Rebuild the Activation funnel event — one canonical, deduped definition.
- `#2` Time-to-first-backtest + drop-off cohorts, segmented by entry path.
- `#3` "What you just learned" retention A/B (validate the severity-as-retention thesis).
- `#18` Freeze/hide profiles, badges, digests — prune vanity social. Keep only the
  Verified-result artifact as a (later) distribution mechanism.

**Why first:** the NL A/B in Horizon 2 cannot be *read* without a trusted Activation
number. This horizon buys us the instrument before we run the experiment.

### Gate → Horizon 2
- Activation is instrumented, deduped, and **trusted**, with a documented definition
  that stops drifting, and a **baseline established**.
- Drop-off is visible by entry path (wizard / blank canvas / template clone).
- Vanity social is frozen; surface area is reclaimed for the wedge.

---

## Horizon 2 — Wedge proof: the Idea check

**Goal:** build the Idea check — natural language in, an auditable graph drafted on
the canvas, a trusted backtest out — kept on a leash (one draft, accept/edit/reject),
and **prove it beats the blank canvas** on Activation.

**In scope**
- `#4` NL input → drafted strategy graph (smallest verifiable increment: one
  strategy, existing block types, drawn on the existing canvas).
- `#5` Accept / edit / reject diff UI — nothing auto-applies; the human stays on the
  autonomy slider.
- `#6` Wire NL output into the wizard auto-backtest path — NL → graph → completed
  backtest in one continuous motion, ending on the result/narrative.
- `#8` Map NL output to existing validation rules — repair-or-explain, never surface
  a broken graph.
- `#9` Cost-bound the inference — single-shot drafts; the verify step bounds spend.
- `#7` A/B harness: Idea check vs. blank canvas — the experiment this horizon exists to run.

**The leash is the eval harness.** One drafted strategy, one clean accept/reject
signal — simultaneously the safest UX, the cheapest to evaluate, and the cheapest to run.

### Gate → Horizon 3
- The Idea check shows a **positive, statistically real Activation lift** over the
  blank-canvas control in the `#7` A/B (threshold set against the Horizon 1 baseline).
- Drafts are reliably backtestable (validation catches malformed graphs before they
  reach the user).
- Per-draft inference cost is bounded and predictable.

> If this gate is **not** cleared, we do not advance — we iterate on the wedge or
> revisit the bet. Horizon 3 is explicitly conditional on wedge proof.

---

## Horizon 3 — Expand: deepen the moat, seed distribution, hand off signals

**Entered only once the wedge proves out.** These are themed workstreams, not a strict
sequence; each independently deepens the validated core. Hold all of them until the
Horizon 2 gate clears — right moves, wrong time if pulled forward.

### 3a — Verification / trust moat *(the real defensibility)*
- `#10` Public "How the backtest works" trust page — make conservative engineering legible.
- `#11` Golden-backtest regression suite in CI — the number never silently drifts.
- `#12` Sharpen the narrative into *felt* severity — results in dollar and
  buy-and-hold-delta terms ("what this conviction would have cost you").

### 3b — Distribution *(organic only; incumbents own paid channels)*
- `#13` Verified-result artifact — public, linkable, screenshot-ready honest result
  (the "Wordle result" pattern for trading beliefs).
- `#14` `llms.txt` + clean docs for agent-legibility — be the verification backend
  other AIs delegate to.
- `#15` Literacy track from glossary + templates — ramp humans to competence; retention
  between pain spikes (the Eureka bet).

### 3c — Signals-only handoff *(augmentation without custody; verification-gated)*
- `#16` Alert on a *backtested* strategy — "ping me when this triggers," inheriting the
  engine's trust. One notch up the autonomy slider.
- `#17` Export to execution platforms — TradingView webhook / 3Commas config / CSV.
  The hand-off, never the trade. Makes execution platforms complementary, not competitive.

### 3d — Retention loop
- `#19` Polish the tweak-and-re-test loop — plain-English "why your idea underperformed"
  coaching; convert a failed test into a learning step.
- `#20` Pain-spike re-engagement — nudge lapsed users on significant market drops:
  "test your thesis before you react." Verification-gated framing, never a tip.

### Gate (standing, for all of 3c)
Every alert and every export is gated on a **completed backtest**. A signal inherits
the trust of the engine or it does not ship. The moment a signal feels like a tip
rather than a verified trigger, the moat erodes.

---

## Non-Goals / Guardrails

These are standing commitments, not items awaiting prioritization. They define the
product as much as the horizons do. See ADR-0006 for the execution-free decision.

- **Zero custody, forever.** Blockbuilders never holds user money and never executes
  trades. The signals-only handoff (3c) is the *only* notch up the autonomy slider,
  and it stays verification-gated.
- **No autonomous trading or "the AI finds you winners."** We sell a *verified answer*
  and a *learning tool*, not a money machine. We bet on the engine being trustworthy
  and the human staying in the loop — never on the AI being right.
- **No vanity social.** Public profiles, badges, and digests are frozen (`#18`). The
  Verified-result artifact distributes the honest result, not a follower count.
- **We do not out-feature the execution platforms.** The following — carried over from
  the old "Priority 1" roadmap — are **deliberately deprioritized** as anti-differentiation
  (they march us straight into 3Commas / Composer / Jesse territory, competing on
  capability where incumbents are years ahead):
  - Multi-asset / portfolio backtesting
  - Short-selling and margin
  - Complex / advanced order types
  - Tick-level or live paper trading
  
  Adding power is cheap; adding *reliable, comprehensible* power is the defensible work.

- **The one residual risk:** letting signals degrade into un-verified tips. **Guard the
  gate, not the gravity.** The custody line is bright and permanent; the discipline that
  needs active defense is verification-gating every signal.

---

## What would make us change course

In the spirit of "treat demand as an eval, not a story," the roadmap reverses if:

- **Horizon 1** shows the "what you just learned" narrative produces *no* retention lift
  → the severity-as-retention thesis is wrong; rethink the learning bet.
- **Horizon 2** shows the Idea check produces *no* Activation lift over blank canvas
  → the wedge is wrong; the value may be in authoring after all, not adjudication.
- The **iterators-vs-executors split** shows renewal concentrating only among users
  asking to go live → confidence is a *funnel* business, not a *subscription* one, and
  the execution-free stance carries a revenue cost we must consciously re-decide.

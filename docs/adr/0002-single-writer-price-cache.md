# ADR-0002 — Single-writer price cache with stale-while-revalidate

- **Status**: Accepted
- **Date**: 2026-05-30
- **Related**: [CONTEXT.md](../../../CONTEXT.md) — Price Provider, CryptoCompare

## Context

Spot price data comes from CryptoCompare (commercially "CoinDesk
Data"). The free plan enforces a **monthly call cap** that we were
hitting regularly.

The cost was unbounded and coupled to traffic. Three call sites hit
the vendor independently:

1. **Ticker endpoint** — the frontend `useMarketTickers` hook polled
   every 4s while the backend cache TTL was only 3s, so nearly every
   poll missed the cache and triggered a fresh `/pricemultifull` call.
   Cost scaled with viewing hours × open tabs (one user with the
   Market page open could generate 100k+ calls/month).
2. **Alerts job** — `evaluate_price_alerts` made its own separate
   `/pricemultifull` call every 5 minutes whenever ≥1 alert was
   active (~8,640 calls/month, flat).
3. **Candles** — DB-cached forever; bursty but amortizes to ~0. Not a
   driver of the monthly cap. Out of scope for this decision.

The goal was to make the monthly spot-price cost **predictable and
bounded** — a number we set, not a function of traffic.

## Decision

**Exactly one function is allowed to call the spot-price provider: a
gated background refresh job. Everything else reads from a cache.**

- **Refresh job** (worker, RQ interval **120s**). Gated: it only
  fetches when *active price alerts exist* OR *the ticker endpoint was
  viewed within the last 240s*. It writes all spot prices to a
  **persistent** Redis key (no TTL) with an `asOf` timestamp.
- **Ticker endpoint** is **read-only**. It never calls the provider.
  It returns the last-known prices immediately (stale-while-revalidate)
  and, when the data is stale, enqueues a one-off refresh deduped by a
  simple `SET market:tickers:refresh_pending 1 NX EX <few s>` flag.
  It also records the "viewed" timestamp that feeds the job's gate.
- **Alerts job** reads prices from the same shared cache and no longer
  calls the provider. Cadence tightened to **120s** to match refresh
  freshness; crossing detection and `last_checked_price` bookkeeping
  are unchanged.
- **Candles** are untouched by this decision.

## Consequences

**Positive:**
- Monthly spot-price cost becomes fixed and predictable:
  ~21,600 calls/month worst case (active 24/7 at 120s), **0 when
  idle**, independent of user or tab count.
- Two of the three call sites collapse to zero direct provider calls.
- A single chokepoint is the clean insertion point for provider
  failover (see Slice 2 / future ADR): wrap one call site, not three.

**Negative:**
- Ticker freshness is now interval-bound (~120s) instead of ~4s. The
  endpoint can serve briefly stale data with a visible `asOf` stamp.
  Acceptable for a strategy lab; would not suit a live trading desk.
- One more moving part: a gated scheduled job plus a dedupe flag.

**Neutral:**
- The frontend poll interval is realigned to the cache cadence; the
  4s-vs-3s thrash is gone.

## Alternatives considered

- **Tune the existing cache TTL only** (raise backend TTL to match the
  poll interval). Rejected: it lowers the coefficient but leaves cost
  *proportional to traffic* — a power user with tabs open for hours can
  still approach the cap. We wanted a budget we control outright.
- **Synchronous fetch in the request path on stale** (cold-start fetch
  inside the endpoint). Rejected: reintroduces a second provider caller
  and risks a thundering herd on a cold cache. Stale-while-revalidate
  with a deduped enqueue gives ~1s catch-up without either problem.

## How to apply

- **All new spot-price reads** go through the shared cache. Do not add
  inline `/pricemultifull` calls anywhere. If you need prices in a new
  job, read the cache; if you need them fresher, adjust the refresh
  cadence — do not add a caller.
- **Reviewers**: treat any new direct call to the spot-price provider
  outside the refresh job as a regression of this ADR.
- This decision covers **spot prices only**. Candle fetching and
  multi-provider failover are addressed separately (Slice 2).

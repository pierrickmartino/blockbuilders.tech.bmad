# ADR-0003 — Multi-provider price failover with per-surface primaries

- **Status**: Accepted
- **Date**: 2026-05-31
- **Related**: [CONTEXT.md](../../../CONTEXT.md) — Price Provider, CryptoCompare;
  [ADR-0002](./ADR-0002-single-writer-price-cache.md) — Single-writer price cache

## Context

CryptoCompare ("CoinDesk Data") free plan enforces an account-wide
monthly call cap that we hit regularly. [ADR-0002](./ADR-0002-single-writer-price-cache.md)
made spot-price cost fixed and predictable by funnelling every spot
call through one gated refresh job. This ADR adds the second half:
a backup provider so price data still flows when CryptoCompare is
capped or down — the cap blocks **all** CryptoCompare endpoints at
once, so both spot prices *and* candle backfill fail together.

Binance is already integrated in the codebase (sentiment endpoints on
`fapi.binance.com`). For market data it is free, keyless, high-limit,
USDT-native (matching our `*/USDT` pairs), and returns `1h`/`4h`/`1d`
klines directly (no `_aggregate_to_4h()` hack). Backend is hosted
outside the US, so Binance's `451` geo-block does not apply
(verify with `curl https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT`
from the host before building).

## Decision

**Introduce a `Price Provider` seam (`app/market_data/`) with two
implementations and a router that uses different primary providers per
data surface.**

- **Seam.** `provider.py` defines the `PriceProvider` Protocol
  (`get_spot_prices(assets) -> dict[str, Decimal]`,
  `get_candles(asset, timeframe, start, end) -> list[Candle]`, `name`).
  `cryptocompare.py` and `binance.py` implement it (lifting today's
  inline URL-building out of `api/market.py` and `backtest/candles.py`).
  `router.py` (`PriceRouter`) is the only thing callers touch.
- **Per-surface primaries.**
  - **Spot → Binance primary, CryptoCompare backup.** Spot prices are
    momentary; cross-vendor differences are negligible. Pointing the
    ADR-0002 refresh job at Binance first shrinks CryptoCompare spot
    calls to near zero.
  - **Candles → CryptoCompare primary, Binance backup.** The `candles`
    table is historically CryptoCompare and it aggregates many
    exchanges (broader coverage). Binance only fills in when
    CryptoCompare is capped/down.
- **Symbol mapping.** Derive `BASEUSDT`, validate against Binance
  `/api/v3/exchangeInfo` (fetched once, cached in Redis daily). Assets
  not in that set are "Binance-unsupported" and route to CryptoCompare
  for spot. Self-maintaining; no hand-curated list.
- **Failover.** Reactive, with a per-provider Redis circuit breaker
  (`provider:{name}:unhealthy`, TTL = cooldown). **Differentiated
  cooldowns**: a quota/cap response trips a *long* cooldown (until
  ~UTC reset) so we stop probing a provider that's dead for the day;
  a transient error (429 burst, timeout, 5xx) trips a *short* one
  (5–10 min). The router skips unhealthy providers.
- **Candle consistency.** Add a `source` column to `candles`; persist
  Binance candles tagged. Backtests prefer CryptoCompare where present
  and fill gaps with Binance. Any run that touched backup candles sets
  `used_backup_data=true` on the `BacktestRun` for transparency. A
  reconciliation job (re-fetch those timestamps from CryptoCompare once
  the cap resets) is deferred until it proves necessary.
- **Migrations.** Alembic revisions for `candles.source` and
  `BacktestRun.used_backup_data`.

## Consequences

**Positive:**
- App keeps serving prices when CryptoCompare is capped/down — both
  tickers/alerts (Binance-primary) and backtests (Binance-backup).
- Combined with ADR-0002, CryptoCompare's monthly budget is freed
  almost entirely for candles.
- Candle backups are cached and runs are repeatable; the splice is
  labelled, not hidden.
- Native Binance 4h klines remove the 4h aggregation hack for
  backup-sourced candles.

**Negative:**
- Spot and candles use *opposite* primary providers — surprising
  without this ADR.
- The shared `candles` table is no longer single-source; a backtest
  spanning a cap window can splice CryptoCompare history to Binance
  recent candles, with a small discontinuity at the boundary. Made
  honest via the `source` tag and `used_backup_data` flag.
- Alert crossing detection is now Binance-priced (internally
  consistent — every sample from the same source — but a different
  basis than before).

**Neutral:**
- A few Binance-unlisted assets still hit CryptoCompare for spot, so
  CryptoCompare spot calls shrink but don't reach zero.

## Alternatives considered

- **Single primary for both surfaces** (keep CryptoCompare primary
  everywhere, Binance pure fallback). Rejected for spot: it leaves the
  biggest cap-relief lever — routing the steady spot stream to a free
  provider — unused.
- **Option B candle policy: tag but never persist backup candles**
  (Binance fills backtests in-memory only, canonical table stays pure
  CryptoCompare). Rejected: outage backtests wouldn't cache and the
  same backtest would silently yield different numbers depending on
  whether it ran during the cap window. Option A's labelled persistence
  was preferred — continuity and transparency over single-source
  purity, consistent with ADR-0001 (this is a strategy lab, not an
  audit system). Revisit if reproducibility becomes a hard requirement.
- **Static curated Binance symbol map.** Rejected in favour of
  `exchangeInfo` discovery to avoid a hand-maintained list that drifts.
- **Single fixed circuit-breaker cooldown.** Rejected: against a
  month-long quota cap it would re-probe a known-dead provider every
  few minutes. Differentiated cooldowns match the actual failure mode.

## How to apply

- **All price reads** (spot and candles) go through `PriceRouter`.
  Do not call CryptoCompare or Binance inline anywhere else; that is a
  regression of this ADR and of ADR-0002.
- **Pre-flight before building**: confirm Binance reachability (no
  `451`) from the backend host.
- **Reviewers**: any backtest that consumed backup candles must surface
  `used_backup_data`; do not strip the `source` tag for convenience.
- **Adding a third provider** later: implement `PriceProvider`, slot it
  into the router's per-surface ordering — no call-site changes.

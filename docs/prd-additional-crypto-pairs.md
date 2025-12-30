# PRD: Additional Crypto Pairs (Top 20–30 Assets)

**Status:** Done
**Owner:** Product
**Last Updated:** 2025-12-28

---

## 1. Summary

Expand supported trading pairs beyond BTC/USDT and ETH/USDT to a curated list of top 20–30 crypto assets. Add pairs based on user requests and data vendor availability/cost. This directly increases value for users trading altcoins while keeping the product simple (single asset + single timeframe per strategy).

---

## 2. Goals

- Support a curated list of top 20–30 crypto pairs (e.g., ADA, SOL, MATIC, LINK).
- Allow incremental rollout as data ingestion capacity allows.
- Keep UI changes minimal and intuitive (pair picker only).
- Maintain existing single-asset, single-timeframe strategy model.

---

## 3. Non-Goals

- No multi-asset or portfolio strategies.
- No new timeframes.
- No vendor switching or multi-vendor fallback.
- No changes to backtest engine logic beyond supporting more assets.

---

## 4. User Value

- Traders can backtest on popular altcoins, not just BTC/ETH.
- Lower friction for users requesting their preferred assets.

---

## 5. Scope

### 5.1. Supported Pairs (Initial Curated List)

Start with a list of top 20–30 assets (final list based on vendor support and cost), for example:
- ADA/USDT, SOL/USDT, MATIC/USDT, LINK/USDT, DOT/USDT, XRP/USDT, DOGE/USDT
- AVAX/USDT, LTC/USDT, BCH/USDT, ATOM/USDT, NEAR/USDT, FIL/USDT
- APT/USDT, OP/USDT, ARB/USDT, INJ/USDT, UNI/USDT, AAVE/USDT
- SUI/USDT, SEI/USDT, TIA/USDT

### 5.2. In-Scope Changes

- Data ingestion supports additional assets (same OHLCV schema).
- Asset selection UI list updated to include the new pairs.
- API validation updated to accept the expanded list.
- Documentation updated to reflect the expanded list.

---

## 6. Functional Requirements

### 6.1. Data Ingestion

- For each supported pair, fetch OHLCV data from the existing vendor.
- Store candles in the current `candles` table (no schema changes).
- Maintain the existing gap detection and error handling.

### 6.2. Strategy Creation & Validation

- Asset validation must accept the expanded list only.
- Strategies remain single-asset, single-timeframe.

### 6.3. UI Changes

- Strategy asset picker lists the expanded asset set.
- Keep the picker simple (no search or grouping unless needed).

---

## 7. Rollout Plan

1. **Phase 1:** Add 8–12 most requested pairs (vendor-supported and cost-safe).
2. **Phase 2:** Expand to full top 20–30 list as capacity allows.
3. **Ongoing:** Add pairs on request if vendor data is available and cost is acceptable.

---

## 8. Acceptance Criteria

- Users can create strategies using any asset in the curated list.
- Backtests run successfully for the new pairs with existing data pipeline.
- UI picker shows the new pairs without additional configuration.
- Documentation reflects the new supported assets.

---

## 9. Dependencies

- CryptoCompare (or current vendor) must support the pair.
- API key quota and cost must allow additional symbols.

---

## 10. Risks & Mitigations

- **Data availability gaps:** keep existing gap detection and clear error messages.
- **Vendor cost/limits:** stagger rollout and monitor usage.

---

## 11. Open Questions

- Which 8–12 pairs are the highest priority for Phase 1?
- Do we need a basic search in the asset picker if the list grows?

---

## 12. Tracking Metrics (Optional)

- % of strategies created with non-BTC/ETH assets.
- Backtest success rate for newly added pairs.
- Top requested assets not yet supported.

# TST: Low Trade Count Warning

## Test Checklist

- [ ] Verify results page shows yellow warning banner when `num_trades = 1`.
- [ ] Verify results page shows yellow warning banner when `num_trades = 9`.
- [ ] Verify warning is not shown when `num_trades = 0`.
- [ ] Verify warning is not shown when `num_trades = 10`.
- [ ] Verify warning is not shown when `num_trades > 10`.
- [ ] Verify banner appears below narrative card when narrative is present.
- [ ] Verify banner appears at top of metrics section when narrative is absent.
- [ ] Verify banner text exactly matches: "Your strategy triggered [N] trades over this period. With so few trades, results can vary a lot — try a longer date range or looser entry conditions to get more data points."
- [ ] Verify `[N]` in banner text equals `num_trades` from payload.
- [ ] Verify PostHog event `health_warning_shown` fires when banner is shown.
- [ ] Verify PostHog event includes property `warning_type=low_trade_count`.
- [ ] Verify event is not fired when banner is not shown (`num_trades` 0 or >=10).
- [ ] Verify warning logic runs entirely on frontend and does not add waiting state before results render.
- [ ] Verify backtest completion status and response timing are unchanged (NFR-08 spot check).
- [ ] Verify warning banner meets WCAG 2.1 AA contrast for text/background (NFR-09).
- [ ] Verify warning banner is readable on mobile, tablet, and desktop breakpoints.
- [ ] Regression check: existing narrative card rendering behavior remains unchanged.
- [ ] Regression check: existing zero-trade `Modify Strategy` CTA behavior remains unchanged.

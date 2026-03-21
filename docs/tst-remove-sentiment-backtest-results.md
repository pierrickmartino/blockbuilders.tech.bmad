# Test Checklist: Remove Sentiment Analysis from Backtest Results

## 1. Main Results Page
- [ ] Open a completed backtest result page and confirm no sentiment analysis section is shown.
- [ ] Confirm no sentiment badges, helper text, start/end sentiment values, average sentiment values, or sentiment charts are shown.
- [ ] Confirm page layout still looks correct with no extra gaps or empty headings where sentiment used to be.

## 2. Shared / Read-Only Results
- [ ] Open a shared backtest result link and confirm no sentiment analysis section is shown.
- [ ] Confirm shared results layout still looks correct with no empty sentiment placeholders.

## 3. Regression Checks
- [ ] Confirm core metrics still render correctly.
- [ ] Confirm narrative card behavior still works as documented.
- [ ] Confirm low-trade warning behavior still works as documented.
- [ ] Confirm equity curve, charts, and trades sections still render correctly.
- [ ] Confirm export/share actions still work if available on the page.

## 4. API / Data Behavior
- [ ] Confirm `GET /backtests/{id}` still succeeds when no sentiment data is used.
- [ ] Confirm `GET /share/backtests/{token}` still succeeds when no sentiment data is used.
- [ ] If `GET /backtests/{run_id}/sentiment` is removed, confirm no frontend request still depends on it.
- [ ] If `GET /backtests/{run_id}/sentiment` is kept, confirm the backtest results UI no longer calls or depends on it.

## 5. Scope Protection
- [ ] Confirm Market Overview sentiment indicators still work unchanged.
- [ ] Confirm no new replacement card, message, or extra complexity was added to backtest results.

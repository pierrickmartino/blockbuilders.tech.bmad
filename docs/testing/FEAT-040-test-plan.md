# TST: First-Run Guided Metric Explanations

- [ ] Verify first-run eligibility path: user with newly completed onboarding sees first-run mode on first backtest results load.
- [ ] Verify inline explanations render under each required metric: Total Return %, Max Drawdown %, Win Rate, Number of Trades, vs. Buy-and-Hold %.
- [ ] Verify each explanation is plain-language and limited to 1-2 sentences.
- [ ] Verify inline explanation text uses smaller muted styling and appears directly beneath the metric.
- [ ] Verify first-run mode does not render for users who already completed first-run explanation flow.
- [ ] Verify subsequent visits show `?` helper icons next to the same five metric labels.
- [ ] Verify desktop hover on `?` reveals corresponding explanation text.
- [ ] Verify mobile click/tap on `?` reveals corresponding explanation text.
- [ ] Verify explanation text behind `?` matches first-run inline copy for each metric.
- [ ] Verify one-time state persistence in localStorage (or user record if implemented).
- [ ] Verify clearing localStorage (or resetting user seen flag) re-enables first-run mode for QA.
- [ ] Verify `first_run_overlay_completed` fires once when user scrolls past results during first-run mode.
- [ ] Verify `first_run_overlay_completed` fires once when user interacts with results (without scroll) during first-run mode.
- [ ] Verify no duplicate `first_run_overlay_completed` events from repeated scroll/interactions in the same session.
- [ ] Verify analytics consent gating: event is not sent if tracking consent is denied.
- [ ] Verify failure in analytics dispatch does not break results page rendering.
- [ ] Verify no regressions in existing backtest summary metric rendering, favorite metrics, and layout responsiveness.

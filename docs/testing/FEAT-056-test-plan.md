# TST: Narrative Display on Results Page (Frontend)

## Test Checklist

- [ ] Results page with narrative: narrative card renders as the first content block before metrics and charts.
- [ ] Narrative styling: card container is visually distinct and narrative text is larger than standard metric-row text.
- [ ] Analytics visibility tracking: `narrative_viewed` fires once when narrative enters viewport.
- [ ] Analytics safety: if narrative is missing, `narrative_viewed` does not fire and page still renders correctly.
- [ ] Zero-trade run: narrative card includes visible `Modify Strategy` CTA button.
- [ ] Zero-trade run: performance metrics grid is not rendered.
- [ ] Zero-trade run: charts (equity/drawdown/benchmark where applicable) are not rendered.
- [ ] Zero-trade CTA navigation: clicking `Modify Strategy` routes to the existing strategy editing flow for that strategy.
- [ ] Regression: non-zero-trade run still renders existing metrics/charts below narrative without layout breakage.
- [ ] Regression: existing `results_viewed` event behavior remains unchanged.

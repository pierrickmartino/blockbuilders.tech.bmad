# Market Page Critique

Audited page: Market Overview (`/market`)
Timestamp: 20260506-153601

## Design Health

| # | Heuristic | Score | Key Issue |
|---|---:|---:|---|
| 1 | Visibility of System Status | 2 | Refresh cadence and chart loading state are not obvious beyond "Last updated." |
| 2 | Match System / Real World | 3 | Table language mostly fits traders, but volatility labels are compressed jargon. |
| 3 | User Control and Freedom | 2 | Chart open action is hidden behind pair text; indicator selection can become crowded. |
| 4 | Consistency and Standards | 2 | Table, sentiment cards, mobile cards, and chart sheet feel like separate feature layers. |
| 5 | Error Prevention | 2 | Indicator count/period constraints are not explained before invalid choices. |
| 6 | Recognition Rather Than Recall | 2 | Users must infer that clicking a pair opens inspection. |
| 7 | Flexibility and Efficiency | 2 | Sorting/search are good; no fast path from market context into strategy/backtest work. |
| 8 | Aesthetic and Minimalist Design | 2 | Too many equal-weight modules compete for attention. |
| 9 | Error Recovery | 3 | Retry states are present and reasonably plain. |
| 10 | Help and Documentation | 2 | Tooltips exist, but the page does not explain what to do with the information. |
| **Total** |  | **22/40** | **Usable, but visually and cognitively under-shaped** |

## Anti-Patterns Verdict

This does not scream generic AI page. It is restrained, table-first, and mostly aligned with Blockbuilders' "instrument, not terminal" direction. The problem is subtler: it feels assembled from competent components rather than composed as one market-inspection workflow.

The biggest slop tell is the repeated card-with-mini-chart pattern in `frontend/src/components/MarketSentimentPanel.tsx`, `frontend/src/components/SentimentGauge.tsx`, and `frontend/src/components/SentimentSparkline.tsx`. It is not garish, but it is generic. Also, the emoji sentiment narrative weakens the professional "well-designed instrument" tone.

Deterministic scan: blocked. `npx`/`npm` are not available in this environment, so I could not run `npx impeccable --json`. I also did not create browser overlays because the local frontend dependencies/server are unavailable from the current PATH.

## Overall Impression

The page has solid bones: table, search, sort, timestamp, mobile cards, retry states, chart inspection. But it lacks a clear primary story. Is this page for quick market scanning, sentiment interpretation, or technical indicator verification? Right now all three have similar visual weight, so the trader has to decide what the screen is for.

## What's Working

The desktop table is the strongest surface. Numeric values use `data-text`, sorting is direct, and the layout respects the product's calm/data-first intent in `frontend/src/app/(app)/market/page.tsx`.

The error states are plain and recoverable: both market data and chart data offer retry without drama.

The chart sheet is a good interaction model for inspection. Keeping the market list underneath matches the FEAT-100 intent and avoids navigation churn.

## Priority Issues

### [P1] The chart inspection affordance is too invisible

Why it matters: clicking the pair label opens an 80vw inspection panel, but the row gives no visible "inspect chart" cue. Users will miss one of the page's most valuable features.

Fix: add a rightmost icon button or "Inspect" action column on desktop, and a clear chart icon button on mobile cards. Keep pair text clickable if desired, but do not make it the only affordance.

Suggested command: `impeccable clarify` or `impeccable layout`

### [P1] The page lacks a dominant hierarchy

Why it matters: sentiment, market table, and chart inspection are all important, but the screen does not rank them. The user's eye lands on "Market Sentiment" before the asset list, even though the list is the main entry point.

Fix: make the table/list the primary object. Compress sentiment into a slimmer contextual band or secondary panel, and give the table a stronger header/action area.

Suggested command: `impeccable layout`

### [P2] Cognitive load spikes in the chart indicator selector

Why it matters: the selector renders every available indicator as inline chips with number inputs. Once the catalog grows, this becomes a wall of controls.

Fix: use a compact menu/combobox for adding indicators, then show selected indicators as editable chips below. Also expose the 8-indicator limit before the backend rejects it.

Suggested command: `impeccable distill`

### [P2] Sentiment uses the wrong visual language

Why it matters: emoji and nested cards make the page feel more consumer dashboard than analytical lens. The brand explicitly avoids crypto hype and toy-like cues.

Fix: remove emoji, flatten the nested cards, and turn sentiment into a single structured readout: score, direction, confidence, source freshness.

Suggested command: `impeccable quieter`

### [P3] Labels are compact at the cost of comprehension

Why it matters: "Vol (Std)," "Vol (ATR%)," and "Vol %ile" are efficient for experts, but the target user understands markets, not necessarily quant abbreviations. Tooltips help, but headers should carry more meaning.

Fix: use clearer headers like "Return Vol," "ATR Range," and "1Y Vol Rank," with tooltips retained.

Suggested command: `impeccable clarify`

## Persona Red Flags

Alex, the power user: sorting/search are useful, but the chart panel forces scanning many inline indicator options. Alex will want fast add/remove, remembered selections, and less control sprawl.

Jordan, the first-timer: Jordan will not know that pair names open charts, and "Vol (Std)" plus "Vol (ATR%)" creates avoidable hesitation. The page gives data, but not enough cues about what action follows.

The cautious strategy builder: sentiment says "Risk-on" or "Risk-off," but the page does not connect that to strategy work. This user needs context like "use this to sanity-check market regime before backtesting," without turning it into financial advice.

## Best Next Move

Run `impeccable layout market page` first. The highest-leverage change is reshaping the hierarchy so the asset list is clearly primary, sentiment is contextual, and chart inspection becomes discoverable. Then run `impeccable distill market chart panel` for the indicator selector.

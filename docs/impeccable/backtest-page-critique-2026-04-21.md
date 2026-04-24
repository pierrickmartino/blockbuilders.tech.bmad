# Strategy Backtest Page — Impeccable Critique

**Date:** 2026-04-21
**Target:** `/frontend/src/app/(app)/strategies/[id]/backtest/page.tsx` + `components/backtest/*` + supporting cards
**Method:** Impeccable `critique` — parallel LLM design review (Assessment A) and deterministic detector (Assessment B)

---

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|------:|-----------|
| 1 | Visibility of System Status | 3 | Polling + StatusBadge ping are solid; "Loading strategy…" has no skeleton |
| 2 | Match System / Real World | 2 | "B&H", "Skew +0.42", "fills" vs "trades" — domain density without verbal anchors |
| 3 | User Control and Freedom | 3 | Cancel-run is hover-only; no undo on destructive paths |
| 4 | Consistency and Standards | 2 | 5 different section-header sizes; card chrome drifts between `bg-card` and `bg-muted/30` |
| 5 | Error Prevention | 3 | Compare cap, PRO gating, date clamp good; no friction on `forceRefreshPrices` |
| 6 | Recognition Rather Than Recall | 2 | Seasonality legend placed *after* the grid; asymmetric distribution bucket labels; unlabelled Skew direction |
| 7 | Flexibility and Efficiency | 3 | ⌘+Enter, CSV/JSON export, sticky rail; but hover-only compare checkbox costs expert speed |
| 8 | Aesthetic and Minimalist Design | 2 | Rounded-icon-above-heading ×4; double-encoded distribution bars; competing selection treatments |
| 9 | Error Recovery | 3 | Inline Retry on failed runs + retry on chart loads; gaps in `aria-live` |
| 10 | Help and Documentation | 3 | Good tooltip registry; distributions / seasonality / TCA bar lack help affordances |
| **Total** | | **26 / 40** | **Mid-tier — competent but distinctly improvable** |

---

## Anti-Patterns Verdict

**LLM assessment:** *Mostly clean, with localized slop.* The work shows real intent — restrained palette, tabular mono, semantic-only color, a genuinely disciplined colorblind stripe overlay on seasonality (`page.tsx:194`). It reads as hand-engineered, not v0 output. But three AI-slop tells surface:

- **Rounded-icon-above-heading ×4** — the canonical template appears in `NarrativeCard.tsx:60-63` (`BookOpen`), `WhatYouLearnedCard.tsx:60-62` (`GraduationCap`), `DataAvailabilitySection.tsx:155-157` (`Database`), and `BacktestRunsBand.tsx:311` (`BarChart3`). All use `h-9 w-9 rounded bg-primary/10`. Four instances of one template is a signature. Named explicitly in `.impeccable.md:71` anti-references.
- **Gradient-text utility** — `.text-gradient-primary` exists in `globals.css:129-135`. Not used on this page, but its presence in the Signal theme contradicts core principle 1.
- **Ambient body radial gradients** — `globals.css:95-103` applies two faint mood-setting gradients to `body`. A trading workstation doesn't need ambient color fog.

**Deterministic scan:** `npx impeccable` across all 17 files in scope returned **0 findings, exit code 0**. The 25-pattern detector is clean here. (Sanity-checked — broader scans on other files correctly trip the detector.) The rule-based layer agrees the Signal theme is well-executed at the token level (no pure black/white, no side-stripe borders, no gradient text in use). The LLM-caught issues are *compositional* — patterns the detector doesn't model, like repeated icon tiles and heading-scale drift.

**Where they agree:** the theme foundation is strong.
**Where LLM caught what the detector missed:** icon-template repetition, heading-scale drift, double-encoded distribution bars, hover-only controls, competing result heroes.

---

## Overall Impression

A *competent lab bench* that wants to be an *engineered workstation*. The Band + KPIStrip arrival is genuinely Signal — mono numbers, semantic color, calm authority. But after two scrolls, seven near-identical `rounded border bg-card` blocks flatten the hierarchy, three heading sizes fight each other, and a `GraduationCap` icon undermines the whole credibility play. **The single biggest opportunity: enforce three clear section tiers — hero / reference / appendix — and cut the AI-slop icon tiles.** That one move would lift the score 4–5 points.

---

## What's Working

- **KPIStrip primary triad** (`KPIStrip.tsx:114-146`) — Total Return / Sharpe / Max DD with secondary row separated by `border-t`. Tabular mono, semantic color only where it changes meaning. Textbook Signal, and the peak moment of the page.
- **Colorblind-safe seasonality** (`page.tsx:194-224`) — diagonal stripe overlay on negative cells so hue isn't the only encoding. Exactly the kind of disciplined thinking the brand claims.
- **StatusBadge ping animation** (`StatusBadge.tsx:47-54`) — one, well-scoped motion that carries system status and nothing more. Not decorative.

---

## Priority Issues

### [P0] Rounded-icon-above-heading template repeated 4×
- **Why it matters:** the most recognizable AI-slop tell on the page, named explicitly in `.impeccable.md:71`. Four instances turn a subtle mistake into a signature.
- **Fix:** delete the icon tiles. Lead with the heading and (if status is needed) a small left-aligned dot, matching the pattern already used in `PageHeader.tsx:123`. If an icon truly earns its place, inline at `h-3.5 w-3.5` next to the heading with no fill background.
- **Command:** `/quieter`

### [P1] Monotonous card rhythm breaks Signal principle 4
- **Why it matters:** seven consecutive results blocks use identical chrome (`rounded border border-border bg-card` + `border-b` header). The eye cannot distinguish hero (Equity) from reference (Drawdown, Distribution) from appendix (Trades, TCA). Density without rhythm = noise.
- **Fix:** three tiers. **Hero** (KPIStrip + Equity) keep card chrome with extra breathing room. **Reference** (Drawdown, Position, Seasonality, Distributions) drop the card — use `border-t` rules and generous vertical gaps. **Appendix** (Trades, TCA) stay collapsed as they already are. Extend the `bg-muted/30` pattern TCA/Trades already use downward, not upward.
- **Command:** `/layout`

### [P1] Heading scale drifts across 5 sizes
- **Why it matters:** `text-[13px]` (Band), `text-[15px]` (most sections), `text-[17px]` (Equity), `text-[11px] uppercase` (TCA/Trades), plus the h1. A reader cannot infer section priority from size.
- **Fix:** pin to 3 levels — page h1 (28px), section h2 (15px semibold), sub-label (11px mono uppercase, 0.18 tracking). Delete the `[13px]` and `[17px]` outliers.
- **Command:** `/typeset`

### [P2] Double-encoded distribution bars
- **Why it matters:** `DistributionRow.tsx:46-62` encodes count in *height* AND position-within-group in *HSL lightness*. Two channels, same information. Signal principle 1: decoration without information is cut.
- **Fix:** flat fill. `hsl(var(--destructive))` for negative buckets, `hsl(var(--success))` for positive. Let height carry count. X-axis carries sign.
- **Command:** `/quieter`

### [P2] Hover-only cancel-run + hover-only compare checkbox
- **Why it matters:** `BacktestRunsBand.tsx:206` (cancel) and `:227` (compare) are both `opacity-0 group-hover:opacity-100`. Cancel is a destructive action hidden behind a hover — you don't hide destructive actions, you label them. Touch and keyboard users lose both affordances entirely.
- **Fix:** checkbox always visible at 40% opacity, full when checked/hovered. Cancel surfaces as an inline `X` in the StatusBadge row while status is pending/running, the same treatment completed runs already get for export.
- **Command:** `/clarify`

### [P3] Two competing result heroes
- **Why it matters:** KPIStrip's 34px success-green Total Return and the WhatYouLearnedCard directly below (also green, also beat/lag framing, dashed primary border, "Insight" badge) fight for the same scroll moment. Peak-end rule: two peaks, neither wins.
- **Fix:** shrink WhatYouLearnedCard to a single-line banner or move it above KPIStrip as a dismissing ribbon. Don't let teaching scaffolding out-present the actual result.
- **Command:** `/distill`

---

## Persona Red Flags

### Alex (Power User, day-to-day iterator)
- Compare checkbox hidden behind hover → needs mouse hover to build comparison sets; keyboard `Tab` surfaces it only on `:focus-within`. Building a 4-run comparison takes ~8 mouse moves.
- Cancel-run is hover-only → mistaken runs can't be killed from keyboard or touch.
- Seasonality + distributions always expanded → 3,000px of vertical scroll on every page view to reach TCA, which is the detail power users actually check.
- ⌘+Enter on Run is good, but there's no keyboard path to switch between runs in the rail.

### Jordan (First-Timer, self-directed but new to backtesting)
- `B&H`, `Skew +0.42`, `MAR`, `Sortino` appear in headline positions without verbal anchors or tooltip affordance on every occurrence.
- LowTradeCountWarning says "results can vary a lot" — friendly, but doesn't tell Jordan what to *do*. No action suggestion ("try a longer window" or "relax the entry condition").
- WhatYouLearnedCard *is* aimed at Jordan but is stylistically indistinguishable from a permanent insight, so Jordan can't tell when it stops being useful.

### Project-specific — "Serious self-directed trader" (from `.impeccable.md`)
- This persona explicitly is *not* a beginner. Every `GraduationCap`, `BookOpen`, and "What you learned" card signals "we built this for someone less serious than you."
- Ambient body gradients + rounded icon tiles say "no-code dashboard template"; this user wants "well-written instrument panel." The components are good, the framing undercuts them.

---

## Minor Observations

- `globals.css:95-103` body radial gradients → cut for workstation credibility.
- `globals.css:129-135` `.text-gradient-primary` → delete if unused, grep first.
- `WhatYouLearnedCard.tsx:76` — "You tested whether your strategy would have outperformed..." is over-narrated. The KPIStrip already says it.
- `LowTradeCountWarning.tsx:34` — "results can vary a lot" → "results are statistically unreliable below ~30 trades." Be the instrument.
- `RunConfig.tsx:114` — `PRO` at `text-[9px] opacity-70` is illegibly small. Use a `Badge` or drop it.
- `BacktestRunsBand.tsx:454` — "View all" dashed-border tile competes with data cards. A trailing `→ 23 runs` text button suffices.
- `DataAvailabilitySection.tsx:166` vs `PageHeader.tsx:127` — `•` vs `·` for metadata separators. Pick one.
- `PositionAnalysisCard.tsx:89-94` insight heuristic is a single if/else on a 1-day threshold. Canned on second view; either make it data-driven or remove.
- Seasonality cell colors use raw RGB (`page.tsx:214`) instead of tokens — breaks the "light + dark are equals" claim.
- KPIStrip `-mx-4 sm:-mx-8` full-bleed — verify it doesn't extend under the rail at `lg` breakpoints.

---

## Questions to Consider

1. If you deleted `NarrativeCard`, `WhatYouLearnedCard`, and `LowTradeCountWarning`, would a serious trader notice anything they miss — or are those cards scaffolding for a user who isn't your target?
2. Band + Rail show the same runs twice on desktop. Is that redundancy earning its pixel cost?
3. Seasonality takes ~400px answering "did this work in Q2 2023?" — a question most iteration sessions don't ask. Above the fold because it's useful, or because it looks impressive?
4. A Bloomberg terminal doesn't have a `GraduationCap` icon anywhere. Why do you?
5. What would a confident, single-screen version of the results view look like?

---

## Decisions (from clarifying questions, 2026-04-21)

- **Priority:** kill the AI-slop tells first.
- **Teaching cards:** keep `NarrativeCard`, `WhatYouLearnedCard`, `LowTradeCountWarning` as-is (copy refinements only — no structural removal).
- **Scope:** work through all 6 priority issues plus the minor observations.

---

## Recommended Actions

1. **`/quieter`** — Remove the four rounded-icon-above-heading tiles (`NarrativeCard.tsx:60`, `WhatYouLearnedCard.tsx:60`, `DataAvailabilitySection.tsx:155`, `BacktestRunsBand.tsx:311`). Cut body radial gradients in `globals.css:95-103` and delete `.text-gradient-primary` if unused. Also flatten the double-encoded HSL-lightness ramp in `DistributionRow.tsx:46-62` to a single semantic fill.
2. **`/layout`** — Establish three section tiers across the results view: hero (KPIStrip + Equity, card chrome), reference (Drawdown, Position, Seasonality, Distributions — no card, `border-t` rules, varied spacing), appendix (Trades, TCA — already collapsed). Move the seasonality legend above its grid.
3. **`/typeset`** — Pin section headings to 3 levels: page h1, section h2 (15px semibold), sub-label (11px mono uppercase, 0.18 tracking). Delete the `text-[13px]` and `text-[17px]` outliers.
4. **`/clarify`** — Surface hover-only controls in `BacktestRunsBand.tsx:206,227` (always-visible compare checkbox at reduced opacity; inline cancel `X` in the StatusBadge row). Tighten microcopy on `LowTradeCountWarning.tsx:34` to a statistical statement. Fix `RunConfig.tsx:114` PRO label legibility. Unify separators (`•` vs `·`). Keep teaching cards; refine their copy only.
5. **`/distill`** — Demote the size of WhatYouLearnedCard so it stops fighting KPIStrip's peak. Remove the canned if/else insight in `PositionAnalysisCard.tsx:89-94` (or make it data-driven). Cut the "View all" dashed-border tile in `BacktestRunsBand.tsx:454` in favor of a text button.
6. **`/audit`** — Verify dark-mode parity on seasonality cell colors (`page.tsx:214` uses raw RGB), add `aria-live` to status banners, confirm KPIStrip full-bleed doesn't extend under the rail at `lg`.
7. **`/polish`** — Final pass: alignment, spacing, consistency sweep after the above land.

# Blockbuilders — Action Backlog

**Status:** Derived backlog (companion to `BRAINSTORM.md`)
**Date:** 2026-06-05
**Source:** Strategy brainstorm + the four resolved decisions (signals-only / activation untrusted / build NL wedge now / prune profiles).
**How to read each item:** **Problem** = the pain or gap this addresses. **Proposed deepening** = the concrete build. **Wins** = what we get if it lands.

**Tags:** `P0/P1/P2` = priority · `S/M/L` = rough effort.
**Critical path:** `#1 → #2 → (#4,#5,#6) → #7`. Everything in Groups C–G assumes the wedge (Group B) is proving out.

---

## A. Activation & Instrumentation — *resolved decision #2: activation data is partial/untrusted, fix it first*

### 1. Rebuild the activation funnel event `[P0 · S]`
- **Problem:** Signup → first-completed-backtest is the only moment the core promise is delivered, yet the funnel is incomplete/untrusted. Every strategic bet downstream is unfalsifiable until this number is reliable.
- **Proposed deepening:** Define one canonical activation event in PostHog (`backtest_completed` attributed to a user's *first* run), deduped across retries and the wizard auto-backtest path. Backfill historically where possible; document the definition so it stops drifting.
- **Wins:** A single trustworthy north-star number; unblocks the NL A/B (#7) and the retention split (#3); stops decisions being made on vibes.

### 2. Time-to-first-backtest + drop-off cohorts `[P0 · S]`
- **Problem:** We know *whether* people activate, not *where* they stall or *which entry path* works. Wizard, blank canvas, and template clone likely have very different drop-off.
- **Proposed deepening:** Add a `time_to_first_backtest` measure and segment the funnel by entry path and by NL-vs-manual authoring. Surface the biggest drop-off step on a dashboard.
- **Wins:** Pinpoints the friction Alex hits; tells us which authoring path to invest in; gives the NL wedge a baseline to beat.

### 3. "What you just learned" retention A/B `[P0 · S]`
- **Problem:** §2 of the brainstorm bets that *honest, felt narrative* drives return visits — but it's an assumption, not a measured fact. The card already exists behind a flag.
- **Proposed deepening:** Split-test return-rate and second-backtest-rate for users who see the **"What you just learned"** card (`WhatYouLearnedCard`) vs. those who don't. Layer a PostHog experiment flag on the existing first-run gate (`bb.first_run_summary_card_seen` localStorage key — there is no `showFirstRunExplanations` flag in code); leave the always-on backend `NarrativeCard` on in both arms. See ADR-0010 for the full design (scope, metrics, enrollment, ship rule).
- **Wins:** Validates (or kills) the severity-as-retention thesis cheaply; if positive, justifies investing in narrative/coaching (#12, #19).

---

## B. The NL Wedge — *resolved decision #3: build the "type your idea" wedge now*

### 4. NL input → drafted strategy graph `[P0 · L]`
- **Problem:** The block canvas forces users to *compile their intuition by hand* — a learning cliff. Alex arrives wanting his belief adjudicated, not wanting to assemble a graph. This is the Software-3.0 gap.
- **Proposed deepening:** A single natural-language box ("buy ETH when RSI drops below 30") that drafts a valid block graph. Smallest verifiable increment: **one** strategy, drawn on the existing canvas, using existing block types only.
- **Wins:** Collapses the distance between intuition and a testable strategy; the headline differentiator vs. Composer (which couples to money) and TradingView (which needs Pine Script).

### 5. Accept / edit / reject diff UI on the canvas `[P0 · M]`
- **Problem:** A black-box "here's your strategy, trust me" forfeits trust and verifiability — exactly what Karpathy warns against. The human must stay on the leash.
- **Proposed deepening:** Render the AI's draft as a reviewable diff on the canvas (highlight added blocks/connections), with explicit Accept / Edit / Reject. Nothing auto-applies.
- **Wins:** Keeps the human in the loop (the autonomy slider); produces a clean accept/reject signal for evals; turns the AI into an assistant, not an oracle.
- **⚠️ Superseded framing — see ADR-0012 for the resolved design.** This 2026-06-05 wording predates ADR-0006/0011 and is stale on four points: the decision is a **post-backtest disposition on the result page**, not a pre-apply diff gate on the canvas; there is **no diff** (a new strategy has no baseline); the signal is a **four-way graded `Draft outcome`** (`accepted/edited/kept/rejected`), not a binary; and **#5 depends on #6** (you cannot judge a verdict that does not exist), so the `(#5,#6)` parallelism above is really `#6 → #5`.

### 6. Wire NL output into the wizard auto-backtest path `[P0 · M]`
- **Problem:** A draft that doesn't immediately get *tested* leaves the user at the un-resolved belief — the wedge promise ("find out if you're right") is unfulfilled.
- **Proposed deepening:** Reuse the existing wizard auto-save + auto-backtest flow so NL → graph → completed backtest happens in one continuous motion, ending on the result/narrative.
- **Wins:** Delivers the full magic moment in one flow; maximizes activation (#1); reuses proven plumbing rather than building new.
- **⚠️ Stale framing — see ADR-0013 for the resolved design.** "Reuse the existing wizard flow" is imprecise on two points: the wizard auto-backtests **only on `isFirstRun`** and **polls in-dialog** before navigating, whereas the wedge auto-backtests **every draft** and **navigates-into-running** (lands on the result page while the run is still going, letting the result page's own poller drive running→verdict — ADR-0012 §9). The auto-backtest is **client-orchestrated from the draft page** (the drafter endpoint stays generation-only per ADR-0011), uses the **same 1-year window** as the wizard for `wizard`-vs-`nl_wedge` cohort comparability (#7), and shares only a small `startAutoBacktest` enqueue helper — the wizard's `isFirstRun` gating is untouched.

### 7. A/B harness: NL box vs. blank canvas `[P1 · S]`
- **Problem:** We're betting the wedge ("adjudicate my idea") beats the current authoring model — but it's the brainstorm's #1 untested assumption.
- **Proposed deepening:** Randomize new users between NL-first and blank-canvas-first onboarding; primary metric is activation lift (from #1), secondary is 7-day return.
- **Wins:** Turns the core strategic bet into an eval, not a story; a clear go/no-go on where to point the roadmap.

### 8. Map NL output to existing validation rules `[P1 · M]`
- **Problem:** An LLM draft can be subtly invalid (no entry signal, dangling connection), which would break the auto-backtest and poison the wedge's first impression.
- **Proposed deepening:** Run every NL draft through the existing validation engine before rendering; if invalid, repair-or-explain rather than surfacing a broken graph. Reuse the plain-language error messages already in the product.
- **Wins:** Guarantees drafts are always backtestable; reuses the trusted validation layer; no malformed first impressions.

### 9. Cost-bound the inference `[P1 · S]`
- **Problem:** Open-ended AI generation is a runaway cost center, and autonomous multi-step agent runs are expensive and hard to verify.
- **Proposed deepening:** Constrain to small, single-shot drafts (one strategy per call), cache common intents, and cap per-user draft volume. The human verify step (#5) naturally bounds spend.
- **Wins:** Predictable unit economics for the AI feature; the leash doubles as a cost ceiling; aligns with the augmentation-not-autonomy model.

---

## C. Verification / Trust Moat — *§4: trust in the number is the real defensibility*

### 10. Public "How the backtest works" trust page `[P1 · S]`
- **Problem:** "We explain it better" is a thin moat anyone can copy. The hard-to-copy asset is *belief in the number* — but trust is invisible unless we make it legible.
- **Proposed deepening:** A transparent page documenting fee/slippage/spread defaults, OHLCV-only limitations, next-candle-open execution, and the no-look-ahead guarantee — in plain language, linked from every result.
- **Wins:** Converts conservative engineering into a marketed differentiator; the thing Composer (brokerage-coupled) and TradingView (results-for-experts) structurally forfeit.
- **⚠️ Resolved design — see ADR-0017 for the resolved scope.** This 2026-06-05 framing reads as greenfield, but the page **already exists and is accurate** (`frontend/src/app/(app)/how-backtests-work/page.tsx`). The real gap is the two words in its own title the code does not yet satisfy: **"Public"** (it sits behind the `(app)` auth gate, so a prospect arriving from a **Shared backtest** cannot reach it) and **"linked from every result"** (no result surface links it). So #10 is *promote the existing page into a public, standalone trust artifact + wire it into every result*, not write one. ADR-0017 fixes: move it out of `(app)` to one canonical public URL, static + audience-agnostic with OG metadata, linked from the in-app result / compare / Shared backtest, removed from in-app nav, and the false "slippage/spread are fixed" copy corrected (all three costs are user-overridable). Two honesty gaps are knowingly deferred: the public share payload hides the run's *actual* costs, and the hardcoded cost strings can drift from `config.py`.

### 11. Golden-backtest regression suite `[P1 · M]`
- **Problem:** Trust compounds only if the number never silently drifts. A subtle engine regression would erode the one asset that's hard to rebuild.
- **Proposed deepening:** A suite of known-good "golden" strategies + expected metrics, run in CI, that fails the build on any deviation. Include explicit look-ahead-bias tests.
- **Wins:** Protects the moat mechanically; lets us refactor the engine without fear; underwrites the trust page (#10) with real guarantees.
- **⚠️ Resolved design — see ADR-0018 for the full design.** Engine-level golden tests already exist (`TestGoldenSnapshot`, `TestCrossConditionSnapshot`, `TestCharacterizationAllPaths`) but feed `StrategySignals` directly into `run_backtest()`, bypassing the **Interpreter**, **Block Catalogue**, and **Strategy validator**. #11 is *that* gap: a new `test_golden_backtest_regression.py` runs the real worker pipeline (`validate_strategy` → `interpret_strategy` → `run_backtest`) against the three existing seed templates (real `definition_json` graphs, ~9/23 block types — full catalogue coverage is a follow-up) with deterministic synthetic candles, asserted via the existing inline-assert rounding contract. Look-ahead-bias tests use a single-cut-point mutation: replace the candle tail with a reversed series and assert all pre-cut trades/equity are bit-for-bit unchanged — a direct, automated check of the no-look-ahead guarantee the trust page (#10 / ADR-0017) documents. Also bootstraps the repo's **first CI** (`.github/workflows/backend-tests.yml`, full `pytest` suite, not just the golden file) as a prerequisite for "fails the build."

### 12. Sharpen the narrative into *felt* severity `[P1 · S]`
- **Problem:** A metric ("-12%") is information; a felt cost ("this conviction would have lost you $1,240 vs. just holding") is a painkiller. The current narrative is close but under-leveraged.
- **Proposed deepening:** Extend the narrative/"what you just learned" generation to express results in dollar terms and as a buy-and-hold delta, colored, framed as "what this idea would have cost/made you."
- **Wins:** Turns every result into emotional resolution of a real belief; powers the retention A/B (#3) and the shareable artifact (#13).
- **⚠️ Resolved design — see the ADR-0010 amendment (2026-06-15) for the resolved scope.** This 2026-06-05 framing reads as greenfield and conflates two distinct cards, but grilling against the code reframes it on four points: (1) the **only** new content is the buy-and-hold delta expressed in **dollars** — `narrative.py` already states the absolute outcome in dollars, and the vs-holding comparison was the percentage-points-only gap. (2) "the narrative/'what you just learned' generation" is **two components** (CONTEXT.md): the always-on backend **Narrative card** gains an *uncolored* dollar prose sentence (no `BacktestSummary` shape change), while *coloring* lives only in the first-run **What-you-learned card**, which already renders green/red natively. (3) The dollar figure is gated on the existing `|alpha| > 0.05` divergence band, so an **absent benchmark** — which the engine collapses to `0.0` — never prints a (false) dollar delta. (4) The Decision §6 "positive #3 → greenlight #12" ordering is **reversed for #12**: #3 is implemented but not live, so #12 lands in both cards *first* and #3 then tests the sharpened card (#19 stays gated). Wording expressed via four loss-aware regimes (made you / cost you / saved you / cost you more). See also CONTEXT.md → **Felt severity**.

---

## D. Distribution — *§7: organic only; incumbents own paid channels*

### 13. Shareable verified-result artifact `[P1 · M]`
- **Problem:** Education/confidence products have weak built-in virality, and we just pruned vanity social (#18). We need a distribution unit that fits the philosophy.
- **Proposed deepening:** A public, linkable, screenshot/OG-image-ready page for a single honest result ("I tested 'buy every RSI<30 dip' on ETH — here's what it did"). The "Wordle result" pattern applied to trading beliefs.
- **Wins:** Self-seeding top-of-funnel; distributes *the honest result*, not a follower count; inherently humbling/credible, which fits the trust brand.
- **⚠️ Resolved design — see ADR-0019 for the resolved scope.** This 2026-06-05 framing reads as greenfield, but the artifact **already exists** as the **Shared backtest** (CONTEXT.md): token-gated, result-only, verification-gated, already linking the trust page (ADR-0017 §3). The real gap is the two hyphenated words in #13's own title the code does *not* satisfy — **"OG-image-ready"** and the **"Wordle result"** unfurl: `/share/backtests/[token]/page.tsx` is a `"use client"` fetcher with **no `generateMetadata`/`openGraph`/`opengraph-image`**, so the link unfurls blank — the honest number never travels. ADR-0019 fixes: a **dynamic per-result OG image** (asset, return, max DD, equity **sparkline** via `ImageResponse`) so the actual number travels; a **server-component refactor** (server fetch via the already-provisioned `API_BASE_URL`, `generateMetadata`, recharts chart extracted to a client child) for real SSR/OG; the **result-only invariant preserved** (no idea/strategy name on the card — #13's "buy every RSI<30 dip" prose is illustrative, not a spec); plus two folded-in riders — **narrative on the landed page** (added to `PublicBacktestView`, auto-carries #12) and a **cost-honesty disclosure** that closes the per-run cost leak ADR-0017 §6 deferred *to here*.

### 14. `llms.txt` + clean docs for agent-legibility `[P2 · S]`
- **Problem:** The new consumers of products are also LLMs (Software 3.0). When someone asks an assistant "how do I backtest a crypto idea without code," we're invisible if we're not legible to it.
- **Proposed deepening:** Publish an `llms.txt` and clean, structured docs describing what Blockbuilders does and how. Lays groundwork for a future MCP-style "test this idea" interface other AIs can call.
- **Wins:** A distribution channel incumbents aren't positioned for; positions us as *the verification backend* general assistants delegate to.
- **✅ Resolved scope (grilled 2026-06-15 · no ADR).** Slice is **`llms.txt` index only** — no `.md` doc mirrors, no `robots.txt`/`sitemap.xml` (both still absent — follow-ups), and no MCP (the "test this idea" interface stays future groundwork, not built). Served by a **Next route handler** at `/llms.txt` (`app/llms.txt/route.ts`, `text/plain`) with **absolute** links derived from `FRONTEND_URL` — which must be **propagated into the frontend container** (`docker-compose.yml` + `docker-compose.prod.yml`; it is presently backend-only, the frontend service env has just `API_BASE_URL`). The curated list links **only genuinely-public, content-rich surfaces** — `/` and `/how-backtests-work` (already public per ADR-0017); `/metrics-glossary` and `/strategy-guide` are **excluded** because they sit behind the `(app)` auth gate (an agent would hit `/login`), and **no `/login` CTA** is added (descriptive, not promotional — matches the trust brand). The summary prose states the trust invariants (**signals-only, never takes custody / never trades, OHLCV-only, no look-ahead, next-candle-open**), which double as **anti-misrepresentation** so an assistant can't pitch Blockbuilders as a trading bot. **No ADR** (a deletable file fails the hard-to-reverse bar) and **no new CONTEXT.md term** (`llms.txt` is a build artifact, not load-bearing domain language); the deliberate thin/public-only link set is recorded in a comment atop the route handler so it doesn't later read as an oversight. **Known follow-ups:** promoting the glossary + strategy-guide to public would materially enrich the index; `robots.txt`/`sitemap.xml` remain unbuilt.

### 15. Literacy track from glossary + templates `[P2 · L]`
- **Problem:** §2's episodic-engagement churn — the pain fades between losses, so a spike-only tool bleeds users. Karpathy's Eureka bet says durable value is *ramping a human to competence*.
- **Proposed deepening:** A guided "learn strategy literacy by testing real ideas" track built on existing assets (metrics glossary, "what this teaches," contextual tooltips, templates). Progress from intuition → understanding drawdown → a tested playbook.
- **Wins:** Retention between pain spikes; SEO/content surface; activates the deferred "educator" persona; teachers share what teaches.

---

## E. Signals-Only Handoff — *resolved decision #1: augmentation without custody; verification-gated; later*

### 16. Alert on a backtested strategy `[P2 · M]`
- **Problem:** Once a user trusts a strategy, the build→verify loop ends and they leave — there's no reason to return until the next idea. And they still execute on gut elsewhere.
- **Proposed deepening:** Let users enable "ping me when this triggers" — **only** for a strategy that has a completed backtest, so the alert inherits the engine's trust. Reuse the existing scheduled-re-backtest + notification plumbing.
- **Wins:** A recurring reason to return without taking custody; extends one notch up the autonomy slider while preserving "we never touch your money."

### 17. Export to execution platforms `[P2 · M]`
- **Problem:** Users who want to act have to manually rebuild their tested idea in 3Commas/TradingView — friction that pushes them to abandon the verified version and trade on vibes.
- **Proposed deepening:** Export a backtested strategy as a TradingView webhook alert / 3Commas-compatible config / CSV. The hand-off, never the trade.
- **Wins:** Makes 3Commas etc. *complementary, not competitive* (as the competitive analysis predicted); completes the "validate here, execute there" loop without custody/regulatory exposure.

---

## F. Prune & Focus — *resolved decision #4: profiles/badges/digests are roadmap drift*

### 18. Freeze/hide profiles, badges, digests `[P1 · S]`
- **Problem:** These don't defend the core sentence ("does this help someone find out if their idea works?"). They consume surface area and maintenance for vanity-metric value.
- **Proposed deepening:** Feature-flag them off or hide entry points; freeze further investment. **Keep only** the shareable verified-result artifact (#13) — a distinct, surviving distribution mechanism, not social vanity.
- **Wins:** Reclaims focus and surface area for the wedge and trust loop; reduces cognitive load on Alex; sharpens the product story.

---

## G. Retention Loop

### 19. Polish the tweak-and-re-test loop `[P2 · M]`
- **Problem:** The build→backtest→inspect→tweak loop is the heart of iteration, but if iteration doesn't *teach*, users churn after one disappointing result instead of improving.
- **Proposed deepening:** Side-by-side run comparison plus plain-English "why your idea underperformed" coaching (e.g., "your stop was too tight — it exited before the recovery"). Deterministic, derived from existing metrics/trades.
- **Wins:** Converts a failed test into a learning step (the Eureka loop); deepens engagement; feeds the literacy track (#15).

### 20. Pain-spike re-engagement `[P2 · M]`
- **Problem:** §8/§2 — engagement is exogenously driven by crypto volatility; the pain (and the urge to act) spikes on drawdowns, exactly when rational testing is most valuable and least practiced.
- **Proposed deepening:** A trigger on significant market drops that nudges lapsed users: "The market just dropped X% — test your thesis before you react." Respect notification preferences; verification-gated framing, never a tip.
- **Wins:** Meets the user at peak pain with the rational alternative to panic; counters episodic churn; reinforces the "lab, not casino" brand.

---

## Suggested first sprint
`#1` (funnel) → `#2` (cohorts) → `#3` (narrative A/B) in parallel as the instrumentation foundation, then `#4 → #5 → #6` as the wedge slice, with `#7` switched on the moment #1 is trustworthy. Hold Groups E–G until the wedge shows activation lift — right moves, wrong time if pulled forward.

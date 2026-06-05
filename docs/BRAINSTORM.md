# Blockbuilders — Strategy Brainstorm

**Status:** Thinking document (not product truth)
**Date:** 2026-06-05
**Lens:** Andrej Karpathy's recent thinking (YC "Software Is Changing Again," June 2025; Dwarkesh Patel interview, Oct 2025; Eureka/education)
**Purpose:** Pressure-test where Blockbuilders should go next, using a specific external lens rather than generic roadmap instinct.

---

## 0. Why Karpathy as the lens

Three of Karpathy's recent arguments map almost suspiciously well onto a no-code crypto strategy lab. Before the nine dimensions, here is the lens itself, so the rest of the doc can lean on it.

1. **The autonomy slider, not the autonomy switch.** Karpathy frames good AI products as *Iron Man suits* (augmentation, human in the loop) rather than *Iron Man robots* (full autonomy). The product question is never "automate or not" — it's "where on the slider, and can the user move the slider themselves." Cursor and Perplexity win because they default to augmentation and let you dial up autonomy deliberately.

2. **The generation–verification loop, and keeping AI "on a leash."** LLMs generate fast but hallucinate. The bottleneck is *human verification*. Good products make verification fast and high-bandwidth — usually visual, because "vision is a high-bandwidth channel into the brain." You keep the AI generating in **small, verifiable increments** so a human can audit each step instead of rubber-stamping a wall of output.

3. **The march of nines, and the "decade of agents."** Karpathy deflates the hype: reliability is earned one nine at a time, each nine roughly the same amount of work as the last. Self-driving *demoed* in 2014 and still isn't done. So: demos are cheap, **reliability is the moat**, and any business model that bets on "the AI just works" is betting against the grain.

Supporting ideas used below: **Software 3.0** (English as a programming surface), **LLMs as "people spirits"** with jagged intelligence and no continual learning (so don't trust them with ground truth), and his **education bet (Eureka)** that the durable value is *ramping a human to competence*, not replacing them.

The throughline: **Blockbuilders should be the Iron Man suit of crypto strategy design — an augmentation tool with a trustworthy verification engine at its core — not a robot that trades for you.** Almost every dimension below resolves through that sentence.

---

## 1. Problem clarity

**The problem, stated tightly:** A non-technical crypto holder has *opinions* about the market ("ETH always dumps after a pump," "RSI under 30 is a buy") but no rigorous, low-stakes way to find out whether those opinions are true. So they trade on vibes, get hurt, and either freeze or chase. The competitive analysis names this person well — "Alex," who panic-sold ETH and wants *a rational framework, confidence, not automation.*

**This is sharp, and it is the right problem.** Note what it is *not*: it is not "I can't execute trades" (3Commas), not "I can't write Pine Script" (TradingView — though that's a barrier), not "I want hedge-fund returns" (Composer). It is **"I can't tell if my own idea is any good, and I'm tired of finding out with real money."**

**Karpathy sharpening — Software 3.0.** The deepest version of the problem is a *translation* problem: the user thinks in English ("buy the dip after a big red candle") and the tool demands they think in graphs of blocks and ports. The block canvas is a brilliant Software-2.0-era answer (visual, no code) but it still forces the user to compile their intuition by hand. The clearest framing of the problem Blockbuilders solves is therefore: **"the distance between a trading intuition expressed in plain language and a verifiable answer about whether it works."** Today that distance is a drag-and-drop canvas. The Software 3.0 move is to let the user *say* the idea and have the system draft the graph — keeping the canvas as the **verification surface**, not the authoring surface.

**Risk to clarity:** The product surface has sprawled (20 block types, public profiles, badges, templates marketplace, digests, billing tiers). Every added surface dilutes the one-sentence problem. A Karpathy-style discipline: each feature must defend the sentence *"this helps a non-technical person find out if their idea works."* Profiles and badges do not obviously pass.

---

## 2. Pain severity

**How bad is the pain, really?** On the surface, "I don't know if my strategy works" sounds like a vitamin, not a painkiller. But the *real* pain is downstream and visceral: **money lost to untested conviction, plus the anxiety of never knowing whether you're unlucky or just wrong.** That is a painkiller — it's the pain of a recurring, self-inflicted, emotionally charged wound.

**Severity is real but episodic.** The pain spikes after a loss or a missed move, then fades during boredom or a bull run when everything works. This is the classic retail-trading engagement curve, and it's a genuine strategic hazard: a tool used in spikes churns between spikes.

**Karpathy sharpening — the "lab" framing is a severity multiplier, in the right direction.** Composer couples backtest to brokerage; every test carries the emotional weight of real money. Blockbuilders' explicit *lab* positioning lowers the stakes of *exploration* while the underlying pain (fear of real loss) stays high. That's the correct asymmetry: **make the safe activity feel safe and the unsafe activity (untested live trading) feel appropriately scary.** The product should lean into this — a backtest result is not just a number, it's "here's what that conviction would have cost you," delivered before any money moves. The existing "What you just learned" card and narrative summary are early instances of converting a metric into *felt* severity. That mechanism is underrated and should be a pillar, not a footnote.

**The honesty trap.** Severity tempts overpromising ("find winning strategies!"). Karpathy's march-of-nines discipline says the opposite: the durable pain reliever is *trustworthy disappointment* — telling someone their favorite idea loses money, credibly, before they bet on it. Selling hope churns; selling reliable truth retains.

---

## 3. Demand evidence

**What we can lean on:**
- The competitive set is *crowded with adjacent demand* — TradingView (100M+), 3Commas, Composer, Jesse all monetize people who want to test/automate crypto ideas. Demand for the category is not in question; demand for *this slice* (no-code, education-first, execution-free) is the open question.
- Composer's traction and its **natural-language strategy builder** are the strongest signal that no-code + AI authoring has pull. JesseGPT (AI assistant on an open-source framework) is corroborating evidence from the developer end.
- Internally: PostHog onboarding funnel, wizard, and first-run instrumentation already exist — meaning the demand question is *answerable with data we are presumably already collecting.*

**What we do NOT yet have (and should be honest about):** evidence that the *education/confidence* wedge retains users better than the *automation/returns* wedge. Every competitor that grew large eventually leaned toward execution and returns. That's the null hypothesis to beat.

**Karpathy sharpening — testability of demand over narratives of demand.** Karpathy is relentlessly empirical (nanochat, evals, "build it from scratch to know it's real"). The corresponding move here: **treat demand as an eval, not a story.** Concretely, the funnel already instruments `wizard_skipped`, first-backtest, etc. The demand evidence we should be hunting:
- *Activation:* % of signups who reach a first completed backtest (the only moment the core value is delivered).
- *The "aha" retention split:* do users who see the "What you just learned" narrative return more than those who don't?
- *Wedge signal:* of returning users, are they iterating on strategies (confidence wedge) or asking "can I run this live" (execution wedge)? That single question routes the entire roadmap.

If we can't yet answer activation cleanly, that's the first instrumentation job — demand evidence is currently *latent in our own logs.*

---

## 4. Differentiation

**The defensible difference is philosophical, and the competitive doc already found it:** every competitor helps you *do*; Blockbuilders helps you *understand and decide*. TradingView shows what happened without meaning; 3Commas/Composer couple to execution; Jesse needs Python. The white space is **"no-code crypto backtesting for people who want confidence, not automation,"** wrapped in **plain-English explanation of results.**

**But "we explain it better" is a thin moat.** Anyone can add a narrative card. The Karpathy lens points to two *structurally* harder-to-copy differentiators:

1. **The verification engine as the moat (march of nines).** The thing that is genuinely hard to copy is a backtest engine that is *trusted* — conservative, transparent about fees/slippage/spread, honest about OHLCV limitations, free of look-ahead bias. Trust compounds; it is the one asset that gets *more* valuable and *harder* to replicate the longer you maintain it. Composer's coupling to brokerage and TradingView's "results for experts" both *forfeit* the trust-as-product angle. **Lean here. The moat is not the blocks; it's that people believe the number.**

2. **English-in, verified-out, with the human on the slider (Software 3.0 + autonomy slider).** If Blockbuilders becomes the place where you *say* a strategy, *see* it drafted as an auditable graph, *verify* it against a trusted engine, and *dial* how much the AI helps — that's a workflow, not a feature. Composer does NL→strategy but couples to money and targets sophisticated US investors; it skips the *education/verification* loop. The differentiated product is **"a co-pilot for trading intuition that keeps you in the loop and never touches your money."**

**Anti-differentiation warning.** The roadmap's "Priority 1" (multi-asset, short-selling, complex orders, live/tick paper trading) marches Blockbuilders *directly into* 3Commas/Composer/Jesse territory — competing on *capability* where incumbents are years ahead. Karpathy's "demo vs. product gap" warns that adding power is cheap and adding *reliable, comprehensible* power is the hard, defensible work. Differentiation erodes the moment we try to out-feature the execution platforms.

---

## 5. Beachhead / wedge

**The beachhead is a person, not a feature: "Alex" — the burned retail holder of one or two majors (BTC/ETH), post-loss, looking for a rational framework.** Narrow, emotionally identifiable, underserved by all four competitors. Good beachhead.

**The wedge — sharpened by Karpathy — is a single magic moment, not a product:**

> *"Type the trading idea you already believe in. Watch it get tested honestly. Find out, safely, if you're right."*

This is the **generation–verification loop** as a wedge: the user *generates* an idea in English, the system drafts a strategy graph (generation), and the trusted backtest *verifies* it (verification) — with the canvas as the high-bandwidth visual surface that makes the verification fast and legible. The wedge is *not* "build strategies with blocks" (that's the current authoring model and it's a learning cliff); it's **"resolve a belief you already hold."** People don't arrive wanting to build a graph; they arrive wanting to be told if they're right.

**Why this wedge and not "templates" or "wizard":** Templates answer "what could I build?" — but Alex doesn't lack ideas, he lacks *adjudication of his own idea.* The wizard is closer but is a multi-question form, not a sentence. The tightest wedge meets the user at the exact thing in their head.

**Land-and-expand path:** Idea-adjudication (wedge) → iteration ("tweak and re-test," the build→backtest→inspect→tweak loop already in the MVP) → literacy ("I now understand drawdown / why my idea failed") → identity ("I have a tested playbook"). Each step is augmentation; none requires touching execution.

---

## 6. Business viability

**Current model:** flat-rate Free/Pro/Premium ($0/$19/$49), gated on strategy count, backtests/day, and historical depth, plus one-time credit packs. Clean, no metered billing, grandfathered beta perks. Reasonable for an MVP.

**The viability tension, viewed through Karpathy's "decade of agents":** if you bet the business on *autonomous* value (the AI finds you winning strategies, or trades for you), you are betting on reliability that, per the march of nines, arrives slowly and expensively — and you take on regulatory and trust liability the moment money moves. **The augmentation model is the more viable bet precisely because it doesn't depend on the AI being right** — it depends on the *engine* being trustworthy and the *human* staying in the loop. You're selling a verified answer and a learning tool, not a money machine. That's a subscription people renew when the pain spikes, not a fiduciary promise you can be sued over.

**Where the unit economics get interesting (and risky):**
- Backtests are the cost center (compute, market data). Gating backtests/day is sensible, but if the wedge is "test your idea instantly," friction on the core action fights the wedge. Watch this tension.
- If AI authoring (NL→strategy) is added, *inference cost per draft* enters the model. Karpathy's "small verifiable increments" is also a *cost* discipline: cheap, frequent, small generations a human verifies — not expensive autonomous agent runs. Design the AI feature so the human verification step naturally bounds spend.

**Honest viability question to keep on the table:** is "confidence/education for retail crypto" a *subscription* business or a *funnel* business? The gravitational pull (every competitor felt it) is toward execution, where the money and retention are. Staying execution-free is a *philosophical* choice with a *revenue* cost. That trade-off should be made deliberately, with eyes open — not drifted into.

---

## 7. Distribution path

**The structural problem:** education/confidence products have weak built-in virality, and the incumbents own the channels (TradingView's community, 3Commas' affiliate machine). The current public-profiles/badges/digest features are an attempt at social distribution, but they feel grafted on — Karpathy's discipline would ask whether they defend the core sentence (they mostly don't yet).

**Karpathy-aligned distribution moves:**

1. **The shareable verified artifact (verification as content).** The most natural unit of distribution is *the honest result itself*: "I tested the 'buy every RSI<30' idea on ETH — here's what it actually did." A plain-English, screenshot-ready, slightly humbling result is *inherently shareable* in a way a Sharpe ratio is not. The narrative/"what you just learned" cards are latent distribution assets. Make every verified result a clean, public, linkable artifact and the product seeds its own top-of-funnel. This is the "Wordle result" pattern applied to trading beliefs.

2. **"Build for agents" — Software 3.0 distribution.** Karpathy argues the new consumers of products are also LLMs. Two angles: (a) an `llms.txt`/clean docs surface so when someone asks an LLM "how do I backtest a crypto idea without code," Blockbuilders is legible and recommendable; (b) longer term, an MCP-style interface so a user's general AI assistant can *delegate* "test this idea" to Blockbuilders' trusted engine. Becoming **the verification backend that other AIs call** is a distribution moat the execution platforms aren't positioned for.

3. **Education as distribution (the Eureka bet).** Karpathy's own next act is education — ramping humans to competence. Blockbuilders already has the raw material (metrics glossary, "what this teaches," contextual tooltips, templates). A genuine "learn crypto strategy literacy by testing real ideas" track is both the retention mechanism (§2's churn problem) *and* a content/SEO/community distribution engine. The product that *teaches* gets shared by teachers — the secondary "educator" persona the MVP deferred.

**What to be skeptical of:** paid acquisition against incumbents with deeper pockets and execution-driven LTV. If distribution must be bought, the execution-free model's lower LTV becomes an acute disadvantage. Organic (shareable artifacts + education + agent-legibility) is the only distribution that fits the philosophy.

---

## 8. Timing

**Why now is genuinely good:**
- **Software 3.0 is mid-inflection.** NL→structured-artifact is *just* becoming reliable enough to draft (not autonomously ship) a strategy graph. Composer/JesseGPT prove the appetite; the window to own the *crypto + education + verification* corner of it is open but closing.
- **The canvas + deterministic engine already exist.** The expensive, trust-critical part (a working, transparent backtest engine) is *built*. Adding a Software-3.0 authoring layer on top of a finished verification layer is exactly the right sequencing — generation is cheap, verification is the asset, and we already have the asset.

**Why timing is also a warning (Karpathy's deflation):**
- **"Decade of agents," not year of agents.** The market is loud with "AI trades for you" promises that will mostly disappoint per the march of nines. Timing risk: getting swept into autonomy hype, overpromising, and burning trust — the one asset (§4) that's hard to rebuild. The *contrarian-correct* timing bet is to be the **honest, augmentation-first** tool exactly while everyone else overpromises autonomy. When the autonomy hype cools (it will), the trustworthy lab is the one left standing.
- **Crypto-cycle timing** is real and exogenous. Pain/engagement spike post-drawdown, evaporate in euphoria. Don't confuse a bull-run signup surge with product-market fit, and don't read a quiet bull-market month as failure.

**Net:** the *technology* timing favors a Software-3.0 augmentation layer now; the *narrative* timing favors deliberately under-promising while the field over-promises.

---

## 9. Testability

This is where the Karpathy lens is most operational — he is, above all, an evals person. **The strategy is only as good as our ability to cheaply test its core bets.** The good news: this product is *unusually* testable because the value moment is discrete (a completed backtest) and already instrumented (PostHog funnel).

**The bets and their cheapest tests:**

| Strategic bet | The cheapest honest test | What would falsify it |
|---|---|---|
| **Wedge:** "adjudicate my idea" beats "build with blocks" | Prototype a single NL-input box that drafts a graph + auto-backtests (the wizard's auto-backtest path already exists); A/B vs. blank canvas | Users who get a drafted strategy don't return more than users who build manually |
| **Severity/retention:** honest narrative drives return | Already have the "what you just learned" flag — split-test return rate with/without | No retention lift from the narrative |
| **Differentiation:** trust is the moat | Survey + behavior: do users cite "I believe the number" as why they stay? Do they re-run others' shared results to check them? | Users treat the number as disposable; no verification behavior |
| **Distribution:** verified results are shareable | Ship a public, linkable result artifact; measure share rate and referral signups | Nobody shares; no referral loop |
| **Viability:** confidence is a subscription, not a funnel | Cohort renewal by usage pattern (iterators vs. would-be-executors) | Renewal concentrates only among users asking to go live |

**Karpathy's "keep the AI on a leash" as a testability principle for any AI feature we add:** ship the NL→strategy authoring in the *smallest verifiable increment* — draft *one* strategy the user immediately sees on the canvas and can accept/edit/reject — never a black-box "here are 10 strategies, trust me." This is simultaneously the *safest UX*, the *cheapest to evaluate* (one clear accept/reject signal per generation), and the *cheapest to run* (bounded inference). The leash is also the eval harness.

**The one number that matters most:** **activation = % of signups reaching a first completed backtest.** It is the only moment the core promise is delivered. If we don't have it clean, that's the first thing to instrument — every dimension above is unfalsifiable until we can see whether people reach the magic moment at all.

---

## Synthesis — the one-paragraph bet

Blockbuilders should commit, deliberately and against the gravitational pull of every competitor, to being **the Iron Man suit of crypto strategy design: a Software-3.0 augmentation tool where a non-technical person types an idea they already believe, watches it become an auditable strategy graph, and gets an honest, plain-English verdict from a backtest engine they trust — with their hand always on the autonomy slider and their money never on the line.** The moat is *trust in the number* (march of nines), the wedge is *adjudicating a belief* (generation→verification), the distribution is *the shareable honest result* and *agent-legibility*, and the retention is *learning* (the Eureka bet). The single largest strategic risk is drifting toward execution/automation to chase obvious revenue, trading away the one differentiator — trustworthy, in-the-loop honesty — that the entire thesis depends on. Resolve that tension on purpose, measured by activation and the iterators-vs-executors split, not by feature-count instinct.

---

## Resolved decisions (2026-06-05 session)

The four open questions were answered directly. They cohere into one position, so they're recorded here as commitments rather than musings.

### 1. Execution-free? → **Hybrid / signals-only.** *(Custody stays at zero.)*
Blockbuilders never holds money and never trades, but it **may emit alerts/signals and export to execution platforms** (3Commas, exchanges, TradingView webhooks) so the user acts elsewhere. This is *augmentation without custody* — one deliberate notch up the autonomy slider, not a switch.

**What this reshapes:**
- **§4 / §1 (differentiation):** The competitive doc already noted 3Commas could be *complementary, not competitive* ("Blockbuilders helps you figure out *what* to do; 3Commas helps you *do it*"). Signals-only makes that literal: Blockbuilders becomes the **idea-validation + signal layer** that hands off to execution. The slider now reads: *human drafts → AI assists → engine verifies → (optional) signal emitted → user executes elsewhere.*
- **§6 (viability):** Opens a retention/revenue door (alerts, "your tested idea just triggered," export) **without** taking on fiduciary/regulatory liability or the march-of-nines reliability burden of autonomous trading. The honesty/trust thesis survives intact: *we tell you if you're right and ping you when it fires; we never touch your money.*
- **Guardrail:** signals are still verification-gated. We only let a user wire up an alert for a strategy they've *backtested* — the signal inherits the trust of the engine. No "blind" alerts. The moment a signal feels like a tip rather than a verified trigger, the trust moat erodes.

### 2. Activation data? → **Partial / untrusted.**
Events exist but the signup → first-completed-backtest funnel is incomplete or untrusted. **First job: audit and clean the activation funnel** before relying on it. Every other bet in §9 is unfalsifiable until this number is trustworthy.

### 3. NL→strategy authoring? → **Build the NL wedge now.**
Prototype a single natural-language input that drafts a strategy graph + auto-backtests (reuse the wizard's existing auto-save + auto-backtest path), and A/B it against the blank canvas. Ship it as the **smallest verifiable increment** (one drafted strategy, shown on the canvas, accept/edit/reject) — the leash *is* the eval harness (§9).

### 4. Profiles / badges / digests? → **Roadmap drift — prune/freeze.**
They don't defend "does this help someone find out if their idea works." Stop investing; freeze or hide. **Important distinction:** this prunes *vanity social* — it does **not** kill §7's distribution play. The **shareable verified-result artifact** (the "Wordle result" pattern) is a different, surviving mechanism: it distributes the *honest result*, not a follower count.

---

## Sequenced next actions (derived from the decisions)

1. **Audit & fix the activation funnel** (decision #2). Make signup → first-completed-backtest a trustworthy number. *Prerequisite for everything below — without it, the NL A/B in step 2 can't be read.*
2. **Prototype the NL wedge** (decision #3): single NL box → drafted graph → auto-backtest, on a leash (accept/edit/reject). A/B vs. blank canvas; primary metric = activation lift from step 1.
3. **Freeze profiles/badges/digests** (decision #4); redirect that surface area toward the wedge and the verification loop.
4. **Spike the shareable verified-result artifact** (§7) — public, linkable, screenshot-ready honest result — as the organic distribution seed.
5. **Design the signals-only handoff** (decision #1) as a *later* expand step, verification-gated: alert/export only for backtested strategies. Not now; on the roadmap behind activation + wedge proof.

**Updated synthesis risk:** the original worry was "drifting toward execution." The signals-only decision converts that drift into a *bounded, deliberate* move — custody stays at zero, signals stay verification-gated. The residual risk is now narrower: letting signals degrade into un-verified tips. Guard the gate, not the gravity.

# ADR-0017 — How-Backtests-Work is a public trust artifact, not an in-app reference page

- **Status**: Accepted
- **Date**: 2026-06-12
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Trust page, Shared
  backtest; [ADR-0008](./0008-activation-is-first-result-viewed.md) —
  Activation is the first result *viewed* (the moment the trust page
  backs); `docs/ACTIONS.md` #10 (this item), #11 (golden-backtest
  regression suite — the mechanical counterpart to this page's
  human-readable guarantees), #13 (the Shared backtest as
  organic-distribution artifact this page is linked from).

## Context

ACTIONS #10 ("Public 'How the backtest works' trust page") reads as a
greenfield build, but the page already exists and is accurate
(`frontend/src/app/(app)/how-backtests-work/page.tsx`): it documents the
default fee/slippage/spread, next-candle-open execution, OHLCV-only data,
and the completed-candles-only / no-look-ahead guarantee. The unmet parts
are the two words in its own title that the existing implementation does
*not* satisfy — **"Public"** and **"linked from every result"**:

1. It lives under the `(app)` route group, whose layout
   (`frontend/src/app/(app)/layout.tsx`) redirects any unauthenticated
   visitor to `/login`. The one genuinely public result surface — the
   **Shared backtest** (`/share/backtests/[token]`), the "Wordle result"
   artifact a prospect actually lands on — therefore cannot reach it.
2. No **result** surface links it. The page is referenced only from the
   sidebar, the breadcrumb header, and the dashboard — never from the
   in-app result page, the compare page, the Shared backtest, or the
   `TransactionCostAnalysis` / `NarrativeCard` components.

So #10 is not "write a trust page." It is "promote an existing, accurate
page into a public trust artifact and wire it into every result." The
brainstorm framing (§4) is that *belief in the number* is the real moat;
a trust page trapped behind auth and unlinked from the public result is a
moat nobody can see.

This decision is recorded because the resulting shape is deliberately
inconsistent with the page's siblings and would otherwise read as an
oversight.

## Decision

**`/how-backtests-work` becomes a public, standalone trust artifact that
lives outside the app shell and is linked from every result, rather than
an in-app reference page like the metrics-glossary or strategy-guide.**

Concretely:

1. **Move out of `(app)` to a top-level public route.** `(app)` is a
   route group, so the URL stays `/how-backtests-work` and existing
   links keep resolving; what is shed is the `(app)` layout — both the
   auth gate (the thing we want gone) and the sidebar chrome. The page
   becomes standalone, like `/share/backtests/[token]`. One canonical
   public URL is chosen over sibling-consistency: the page's whole value
   is being *the* citable trust surface, and a single indexable/shareable
   URL is itself a trust asset.

2. **Static, audience-agnostic server component.** It does not detect
   login. It keeps a static-server shape (preserving SEO/OG), gains the
   `metadata`/OpenGraph export it currently lacks (mirroring the root
   `/` landing page), replaces the app-only "Back to dashboard" framing
   with a neutral public header (logo → `/`), and keeps a single
   conversion CTA that naturally funnels a logged-out reader through
   `/login`.

3. **Linked from every result page.** A "How backtests work →" link is
   added to the in-app result page (`strategies/[id]/backtest`, anchored
   near `TransactionCostAnalysis`), the compare page, and the public
   Shared backtest. The dashboard's existing contextual link stays.

4. **Removed from in-app nav.** The sidebar (`app-sidebar.tsx`) and
   breadcrumb (`site-header.tsx`) entries are removed: the page is now a
   public/result-linked surface, not in-app chrome navigation.

5. **Honesty correction (in scope).** The page currently asserts
   "Slippage and spread are fixed model defaults." This is false — all
   three costs are user-overridable (`user.default_fee_percent` /
   `default_slippage_percent` / `default_spread_percent`, editable in
   `RunConfig.tsx` and `preferences/page.tsx`). The copy is corrected to
   say all three are configurable and that a given result's settings may
   differ from the documented defaults. A trust page must not misstate
   its own model.

6. **Two honesty gaps explicitly deferred (out of scope), not fixed:**
   - The public Shared backtest payload (`PublicBacktestView`) does not
     expose the fee/slippage/spread *actually used* for that run, so the
     linked trust page can vouch for a number produced under custom
     costs. Closing this requires extending the share serializer and is
     left as a follow-up.
   - The page hardcodes the default-cost strings with a manual "update
     both" comment; they can silently drift from
     `backend/app/core/config.py`. A config-drift guard (the doc-level
     cousin of #11) is left as a follow-up. Values are correct today.

## Consequences

**Positive:**
- The trust moat becomes visible to the audience that matters: a prospect
  arriving from a Shared backtest can read the methodology without an
  account.
- "Linked from every result" is satisfied at the surface level, and a
  single canonical public URL is available for OG cards, `llms.txt`
  (#14), and external citation.
- Correcting the slippage/spread copy removes a factual error from the
  one page whose entire job is to be trusted.

**Negative / non-obvious:**
- The page is now deliberately inconsistent with its siblings: the
  metrics-glossary and strategy-guide remain inside `(app)` (chromed,
  auth-gated) while this one lives outside it. This inconsistency is the
  decision, not an oversight — hence this ADR.
- Logged-in users lose the sidebar on this page and lose its in-app nav
  entry; discovery now flows from result links and the public funnel.
- Two real trust leaks (per-run cost exposure on the public share, and
  config drift) are knowingly shipped open as follow-ups. The corrected
  copy ("a result's settings may differ from these defaults") is the
  interim mitigation, not a fix.

## Alternatives considered

- **Two routes sharing a content component** — keep the chromed `(app)`
  page for logged-in users, add a separate public route for prospects.
  Rejected: splits the canonical URL for a page whose value is being the
  single citable trust surface, and forces a "which one is canonical"
  decision on every link.
- **Make the `(app)` layout auth-optional for this path** — keep one URL
  and the chrome. Rejected: a logged-out visitor would get an app sidebar
  full of links that bounce to `/login`, a confusing trust-page
  experience.
- **Auth-aware CTAs** — detect login and tailor the buttons. Rejected:
  costs the static-server simplicity and complicates SEO/OG for marginal
  benefit; an agnostic CTA that funnels through `/login` serves both
  audiences.
- **Expose per-run costs on the public share now / build a config-drift
  guard now** — close both honesty gaps inside #10. Deferred: both reach
  beyond the public-route + linking scope (backend payload work; new
  single-source plumbing), and the corrected copy mitigates the
  immediate risk.
- **Full content rebuild.** Rejected: the existing content is accurate;
  the gap is reachability and linking, not prose.

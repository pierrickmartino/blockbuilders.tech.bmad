# ADR-0019 — The Shared backtest is an OG/social-card-ready distribution artifact

- **Status**: Accepted
- **Date**: 2026-06-15
- **Related**: [CONTEXT.md](../../CONTEXT.md) — Shared backtest, Trust
  page; [ADR-0017](./0017-how-backtests-work-is-a-public-trust-artifact.md)
  §6 (defers the per-run cost-honesty gap to this item's
  neighbourhood — closed here); `docs/ACTIONS.md` #13 (this item),
  #12 (felt severity, which this artifact surfaces once it ships),
  #18 (which keeps #13 as the one surviving distribution surface).

## Context

ACTIONS #13 ("Shareable verified-result artifact") reads as a greenfield
build — "a public, linkable, screenshot/OG-image-ready page … the Wordle
result pattern." But the artifact already exists end-to-end and CONTEXT.md
already canonises it as the **Shared backtest**: a token-gated,
result-only, verification-gated public view
(`SharedBacktestLink`, `backtest_sharing.py`,
`GET /backtests/share/{token}` → `PublicBacktestView`,
`/share/backtests/[token]/page.tsx`, `ShareBacktestModal`,
`SharedBacktestHeader` — which already links the Trust page per
ADR-0017 §3).

The unmet part is the two hyphenated words in #13's own title-line that
the code does **not** satisfy — **"screenshot/OG-image-ready"** and the
**"Wordle result"** virality property:

1. `page.tsx` is a `"use client"` component that fetches client-side. It
   exports **no `generateMetadata`, no `openGraph`/`twitter` tags, and no
   `opengraph-image`**. Pasting the link into Twitter/Discord/Slack yields
   a blank card — the actual result never travels, which is the literal
   mechanism of the "self-seeding top-of-funnel" win.
2. The landed page is a sterile metrics grid: `PublicBacktestView` carries
   metrics + equity curve only, **no `narrative`**, so a visitor reads a
   number with no honest-result story. (#12's felt-severity work names
   this artifact as one of its consumers.)
3. ADR-0017 §6 knowingly shipped a leak it punted *to here*: the public
   payload does not expose the fee/slippage/spread *actually used*, so the
   linked Trust page can vouch for a number produced under custom costs. A
   dynamic OG image *amplifies* this — the headline return now broadcasts
   publicly with no settings context.

So #13 is not "build a shareable page." It is "promote the existing
Shared backtest into a true social-distribution unit, and close the
honesty gaps that broadcasting the number makes pointed."

## Decision

**The Shared backtest becomes an OG/social-card-ready distribution
artifact: its link unfurls into a rich preview that carries the honest
result itself, while staying strictly result-only.**

Concretely:

1. **Dynamic per-result OG image.** A Next.js `opengraph-image` route
   segment under `/share/backtests/[token]/` renders, via `ImageResponse`,
   the actual result — asset, timeframe, headline return, max drawdown,
   and a downsampled equity-curve **sparkline** (inline SVG, ~60 points) —
   plus the brand mark. The honest *number* travels, not a brand or a
   follower count. A static brand image was rejected: it gives a rich card
   but distributes a brand, gutting the "distributes the honest result"
   win.

2. **Server-component refactor.** `page.tsx` is converted from a
   client-only fetcher into a server component that fetches the public
   view server-side (via the already-provisioned internal
   `API_BASE_URL=http://api:8000`, previously unused by the frontend) and
   exports `generateMetadata`; the interactive recharts equity curve is
   extracted into a `"use client"` child. This is required because
   `generateMetadata` cannot be exported from a `"use client"` page, and
   it yields genuine SSR/first-paint for the public funnel as a byproduct.
   A metadata-only `layout.tsx` was rejected: it double-fetches and leaves
   SSR rendering a spinner.

3. **Result-only invariant preserved and sharpened.** The artifact shows
   metrics, equity curve, narrative, and a cost disclosure — but **never**
   the strategy graph *or the idea/name* that produced it. #13's prose
   ("I tested 'buy every RSI<30 dip'") is illustrative copy, not a spec:
   naming the idea would relax a hard invariant and add a public exposure
   surface, and is explicitly **not** done here. The "Wordle result"
   property comes from the honest number travelling, not from naming the
   guess.

4. **Rider — narrative on the landed page.** `narrative` is added to
   `PublicBacktestView` and rendered on the page body, turning the landing
   from a number grid into an honest-result story. It auto-carries #12's
   felt-severity dollar line once that ships — no coupling to #12.

5. **Rider — cost-honesty disclosure (closes ADR-0017 §6).** The page
   renders the already-present `total_fees/slippage/spread/costs_usd` from
   `summary`, and the three *rates used* (`fee_rate`, `slippage_rate`,
   `spread_rate`) are added to `PublicBacktestView`, so the broadcast
   number is shown net of disclosed costs at disclosed rates.

## Consequences

**Positive:**
- The trust-brand's distribution unit finally distributes: a link
  unfurls into the honest result, self-seeding top-of-funnel.
- ADR-0017 §6's deferred cost leak is closed at the surface it most
  endangers — the now-broadcast public number.
- The public share gains real SSR/SEO/OG as a byproduct of the refactor.

**Negative / non-obvious:**
- `PublicBacktestView` grows (`narrative` + three rate floats): a public
  payload is a contract, so these are effectively permanent exposures.
  They are deliberate (honest-result + cost honesty), not incidental.
- A dynamic OG image renders the actual return into a public, auth-free
  image. This is the point, but it raises the stakes on cost honesty —
  hence rider 5 ships *with* the image, not after it.
- The result-only boundary is now load-bearing under broadcast pressure;
  any future "name the idea" must be a deliberate ADR relaxing it, not a
  quiet copy change.

🎨 Design System Audit — Live Findings (Playwright, 56 captures @ 320/768/1024/1440 × light/dark)

  ★ Insight ─────────────────────────────────────
  - The audit script's goto calls all timed out on networkidle — that's a Next.js dev-server quirk (HMR keeps a websocket open forever). The visual content was captured
  anyway because the screenshot ran in a separate try-block. For future runs, switch to waitUntil: 'domcontentloaded' + a short fixed delay.
  - The login screen is the strongest visual moment in the public surface — split panel with intentional brand gradient. The home hero is the weakest — it's the textbook
  AI-template layout (centered eyebrow pill, oversized centered headline with brand-color word, centered subhead, centered CTA, no art direction). The codebase has good
  taste; the public-facing landing doesn't show it yet.
  ─────────────────────────────────────────────────

  What the static audit couldn't see — now confirmed

  🔴 CRITICAL — /pricing route returns 404

  pricing__*__*.png (all 8 captures) show "404 — This page could not be found." with no design treatment, no app chrome, no return path. The cookie banner happily floats
  over the 404, which makes the unstyled-ness of the error state stand out even more.

  - If /pricing is intentional: there's no link to it in nav (audited). Remove any references.
  - If /pricing should exist: ship a real route.
  - In either case: the 404 page itself needs a design pass. Right now it's the Next.js default — black 404, vertical pipe, plain text. For a "disciplined trading
  workstation" brand voice, this should at minimum carry the logo, headline scale, brand color, and a "back to strategies / login" affordance. File:
  frontend/src/app/not-found.tsx (likely missing — Next.js falls back to its built-in).

  🔴 CRITICAL — Home hero scores high for AI-slop

  home__light__1440.png matches 5 of the 7 generic AI patterns the skill checks for:

  ┌────────────────────────────────────────────────────┬───────────────────────────────────────┐
  │                      Pattern                       │                Present                │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ Eyebrow pill above headline ("No coding required") │ ✅                                    │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ Centered oversized headline                        │ ✅                                    │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ Brand-color gradient on key word ("visually")      │ ✅                                    │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ Centered subhead                                   │ ✅                                    │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ Single centered CTA with arrow icon                │ ✅                                    │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ Glass morphism                                     │ ❌                                    │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ Stock gradient blob behind hero                    │ ❌ (your radial is too faint to read) │
  └────────────────────────────────────────────────────┴───────────────────────────────────────┘

  For a brand that explicitly defines itself as "Editorial, Precise, Calm" (docs/design_concept.json), this hero reads as the opposite — generic, unanchored, conventional.
   Suggested fix path:
  - Asymmetric layout — headline left, value-prop right, real product surface below (canvas screenshot, not "01/02/03" cards).
  - Drop the eyebrow pill — it's the most identifiable AI-template tell.
  - Replace the gradient on "visually" with weight contrast or italic — the gradient text utility is itself flagged in your design_concept.json as off-brand ("no
  decorative gradients").
  - File: frontend/src/app/page.tsx

  🟠 HIGH — Cookie banner is universal & undesigned

  Every captured viewport shows the cookie consent bar pinned to the bottom, covering 60–110px of the fold. On home__light__320, it covers the primary CTA ("Start building
   free") on first paint. On pricing__light__1440, it overlays a 404. There is no thought to where it should not appear (it shouldn't appear above an error state, for
  instance), and at 320 the banner takes ~25% of the visible viewport.

  - Fix: Auto-dismiss on auth pages (login/signup) where the user has clearly made an account-creation choice. Reduce mobile height (move buttons inline or stack the
  policy link below). File: frontend/src/components/ConsentBanner.tsx.

  🟠 HIGH — Home hero has unjustified vertical voids

  At 1440, between the top of <main> and the headline there's ~280px of pure whitespace, then between the CTA and "How it works" another ~280px. Editorial layouts use big
  white space as compositional weight against asymmetry, art, or quote. Yours is a column of centered text with vacuum on either side. The hero ends up feeling
  underweight.

  - Fix: Either fill the negative space with art direction (a real canvas screenshot to the right is the obvious move, since you literally are a visual strategy lab), or
  compress hero padding to clamp(2rem, 5vh, 6rem) top, clamp(3rem, 8vh, 8rem) bottom.
  - File: frontend/src/app/page.tsx — section padding values.

  🟠 HIGH — Inconsistent primary-button color across home vs login

  Compare:
  - home__light__1440.png → "Start building free" — solid --primary blue, looks like hsl(204 65% 57%).
  - login__light__1440.png → "Sign in" — visibly lighter / desaturated blue (closer to --info or --primary-foreground-tinted).

  These are both your highest-intent CTAs, on adjacent flows. They should be identical. Suspect cause: the login page is consuming a different button variant or has been
  styled with bg-primary/80 somewhere.

  - Fix: grep frontend/src/app/login/page.tsx for hand-rolled button classes. Use <Button> from @/components/ui/button with no className override. Verify by running audit
  again and eyeballing the two CTAs side by side.

  🟡 MEDIUM — Login split-panel breakpoint loses brand statement on mobile/tablet

  login__dark__768.png shows the gradient brand panel completely gone at 768px — only the form remains. The value-prop list ("Visual Strategy Lab for Crypto Traders" + 3
  feature bullets) does not appear above or below the form. So at every width below ~1024, the user signs in to an unbranded form.

  - Fix: Below lg:, render a compact brand strip (logo + tagline + 1-line value prop) above the form. Keep the gradient as a thin top accent or skip it entirely on mobile.
  - File: frontend/src/app/login/page.tsx

  🟡 MEDIUM — Dark-mode body radial is invisible

  home__dark__1440.png shows essentially zero benefit from the radial gradients defined in globals.css:99–102. They're tuned at 6%/8% alpha; on a 240 8% 5% background
  that's mathematically below perceptible contrast. You're paying parse + paint cost for a gradient nobody can see.

  - Fix: Either bump alpha to 0.12–0.18 and visibly justify it (or apply it only on the home hero section, not the global body), or remove. Removing aligns with the "no
  decorative gradients" principle in design_concept.json. File: frontend/src/app/globals.css:96–103.

  🟡 MEDIUM — /metrics-glossary and /strategies and /dashboard redirect to login

  All three routes end up showing the login page in the captures. That's expected behavior, but the metrics glossary should arguably be public — it's a marketing/SEO asset
   (definitions of "Sharpe", "Drawdown" etc), and gating it loses search traffic for terms your target audience googles. Confirm intent.

  🟢 LOW — Login form is the brightest part of the audit

  Worth saying explicitly because it's the model to scale up from:
  - Asymmetric split (gradient brand panel + clean form panel).
  - Thoughtful 3-feature list with mini icons.
  - Real hierarchy: brand → headline → social auth → divider → email auth → secondary actions.
  - Gradient is justified (it's the brand panel; it earns its place).
  - Dark mode at 768 collapses cleanly.

  The work to do is make the home page feel like the login page does — not the other way around.

  ---
  Updated Score Table

  ┌─────┬───────────────────────┬────────┬──────┬─────┬──────────────────────────────────────────────────────────────┐
  │  #  │       Dimension       │ Static │ Live │  Δ  │                         Why changed                          │
  ├─────┼───────────────────────┼────────┼──────┼─────┼──────────────────────────────────────────────────────────────┤
  │ 1   │ Color consistency     │ 4      │ 4    │ —   │ Confirmed; CTA mismatch (home vs login) is new evidence.     │
  ├─────┼───────────────────────┼────────┼──────┼─────┼──────────────────────────────────────────────────────────────┤
  │ 2   │ Typography hierarchy  │ 8      │ 7    │ ↓1  │ Hero leans on size alone; no real h1→h2 contrast on landing. │
  ├─────┼───────────────────────┼────────┼──────┼─────┼──────────────────────────────────────────────────────────────┤
  │ 3   │ Spacing rhythm        │ 7      │ 6    │ ↓1  │ Hero vertical voids visible at 1440.                         │
  ├─────┼───────────────────────┼────────┼──────┼─────┼──────────────────────────────────────────────────────────────┤
  │ 4   │ Component consistency │ 5      │ 4    │ ↓1  │ Two different "primary" button blues across flows.           │
  ├─────┼───────────────────────┼────────┼──────┼─────┼──────────────────────────────────────────────────────────────┤
  │ 5   │ Responsive behavior   │ 7      │ 7    │ —   │ Type fluid; login mobile loses brand.                        │
  ├─────┼───────────────────────┼────────┼──────┼─────┼──────────────────────────────────────────────────────────────┤
  │ 6   │ Dark mode             │ 6      │ 6    │ —   │ Body gradient invisible — paying cost for nothing.           │
  ├─────┼───────────────────────┼────────┼──────┼─────┼──────────────────────────────────────────────────────────────┤
  │ 7   │ Animation             │ 8      │ 8    │ —   │ Not visible in static screens; static finding stands.        │
  ├─────┼───────────────────────┼────────┼──────┼─────┼──────────────────────────────────────────────────────────────┤
  │ 8   │ Accessibility         │ 6      │ 5    │ ↓1  │ 404 page has no skip-link / no chrome / no return path.      │
  ├─────┼───────────────────────┼────────┼──────┼─────┼──────────────────────────────────────────────────────────────┤
  │ 9   │ Information density   │ 6      │ 6    │ —   │ Hero is under-dense, app pages over-dense. Same root cause.  │
  ├─────┼───────────────────────┼────────┼──────┼─────┼──────────────────────────────────────────────────────────────┤
  │ 10  │ Polish                │ 7      │ 5    │ ↓2  │ Cookie banner over 404, default 404, hero feels stock.       │
  └─────┴───────────────────────┴────────┴──────┴─────┴──────────────────────────────────────────────────────────────┘

  Aggregate: 64 → 58 / 100.

  Static audit found token-enforcement bugs. Live audit found bigger problems — the public-facing surfaces don't reflect the codebase's actual taste. The login screen is
  good. The hero, the 404, the consent banner, and the missing /pricing collectively undersell what the app is.

  ---
  Recommended Sequence

  1. Restyle home hero (frontend/src/app/page.tsx) — asymmetric layout, real product imagery, no eyebrow pill. Highest visible impact.
  2. Decide on /pricing — ship the route or delete the 404 from search index. Add a real not-found.tsx.
  3. Reconcile primary-button color between home and login.
  4. Mobile login brand strip (≤ lg:).
  5. Cookie banner refinement — auth-page suppression + 320px height fix.
  6. Then run the static audit's codemod for raw color tokens (the 327 violations) — high-volume, mechanical.
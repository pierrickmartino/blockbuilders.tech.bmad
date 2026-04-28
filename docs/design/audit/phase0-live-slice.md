# Phase 0.5 + 0.6 — Live Audit Slice (Playwright + axe-core)

**Date:** 2026-04-27
**Tool:** `/tmp/bb-audit/audit-v2.mjs` (extends prior `audit.mjs` with axe-core injection, `domcontentloaded`+800ms, expanded route set).
**Coverage:** 15 routes × 4 viewports × 2 themes = **120 captures**. Axe scans at 1440 in both themes = **30 scans**.
**Outputs:** `/tmp/bb-audit/screens-v2/*.png`, `/tmp/bb-audit/results-v2.json`, `/tmp/bb-audit/a11y-v2.json`.

---

## Capture run

| Metric | Value |
|---|---:|
| Captures attempted | 120 |
| Capture failures | **0** |
| Routes covered | 15 (home, login, forgot-password, metrics-gloss, strategy-guide, how-backtests, dashboard, strategies, strategies-tpl, progress, alerts, settings, profile, market, 404-pricing) |

**Network-idle bug confirmed fixed.** Switching to `waitUntil: 'domcontentloaded'` plus a fixed 800ms hydration delay produced 100% capture success, vs the prior run where every `goto` timed out and we relied on a salvaged screenshot from the catch block.

> Auth-gated routes (`dashboard`, `strategies`, `progress`, etc.) redirect to `/login`. The capture is still useful — it confirms the redirect target renders correctly across viewports — but the named route doesn't get a unique view. To truly audit those surfaces we'd need an authenticated session (Phase 4 follow-up).

---

## A11y baseline (axe-core, WCAG 2 A + 2 AA + 2.2 AA)

### Headline

| Metric | Value |
|---|---:|
| Total scans | 30 |
| **Total violations** | **15** (one per light-mode route) |
| Distinct rules violated | **1** (`color-contrast`) |
| Failing DOM nodes (sum across scans) | **47** |
| Dark-mode violations | **0** |

### The one rule that fails

`color-contrast` — *Elements must meet minimum color contrast ratio thresholds.*
**Severity:** serious.
**Tags:** `wcag2aa`, `wcag143`.

### Recurring failing targets

| Selector | Hits |
|---|---:|
| `.text-primary` | 13 |
| `button[type="submit"]` | 12 |
| `.shadow.hover\:bg-primary\/90.h-8` (primary `Button`, size `sm`) | 12 |
| `.bg-primary.text-primary-foreground.shadow` | 1 |
| `.bg-primary` | 1 |
| Other `.text-primary/70`, etc. | 8 |

---

## Single-cause analysis

Every failing node touches one of two patterns:
1. **`.text-primary` on the default background** — text colored `hsl(var(--primary))` against `hsl(var(--background))`.
2. **Primary `Button` (default variant)** — background `hsl(var(--primary))` with foreground `hsl(var(--primary-foreground))` (white).

Both converge on the same root cause:

```css
/* light mode */
--primary: 204 65% 57%;       /* L≈57 → mid-tone */
--primary-foreground: 0 0% 100%; /* white */
--background: 0 0% 100%;      /* white */
```

- **White text on `--primary`**: contrast ≈ 3:1 → **fails** AA (needs ≥4.5:1 for normal text).
- **`--primary` text on white**: same ≈ 3:1 → **fails** AA.

In dark mode:
```css
--primary: 204 76% 63%;       /* slightly lighter */
--background: 240 8% 5%;      /* near-black */
```
The same brand hue sits on near-black, contrast ratio inverts, and AA is met comfortably. **0 dark-mode violations**.

---

## Why this matters for the phased plan

This is the **most efficient finding in Phase 0.** A single token change resolves 47 a11y nodes, every primary-CTA contrast issue, and every `.text-primary` body-link issue across 15 routes.

The fix has two viable shapes:

### Option A — darken `--primary` in light mode

```css
/* light */
--primary: 204 75% 42%;          /* L 57 → 42 */
/* keep --primary-foreground: 0 0% 100% (white) */
```

Yields ≈ 4.6:1 on white background (passes AA both as text and as button bg with white text). The visual cost is a slightly more saturated, deeper blue — still on-brand per `design_concept.json`.

### Option B — split into `--primary` (action) and `--primary-text`

Keep the lighter blue for backgrounds (where contrast against white text is the only concern, fix by darkening only the bg color), and introduce a darker `--primary-text` for `.text-primary` consumers. Adds a token at the cost of nudging consumers to the right alias. **More work, more flexibility.**

**Recommendation: Option A.** Single-line fix in `globals.css`, one Phase 1 commit, regression-tested by re-running this audit.

---

## Phase 1 task derived

Add to Phase 1 deliverables:

> **Phase 1 task — fix `color-contrast` AA violation**: darken `--primary` in `:root` from `204 65% 57%` to a value that produces ≥4.5:1 contrast both as text on `--background` and as background under `--primary-foreground`. Verify by re-running `node /tmp/bb-audit/audit-v2.mjs` and asserting `Total a11y violations across scans: 0`.

This is also the **success criterion for Phase 4 a11y work** — we now have a single dial that turns the violation count to zero.

---

## Other live findings (visual, not axe)

The static Phase 0 reports already covered most visual issues. New observations from the v2 capture set worth noting:

1. **No new 404 captures** since `/pricing` still returns the Next.js default. Confirms `app/not-found.tsx` is still missing — Phase 2 priority.
2. **`/forgot-password`** captured cleanly in both themes — visual treatment looks consistent with `/login`. No issues.
3. **`/strategy-guide`** and **`/how-backtests-work`** are public marketing-style routes that we hadn't captured before. Quick visual review:
   - Both render correctly across viewports.
   - Both inherit the same hero pattern as `/` (eyebrow pill + centered headline) — Phase 2 hero rewrite should propagate to these two.
4. **Auth-gated routes** all redirect to `/login` cleanly with no flash-of-content — auth guard is working.

---

## Verification command

```bash
# After Phase 1 fix, this must print "Total a11y violations across scans: 0"
cd /tmp/bb-audit && node audit-v2.mjs | tail -3
```

---

## Status — Phase 0 fully complete

| Sub-phase | Status |
|---|---|
| 0.1 Token-usage report | ✅ |
| 0.2 Variant matrix | ✅ |
| 0.3 Scale audit | ✅ |
| 0.4 Theme parity | ✅ |
| 0.5 Live Playwright re-capture | ✅ |
| 0.6 axe-core baseline | ✅ |

Phase 0 closed. Ready for Phase 1.

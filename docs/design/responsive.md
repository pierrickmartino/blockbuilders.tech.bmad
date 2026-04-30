# Responsive Patterns

**Companion to:** `docs/design/tokens.md`
**Verified by:** `/tmp/bb-audit/audit-v2.mjs` (captures at 320 / 375 / 768 / 1024 / 1440 / 1920 × light/dark)

This is the canonical playbook for layout, sizing, and breakpoint behavior in the frontend. If your code disagrees with this doc, the code is the bug.

---

## Breakpoints

We follow Tailwind's defaults. Naming and intent:

| Token | Min width | Class prefix | Intent |
|---|---:|---|---|
| (mobile) | 0 | _none_ | Default styles. Mobile-first. |
| `sm` | 640px | `sm:` | Large phone / small tablet portrait. |
| `md` | 768px | `md:` | Tablet portrait. |
| `lg` | 1024px | `lg:` | Tablet landscape / small laptop. |
| `xl` | 1280px | `xl:` | Standard desktop. |
| `2xl` | 1536px | `2xl:` | Large desktop. |

**Rule:** style mobile first, add breakpoint prefixes for upward overrides. Avoid `max-*:` variants unless writing a true mobile-only style.

---

## Container widths

| Surface | Class |
|---|---|
| Marketing / public pages | `container mx-auto max-w-6xl px-4 md:px-6` |
| App content pages | `container mx-auto max-w-6xl p-4 md:p-6` |
| Forms / focused single-task pages | `mx-auto max-w-md px-4` (mobile) → `max-w-[400px]` (desktop) |
| Hero & long-form sections | `container mx-auto max-w-6xl px-4 md:px-6` |

The `max-w-6xl` (72rem / 1152px) bound is the project default. Don't widen it without a real reason — wide content on wide screens reads poorly.

---

## Section padding (vertical rhythm)

**Use the section-padding tokens, not ad-hoc combos.**

```tsx
// ✓ Canonical between-section spacing
<section className="py-section">…</section>

// ✓ In-card or sub-section spacing
<section className="py-section-tight">…</section>

// ✗ Ad-hoc combinatorial drift
<section className="py-12 md:py-16 lg:py-20">…</section>
```

The tokens are defined in `globals.css`:

```css
--space-section:        clamp(3rem, 2.4rem + 3vw, 6rem);   /* ~48–96px */
--space-section-tight:  clamp(1.5rem, 1.2rem + 1.5vw, 3rem); /* ~24–48px */
```

A `clamp()` value scales smoothly across viewports without stepwise breakpoint jumps. The min/max bounds keep mobile from being cramped and desktop from feeling vacuous.

---

## Tables → cards transformation

Below `md:` (768px), data-dense tables should transform into a stacked card-per-row layout. This is the rule:

| Width | Pattern |
|---|---|
| `< md` (mobile) | Stacked cards. Each row = a `<Card variant="flat">` with key/value pairs in a `<dl>`. Drop tabular columns; keep critical value as a heading. |
| `≥ md` (tablet+) | Real `<Table>` from `@/components/ui/table`. |

Why a hard rule: horizontal scrolling tables on mobile are a disaster — users can't see column headers and values at the same time. The card-per-row pattern keeps every value labeled.

**Implementation pattern:**

```tsx
{rows.map((row) => (
  <div key={row.id} className="border-b border-border md:contents">
    {/* Mobile card */}
    <div className="md:hidden p-4 space-y-2">
      <div className="font-semibold">{row.title}</div>
      <dl className="text-sm text-muted-foreground space-y-1">
        <div className="flex justify-between"><dt>Status</dt><dd>{row.status}</dd></div>
        …
      </dl>
    </div>
    {/* Tablet+ row */}
    <tr className="hidden md:table-row">
      <td>{row.title}</td>
      <td>{row.status}</td>
      …
    </tr>
  </div>
))}
```

The `md:contents` wrapper neutralizes the outer `<div>` so the inner `<tr>` participates in the parent `<tbody>` grid at desktop widths.

---

## Dialog vs Sheet — pick one per interaction class

| Interaction | Mobile (< md) | Desktop (≥ md) |
|---|---|---|
| Confirmation / decision | `Dialog` (centered, dimmed bg) | `Dialog` |
| Long form / wizard step | `Sheet side="bottom"` (full-width drawer) | `Dialog` (max-w-2xl) |
| Selector / filter / settings panel | `Sheet side="bottom"` | `Popover` or `Sheet side="right"` |
| Detail view / inspector | `Sheet side="bottom"` | `Sheet side="right"` (drawer) |
| Image / media preview | `Dialog` (full-screen on mobile) | `Dialog` |

**Rule:** don't put a long form in a `Dialog` on mobile — the keyboard pushes the dialog around and content can be clipped above the fold. Use `Sheet side="bottom"` instead.

**Don't mix:** if a feature has multiple modal-like interactions, pick one pattern (`Dialog` or `Sheet`) for the whole feature. Switching between them disorients users.

---

## Touch-target sizing

Three tiers:

| Size | Min height/width | Use |
|---|---:|---|
| **Default** | `h-9` (36px) | Desktop-primary contexts. Meets WCAG 2.2 AA `target-size-minimum` (24×24). |
| **Touch** | `h-11` (44px) | Mobile-primary CTAs. Meets iOS HIG and WCAG 2.2 AAA `target-size`. |
| **Large** | `h-12` (48px) | Mobile-bottom-bar primary action, hero CTA on landing. Material HIG. |

**Button API:**

```tsx
<Button size="default">Cancel</Button>      {/* desktop */}
<Button size="touch">Sign in</Button>        {/* mobile-primary */}
<Button size="icon">…</Button>               {/* desktop icon-only */}
<Button size="icon-touch">…</Button>         {/* mobile icon-only */}
```

**Rule:** any clickable element on a route that must work on mobile (login, mobile nav, mobile bottom bar) uses `size="touch"` or `size="icon-touch"`. Desktop-only inspector controls (canvas controls, dropdown menus) can stay at `default`.

---

## Horizontal overflow — must be zero

The audit script (`audit-v2.mjs`) records `documentElement.scrollWidth` vs `clientWidth` per capture. **Any non-zero count is a bug** — content is wider than its viewport, which means horizontal scrolling on mobile.

Common causes flagged in past audits:
- `whitespace-nowrap` on long content without an ellipsis.
- Large fixed-width images or charts inside narrow containers.
- `min-w-[Npx]` exceeding the smallest viewport.
- Wide tables not transformed to cards (see above).

Check before merging:

```bash
cd /tmp/bb-audit && node audit-v2.mjs | grep "Captures with horizontal overflow"
# Expected: 0
```

---

## Responsive testing matrix

The audit captures at 6 viewports × 2 themes per route. The minimum manual smoke set per surface is:

- **320×800** — small phone, must not overflow.
- **375×812** — iPhone 12+ (most-trafficked mobile).
- **768×1024** — iPad portrait. Tables should be tables here.
- **1440×900** — standard laptop. Hero/asymmetric layouts shine.

If a surface ships without testing all four, treat it as untested.

---

## Forbidden patterns

- **Reaching directly into Tailwind's spacing scale for section padding** — use `py-section` / `py-section-tight`.
- **Tables without a mobile transformation** — every `<Table>` must have a `< md` fallback.
- **Buttons sized smaller than `h-8`** — even desktop buttons must clear 32px (the WCAG 2.2 AA bare minimum is 24×24, but 32px gives headroom for hit-target growth without rebuild).
- **Fixed-pixel widths over 240px on mobile-rendered components** — they will overflow on 320×800.
- **Horizontal scroll on a primary content area** — never. Lateral scroll is OK only for explicit affordances (carousel, code block).

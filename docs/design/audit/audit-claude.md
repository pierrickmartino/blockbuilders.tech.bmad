# UX Audit — Blockbuilders

Scope: navigation shell (`app-sidebar`, `site-header`), Dashboard, Strategies list, Strategy editor shell, app layout. Audit is based on source inspection, not a live walkthrough. Findings are prioritized by likely impact on a design-literate audience, not implementation cost.

## Summary

| Severity | Count | Theme |
|---|---|---|
| P0 — Critical friction | 3 | Silent failure, navigation feedback gaps, custom-control affordances |
| P1 — High | 6 | Feedback states, filter discoverability, breadcrumb fidelity, empty-state quality |
| P2 — Medium | 6 | Polish, consistency, micro-interactions |
| P3 — Low | 3 | Nice-to-haves |

---

## P0 — Critical

### 1. Dashboard silently swallows the primary fetch error
**Where:** `frontend/src/app/(app)/dashboard/page.tsx:47-51`
```ts
apiFetch<Strategy[]>("/strategies/")
  .then(setStrategies)
  .catch(() => {})
  .finally(() => setIsLoading(false));
```
**Problem:** If the strategies request fails, the dashboard transitions from skeleton to an empty-state ("No strategies yet") with a "Create Strategy" CTA — identical to a legitimate zero-strategies user. A user who already has strategies sees a screen telling them they have none and suggesting they start over.
**Why it matters:** Silent failures erode trust in a tool whose core promise is "your workspace is ready." For a design-focused audience, seeing their own work disappear without acknowledgement is the worst possible first impression. It also violates the project principle: *"warn users, never silently fail."*
**Fix:** Set an `error` state in `.catch` and render the same destructive banner already used in the file (line 183). Differentiate empty vs. errored states in the "Your Strategies" section — on error, show a retry button and keep the skeleton shape, not an empty-state illustration.

### 2. Recent Backtests link wraps a Card but the stats-row "Recent Backtests" card is not clickable
**Where:** `dashboard/page.tsx:153-165` vs `246-291`
**Problem:** The top stats grid presents three visually identical cards. Two are decorative (Strategies count, Recent Backtests count), one is an action (New Strategy → `/strategies`). Only the third has a hover affordance and arrow. The other two *look* identical but do nothing on click. A designer scanning affordances will try all three.
**Why it matters:** Inconsistent clickability is the classic "mystery meat" affordance failure — users stop trusting what's interactive. The count cards beg to be drill-downs ("show me those 12 strategies", "show me the 5 recent backtests").
**Fix:** Either (a) make the first two cards links too (Strategies → `/strategies`, Recent Backtests → scroll to section or `/strategies` with a filter), or (b) visually de-emphasize them (no hover shadow, different card variant) so they read as static metrics. Option (a) is preferable.

### 3. Tag multi-select uses a native `<input type="checkbox">` *inside* a Radix `Select`
**Where:** `strategies/page.tsx:744-785`
**Problem:** A shadcn `Select` is being coerced into a multi-select by stopping event propagation on custom `<div>` children and rendering checkboxes whose `onChange` is a no-op. The trigger value displays "N tag(s)" but the Select's own value stays `"selected"`. Keyboard navigation, ARIA semantics, and the default Select close-on-choose behavior are all broken or inconsistent.
**Why it matters:** This is the filter that lets a power user narrow a long strategy list — exactly the surface a design-literate user will scrutinize. Non-standard selection widgets feel broken even when they "work" with a mouse.
**Fix:** Replace with a proper popover + command/listbox (shadcn `Popover` + `Command` with multi-select), or a labeled dropdown checkbox menu. Preserve focus management and escape-to-close. Also surface active tag chips inline below the filter bar so selected tags are visible without re-opening the menu.

---

## P1 — High

### 4. Sidebar active state uses `pathname === item.url` for `/dashboard` but `startsWith` for others — inconsistent and fragile
**Where:** `app-sidebar.tsx:116`
```ts
const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url + "/"))
```
**Problem:** `/dashboard/anything` would no longer highlight the Dashboard item. More importantly, deep routes like `/strategies/abc/backtest` highlight "Strategies" (good), but there is no visual treatment differentiating "I'm *inside* Strategies" vs "I'm *on* the Strategies list" — the active bar looks identical.
**Why it matters:** Users lose the "where am I in the hierarchy" signal. Combined with a one-level breadcrumb (see #5), they have to read the page title to orient themselves.
**Fix:** Normalize to `startsWith` for all items including Dashboard (treat `/dashboard` as an exact match only). Consider a softer "ancestor active" state — e.g., a fainter accent bar — when the user is inside a child route.

### 5. Breadcrumb is effectively static — always "Blockbuilders / {pageTitle}"
**Where:** `site-header.tsx:18-68`
**Problem:** A hardcoded `pageTitles` map produces two-segment breadcrumbs even on deep routes. `/strategies/abc/backtest` renders "Blockbuilders / Backtest Results" with no link back to the parent strategy or to `/strategies`. This is a breadcrumb in markup only.
**Why it matters:** On the strategy detail and backtest views — the two screens where a user most needs to navigate up or across siblings — the breadcrumb is useless. The back-button becomes the only way home.
**Fix:** Build the breadcrumb from the pathname segments, resolving `{id}` segments to the strategy name (already fetched on those pages — lift via context or layout data). Each intermediate segment should be a real link: `Blockbuilders / Strategies / {Strategy Name} / Backtest`.

### 6. Dashboard "Learn about assumptions" link is buried under welcome copy
**Where:** `dashboard/page.tsx:127-134`
**Problem:** A critical epistemic link ("know the limits of the math we're showing you") is a small primary-tinted inline link inside a muted paragraph. For a product whose trust hinges on disclosing backtest assumptions, this is low-visibility.
**Why it matters:** Design-literate users often dig into methodology before they trust numbers. Hiding this as a filler link suggests the team is hiding it.
**Fix:** Either promote to a small info chip/badge near the Recent Backtests section ("These numbers assume X — learn more"), or place a persistent "Backtest assumptions" link in the page footer/header. Context-attach it to the data, not the greeting.

### 7. Filter bar has no result counter and no "applied filters" chips
**Where:** `strategies/page.tsx:706-802`
**Problem:** After a user applies three filters they see a smaller table with no indication of (a) how many results vs. total, (b) which specific filters are active at a glance. The only way to inspect an active filter is to open the Select. The "Clear filters" button only appears once something is applied — good — but it does not tell the user *what* it will clear.
**Why it matters:** Filtering a strategy list is a repeated daily task. Lack of feedback creates "why am I not seeing strategy X?" moments.
**Fix:** Under the filter row, show `Showing {n} of {total}` and render a row of removable chips for each active filter (Asset: BTC/USDT ✕, Performance: Positive ✕, Tags: Momentum ✕). Chips double as visible state and as direct remove affordances.

### 8. Empty state for "no matches" offers no recovery action
**Where:** `strategies/page.tsx:837-858`
**Problem:** When filters produce zero results, the empty state says "No strategies match your search or filters." but only shows the "Create Strategy" button when there are truly zero strategies. In the "no matches" branch there is no CTA at all — the user must scroll back up to find the Clear filters button (which is itself only visible if filters are applied).
**Why it matters:** Dead-end empty states are a classic frustration point.
**Fix:** In the "no matches" branch, render a "Clear filters" primary action right inside the empty card.

### 9. Bulk action bar is "sticky top-0" but sits *below* the site header in the document flow
**Where:** `strategies/page.tsx:804-835`
**Problem:** `sticky top-0` inside a scroll container whose offset parent is below a 56px header means the sticky bar will stick *under* the header if the page scroll container is `window`, or will pin at top-0 of the inset — either way inconsistent with the header's position. Because the layout in `(app)/layout.tsx` does not obviously create a scoped scroll container, the sticky bar will likely ride the page scroll and be partially obscured by the header.
**Why it matters:** Bulk actions are destructive (Delete, Archive) — they must remain fully visible and reachable while the user scrolls the table to pick items.
**Fix:** Set `top-14` (matching header height) or pin the bulk bar to the bottom of the viewport as a floating action bar — the latter is stronger for multi-select tables and is the prevailing pattern (Gmail, Linear).

---

## P2 — Medium

### 10. Native checkboxes throughout the strategies table (select-all, per-row, "Show archived")
**Where:** `strategies/page.tsx:696, 867, 931`
**Problem:** The rest of the app uses shadcn `Checkbox` but the selection and "Show archived" use raw `<input type="checkbox">`. They won't match the design-system checkbox look, will lack the focus ring defined in the system, and — for a design-focused audience — will look like an unfinished screen.
**Fix:** Swap for `@/components/ui/checkbox`. Already installed per `frontend/CLAUDE.md`.

### 11. Sort indicator uses Unicode arrows (`↕ ↑ ↓`)
**Where:** `strategies/page.tsx:606-609`
**Problem:** Unicode glyphs render at inconsistent sizes and weights across platforms, won't align with the Lucide iconography used everywhere else, and don't respect the `size-4` rhythm.
**Fix:** Use `ArrowUpDown`, `ArrowUp`, `ArrowDown` from `lucide-react` at `h-3.5 w-3.5` to match existing inline-icon sizing.

### 12. Clone action on dashboard has no success confirmation
**Where:** `dashboard/page.tsx:100-114`
**Problem:** On success, the strategies array silently refreshes. The user sees the button flip back from "Cloning..." to "Clone" with no toast, no scroll to the new row, no highlight. They have to guess whether it worked.
**Why it matters:** Cloning is a destructive-adjacent action (it creates state). Silent success is ambiguous.
**Fix:** Show a toast ("Strategy cloned as '{name} (copy)'") with an Undo affordance if feasible, or at minimum a "View" link that jumps to the clone.

### 13. The active-item indicator (`absolute left-0` accent bar) is rendered inside the link, not the menu button
**Where:** `app-sidebar.tsx:125-127`
**Problem:** Because the `Link` is the direct child of `SidebarMenuButton` (`asChild`), the bar sits inside a flex-item and may shift horizontally as text length changes on hover/focus. More importantly, focus-visible ring will wrap the bar with the link — fine, but the bar won't persist when the button is pressed/active in certain states.
**Fix:** Lift the accent bar to the `SidebarMenuItem` wrapper using absolute positioning relative to the item (the item needs `relative`). Cleaner visual and keeps the link content unaffected.

### 14. "Recently Viewed" and "Your Strategies" sections can show near-identical content
**Where:** `dashboard/page.tsx:190-230` and `298-400`
**Problem:** Both sections list strategies as cards. "Recently Viewed" is a 3-col grid, "Your Strategies" is a vertical stack of the 5 most recent *by update time*. For a user with only a few strategies, these lists overlap substantially.
**Why it matters:** Duplication dilutes the value of both surfaces and increases cognitive load.
**Fix:** Dedupe — exclude strategies already in "Recently Viewed" from "Your Strategies", or collapse the two into a single "Your Strategies" with a toggle (Recent / All). Alternatively, only show "Recently Viewed" when it contains items *not* in the top-5 most-recently-edited.

### 15. Loading skeletons don't match final layouts closely enough
**Where:** `strategies/page.tsx:611-635` and `dashboard/page.tsx:314-327`
**Problem:** The skeleton on the strategies page shows card rows even though the final layout is a dense table on desktop. The layout shift from skeleton → table is visually abrupt.
**Fix:** Render a table skeleton on `md:` screens and card skeletons on mobile, matching the real responsive split at line 862.

### 16. Filter dropdowns render with raw `<SelectValue />` and no placeholder fallback
**Where:** `strategies/page.tsx:708-742`
**Problem:** The Select triggers rely on the default value ("all") to populate the trigger, but none has a `placeholder`. If a `value` ever becomes undefined (e.g., via URL state in the future), the trigger renders empty with no label. Also, "All Assets / All Performance / All Runs" forces the user to parse three similar triggers to know which is which.
**Fix:** Add a visible label above each Select (or a leading icon/prefix inside the trigger: e.g., "Asset: All"). This also improves scannability when filters *are* applied.

---

## P3 — Low

### 17. Welcome message uses `user.email.split("@")[0]` as display name
**Where:** `dashboard/page.tsx:117`
**Problem:** For `john.doe@example.com` this greets "Welcome back, john.doe" — the dot reads as awkward. No fallback for users with actual profile names.
**Fix:** Prefer `user.name` if available; otherwise `split("@")[0].replace(/[._-]/g, " ")` titlecased.

### 18. Sidebar user dropdown opens only upward (`side="top"`), no profile preview
**Where:** `app-sidebar.tsx:183-202`
**Problem:** The dropdown contains only "Profile" and "Log out" — yet users in this type of app expect plan/usage info, theme toggle, and settings here. They'll bounce between the sidebar footer and `/profile`/`/settings` looking for things.
**Fix:** Add Settings, Theme toggle, and a small plan/credits indicator to the dropdown. Low effort, high density payoff.

### 19. Transition durations vary between `duration-150` and `duration-200` for similar interactions
**Where:** multiple (e.g. sidebar `duration-150`, dashboard cards `duration-200`, filter bar no explicit duration)
**Problem:** Minor but noticeable inconsistency for design-critical users. `frontend/CLAUDE.md` actually specifies 150ms for clicks/toggles.
**Fix:** Standardize hover/press transitions at 150ms per the design system; reserve 200ms for dropdowns/modals.

---

## Strengths

- **Solid typography hierarchy** and consistent use of `tracking-tight` / `tabular-nums` for numeric data — the right call for a metrics-heavy product.
- **Semantic color tokens** (`text-muted-foreground`, `bg-primary/10`) applied consistently with dark-mode counterparts — the theme work is clean.
- **Good empty-state illustration pattern** (icon-in-circle + heading + helper + CTA) is reusable and warm.
- **Skeleton states exist** on the main fetch paths — many products omit these entirely.
- **Sidebar accent-bar active indicator** is a pleasant, understated touch that beats heavy background fills.
- **Bulk action result banner** (success/partial/error with retained failed IDs) is a thoughtful pattern — partial failures are handled rather than hidden.
- **Responsive table → card split** on the strategies list is executed properly (not just `overflow-x-auto` punt).
- **Import flow validates client-side first** with specific error messages, before the server round-trip — good friction economics.

---

## Recommended next actions (in priority order)

1. Fix the dashboard silent-fetch-failure (#1) — one-line change, outsized trust impact.
2. Make the breadcrumb real (#5) and the sidebar active rule consistent (#4) — orientation is the highest-leverage nav work.
3. Replace the tag multi-select hack (#3) — it's the weakest interaction on the most-used screen.
4. Add filter chips + result counter (#7) and fix the "no matches" dead-end (#8).
5. Decide the stats-card clickability contract (#2) — pick one and apply it consistently.

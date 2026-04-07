# UX Design Audit Report

**Scope:** Dashboard landing page
**Source:** `frontend/src/app/(app)/dashboard/page.tsx`
**Interface type:** Dashboard (workspace home for a no-code crypto strategy lab)
**Limitations:** Evaluating a single page in isolation. Shared layout, auth shell, and design tokens (`globals.css`, `tailwind.config.ts`) were not re-read this session — findings about contrast/states are based on classes used here.

## How to Read This Report
Findings are rated 0–4 (4 = users can't complete tasks, 1 = cosmetic). Each references a usability principle. Most impactful first.

## Summary

| Severity | Count |
|---|---|
| 4 - Catastrophe | 0 |
| 3 - Major | 4 |
| 2 - Minor | 7 |
| 1 - Cosmetic | 2 |
| **Total** | **13** |

## Quick Wins
1. Silent fetch failure on `/strategies/` (Sev 3) — surface the error instead of swallowing it.
2. Invalid nested `<a>` in "Recent Backtests" / "Your Strategies" rows (Sev 3) — restructure card so the link doesn't wrap interactive children.
3. Clone button has no success confirmation (Sev 3) — toast or inline "Cloned ✓" + scroll/highlight new item.
4. Stat cards show `recentBacktestsData.length` labeled "Recent Backtests" but it only counts items still resolvable from localStorage (Sev 3) — relabel or fetch the real count.

---

## Findings

### [Severity 3] Fetch errors are silently swallowed
- **Principle:** 1 Visibility of System Status, 9 Error Recovery
- **Location:** `page.tsx:47-51`, `:61-75`, `:81-97`
- **Issue:** `apiFetch("/strategies/").catch(() => {})` — every recent-strategy and recent-backtest fetch also discards rejections. On failure the page just shows "0 strategies / no recents" with no error and no retry.
- **User impact:** A user whose session expired or whose backend is down sees an empty workspace and may think their strategies were deleted. They have no way to recover except a hard reload.
- **Fix:** Set the existing `error` state from these catches; render an inline alert with a "Retry" button. Distinguish "empty" from "failed to load."

### [Severity 3] Invalid nested interactive elements (`<a>` inside `<a>` / button inside `<a>`)
- **Principle:** 13 Accessibility, 4 Consistency and Standards
- **Location:** `page.tsx:167-180`, `:206-227`, `:246-291`, `:348-387`
- **Issue:** Wrapping cards in `<Link>` leads to either nested anchors (when children include `<a>`/Badge link variants) or button-in-anchor situations that fail HTML validation and break keyboard semantics. Screen readers announce confusing nested roles.
- **User impact:** Keyboard/AT users hear duplicated/garbled labels; some browsers strip the inner element, making badges unclickable or stealing focus from the outer card.
- **Fix:** Use a "stretched link" pattern — make the card `relative`, render the Link as an absolutely positioned overlay (`absolute inset-0`) with an `aria-label`, keep badges/buttons as siblings in normal flow with `relative z-10`. Or move the link onto the title only and add `cursor-pointer` + `onClick` handler on the card.

### [Severity 3] Clone action has no success feedback
- **Principle:** 1 Visibility of System Status, 9 Error Recovery
- **Location:** `page.tsx:100-114`, button at `:374-383`
- **Issue:** On success, the button label flips back from "Cloning…" to "Clone" and the list silently refetches. No toast, no scroll-to-new-item, no highlight.
- **User impact:** Users repeatedly click Clone (creating multiple duplicates) because they don't know it worked. They also can't tell where the new strategy went in a long list.
- **Fix:** Show a transient confirmation ("Strategy cloned"), and either scroll the new item into view or insert it at the top of the list with a brief highlight ring.

### [Severity 3] "Recent Backtests" stat is misleading
- **Principle:** 2 Match Between System and Real World, 14 Perceptibility
- **Location:** `page.tsx:159-164`
- **Issue:** Displays `recentBacktestsData.length` — the number of *locally remembered* backtests successfully fetched, not the user's actual recent backtest count. After clearing localStorage or on a new device, it shows 0 even if the user has dozens.
- **User impact:** Users distrust the dashboard metrics — a number that shrinks without anything being deleted feels broken.
- **Fix:** Either rename to "Recently viewed backtests" (matching the section heading) or fetch a real count from the API.

---

### [Severity 2] Two competing "Recently viewed" / "Your Strategies" lists
- **Principle:** 8 Aesthetic and Minimalist Design, 12 Structure
- **Location:** `page.tsx:189-230` and `:298-401`
- **Issue:** "Recently Viewed" (grid of 3) and "Your Strategies" (list of up to 5) often show the same items with the same metadata, just in different layouts. The page becomes a wall of near-duplicate cards.
- **User impact:** Users scan twice, get visual fatigue, and can't tell why the same strategy appears in both places.
- **Fix:** Show "Recently Viewed" only when it actually differs from the latest 5, or merge them into one "Recent strategies" section with a tab/toggle.

### [Severity 2] No empty state for "Recently Viewed" / "Recent Backtests"
- **Principle:** 6 Recognition Over Recall, 1 Visibility of System Status
- **Location:** `page.tsx:190`, `:233`
- **Issue:** Both sections render only when there's data (`length > 0`). A brand-new user sees them disappear with no hint that they exist.
- **User impact:** First-time users miss the discoverability of the "recent" features and don't learn the dashboard's structure.
- **Fix:** Render the section with a one-line empty hint ("Strategies you open will appear here") for first-time users, or show after first visit.

### [Severity 2] Quick-stat cards: only one of three is interactive, with no signifier
- **Principle:** 11 Affordances and Signifiers, 4 Consistency
- **Location:** `page.tsx:139-181`
- **Issue:** "Strategies" and "Recent Backtests" cards have hover-shadow but aren't links; the third ("New Strategy") is a link with an arrow. Users can't tell which cards are clickable until they hover.
- **User impact:** Users either click nothing (assume all three are static) or click everywhere expecting drill-down (the Strategies count *should* link to `/strategies`).
- **Fix:** Make the Strategies and Recent Backtests cards link to their respective list pages (with arrow signifier) — or remove the hover-shadow on the non-interactive ones.

### [Severity 2] Date range arrow uses an `ArrowRight` icon (a clickable signifier) inside non-interactive content
- **Principle:** 11 Affordances and Signifiers
- **Location:** `page.tsx:254`
- **Issue:** `ArrowRight` is used elsewhere on the page as the "go to / view all" signifier, but here it's a separator between two dates. Mixed meaning.
- **User impact:** Users may try to click it expecting navigation; weakens the convention used in the same file.
- **Fix:** Use an en-dash (`–`) or a distinct muted icon (e.g., `Minus`/`MoveRight`), reserving `ArrowRight` for navigation.

### [Severity 2] Loading skeleton doesn't match the rendered list shape
- **Principle:** 1 Visibility of System Status, 4 Consistency
- **Location:** `page.tsx:314-327` vs `:347-387`
- **Issue:** Skeleton shows 3 generic rows with one button placeholder. Real list rows have a name, badge+timeframe, timestamp, **and** a Clone button — the layout shifts noticeably when loaded.
- **User impact:** Layout shift / "things jumping around" feels janky and momentarily disorients users.
- **Fix:** Make the skeleton mirror the real row shape (badge placeholder + timestamp + clone button placeholder).

### [Severity 2] Error banner is not announced to screen readers
- **Principle:** 13 Accessibility, 9 Error Recovery
- **Location:** `page.tsx:183-187`
- **Issue:** Error div has no `role="alert"` / `aria-live`. Screen-reader users won't be notified when clone fails.
- **User impact:** AT users see nothing happen after clicking Clone and assume the action worked.
- **Fix:** Add `role="alert"` (or `aria-live="assertive"`) and an icon for sighted scannability.

### [Severity 2] `.text-gradient-primary` used only on the username
- **Principle:** 8 Aesthetic and Minimalist Design, 14 Perceptibility
- **Location:** `page.tsx:124`
- **Issue:** Gradient text is used once on the page (the username) and nowhere else, drawing the eye to the *least actionable* element. Gradient text also typically has weaker contrast than solid foreground.
- **User impact:** Users' eyes land on their email handle instead of the primary CTA ("New Strategy"). May fail WCAG contrast at small sizes.
- **Fix:** Either drop the gradient (use `text-foreground`) or apply the same accent treatment to a meaningful element (e.g., the "New Strategy" CTA). Verify contrast ≥ 4.5:1.

---

### [Severity 1] "Welcome back, {emailLocalpart}" exposes raw account identifier
- **Principle:** 2 Match Between System and Real World
- **Location:** `page.tsx:117`, `:124`
- **Issue:** `displayName = user?.email?.split("@")[0]` — for `john.doe.42@gmail.com`, the page greets "john.doe.42." Feels system-derived, not human.
- **User impact:** Minor — feels generic/automated. Not a blocker.
- **Fix:** Prefer `user.name` / `user.firstName` if available; fall back to "there" otherwise, or capitalize the local part.

### [Severity 1] "+N more strategies" link uses muted text with no hover affordance beyond color shift
- **Principle:** 11 Affordances and Signifiers
- **Location:** `page.tsx:388-397`
- **Issue:** Looks like helper text rather than a link; underline only on hover.
- **User impact:** Some users won't realize it's clickable.
- **Fix:** Style as a clear text link (subtle underline or chevron at rest).

---

## Strengths

- **Clean information architecture (P12).** Hero → quick stats → recent → list — a sensible top-down dashboard pattern. Section headings with icons aid scanning.
- **Loading states present (P1).** Both the stat counts and the strategies list use Skeleton components rather than blank space or layout jumps.
- **Empty state for the strategies list is well-designed (P6).** The icon, headline, supporting line, and CTA at `:328-345` is a textbook empty state.
- **Tabular numbers + semantic color for backtest results (P14).** `tabular-nums` plus directional arrows + green/red text (with both an icon *and* a color, satisfying P13's "don't rely on color alone") is well done at `:269-287`.
- **Dark-mode classes consistently paired (P4, P13).** Every accent color includes a `dark:` counterpart.
- **Container + responsive grid follow the design system (P4).** `container mx-auto max-w-6xl p-4 md:p-6` and the `sm:grid-cols-3` / `lg:grid-cols-3` breakpoints match `frontend/CLAUDE.md` conventions.

---

## Changelog

### 2026-04-07 — All 13 findings resolved in `frontend/src/app/(app)/dashboard/page.tsx`

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | Fetch errors silently swallowed | 3 | Extracted `loadStrategies` with proper catch that sets `error` + `strategiesLoadFailed`; error banner now shows a Retry button. |
| 2 | Invalid nested `<a>` / button-in-anchor | 3 | Converted Recently Viewed, Recent Backtests, and Your Strategies cards to a **stretched-link pattern**: `relative` Card + absolutely-positioned `<Link>` overlay with `aria-label`; inner badges/buttons sit at `relative z-10`. |
| 3 | Clone action has no success feedback | 3 | Added `successMessage` state with `role="status"` banner and 4-second auto-dismiss after successful clone. |
| 4 | "Recent Backtests" stat is misleading | 3 | Relabeled stat card to **"Recently Viewed Backtests"** to match the underlying data source. |
| 5 | Duplicate Recently Viewed / Your Strategies | 2 | New `recentStrategiesUnique` filter removes items already shown in the latest-5 list. |
| 6 | No empty state for recent sections | 2 | Both sections always render; show "Strategies/Backtests you open will appear here" when loaded empty, skeleton while loading. |
| 7 | Quick-stat card affordances inconsistent | 2 | Removed hover-shadow/group classes from the two non-interactive stat cards so only "New Strategy" signals interactivity. |
| 8 | `ArrowRight` misused as date separator | 2 | Replaced with en-dash (`–`); `ArrowRight` now reserved for navigation. |
| 9 | Skeleton doesn't match real row shape | 2 | Skeleton now mirrors title + badge + timeframe + timestamp + clone button. |
| 10 | Error banner not announced to screen readers | 2 | Added `role="alert"`, `aria-live="assertive"`, and `AlertCircle` icon. |
| 11 | `.text-gradient-primary` only on username | 2 | Replaced with `text-foreground`. |
| 12 | Greeting uses raw email local part | 1 | Added `formatDisplayName` helper that strips digits/separators and title-cases (e.g. `john.doe.42` → "John Doe"). |
| 13 | "+N more strategies" lacks affordance | 1 | Restyled as primary-color link with hover underline and inline arrow. |

**Verification:** `npx tsc --noEmit` and `npx eslint` both pass clean.

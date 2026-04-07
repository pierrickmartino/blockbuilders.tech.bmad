# UX Design Audit Report

**Scope:** Strategy editor page (canvas builder)
**Source:** `frontend/src/app/(app)/strategies/[id]/page.tsx` (1900+ lines)
**Interface type:** Productivity tool — visual strategy editor with canvas, inspector, settings drawer, version history

## How to Read This Report
Findings are rated 0–4 (4 = users can't complete tasks). Each references a usability principle. Top of list = highest impact.

## Summary

| Severity | Count | Fixed | Remaining |
|---|---|---|---|
| 4 - Catastrophe | 0 | 0 | 0 |
| 3 - Major | 4 | 4 | 0 |
| 2 - Minor | 11 | 10 | 1 |
| 1 - Cosmetic | 4 | 4 | 0 |
| **Total** | **19** | **18** | **1** |

## Quick Wins
1. **Add aria-labels to icon-only buttons** (Sev 2) — Back arrow, "more actions", settings gear, tag remove "×" all unlabeled.
2. **Replace native checkboxes/select with shadcn equivalents** (Sev 2) — Mixed input styles violate design system.
3. **Restore "Save" / "Saving…" instead of "…"** (Sev 2) — Top bar collapses to ellipsis, hiding status.

---

## Findings

### [Severity 3] `Cmd/Ctrl+R` hijacks browser refresh to navigate to backtest tab
- **Principle:** H4 Consistency & Standards, H5 Error Prevention, H3 User Control
- **Location:** `page.tsx:935-939`
- **Issue:** Cmd/Ctrl+R is the universal browser-refresh shortcut. The editor calls `e.preventDefault()` and instead navigates to `/backtest`.
- **User impact:** Users instinctively hit Cmd+R to refresh and are unexpectedly thrown out of the canvas. If they were mid-edit and the autosave hasn't fired (10s window), the navigation feels like data loss. This breaks a deeply learned web convention.
- **Fix:** Use a different chord (e.g., Cmd+Enter, Cmd+B for "backtest") and surface it in the shortcuts modal. Never override Cmd+R.

### [Severity 3] Form labels in Settings sheet not associated with their inputs
- **Principle:** H13 Accessibility (WCAG 1.3.1, 3.3.2)
- **Location:** `page.tsx:1489` (Threshold), `:1503` (Alert Triggers)
- **Issue:** `<label className="text-sm">Performance Drop Threshold (%)</label>` has no `htmlFor`; the `<Input>` below has no `id`. Same for "Alert Triggers".
- **User impact:** Screen-reader users hear an unlabeled number field. Sighted users with motor impairments lose the larger click-to-focus target. Form analytics tools also fail.
- **Fix:** Add matching `id`/`htmlFor`. Apply consistently across all settings fields.

### [Severity 3] Touch targets in top toolbar are 28px (h-7) — below 44px minimum
- **Principle:** H11 Affordances/Signifiers, H13 Accessibility (WCAG 2.5.5)
- **Location:** `page.tsx:1125-1141` (name input + OK/Cancel), and `h-8` buttons throughout the action cluster
- **Issue:** `h-7` (~28px) and `h-8` (~32px) controls fall below the 44×44px touch target minimum. The "OK"/"Cancel" buttons during name editing are particularly small and crowded.
- **User impact:** Mobile users mis-tap, especially the inline name save/cancel which sits beside the back arrow. On a phone, this is the difference between renaming and bouncing back to the list.
- **Fix:** Use `h-9`/`h-10` on mobile (`h-9 sm:h-8`), increase tap spacing, or wrap small buttons in a larger hit area.

### [Severity 3] Save button collapses to "…" with no live status, especially on mobile
- **Principle:** H1 Visibility of System Status
- **Location:** `page.tsx:1128-1130`, `1212`
- **Issue:** Save button label is `"..."` while saving. On mobile the desktop Save button is hidden entirely; users rely on a tiny autosave indicator.
- **User impact:** Users can't tell whether their save succeeded, failed, or is still in flight. The "saved • 5s ago" string is small and easy to miss after edits. Increases anxiety on a long-form editor where work loss is costly.
- **Fix:** Use `"Saving…"` text + spinner, surface a persistent "Unsaved changes" indicator when nodes diverge from the last snapshot, and show the save button on mobile.

---

### [Severity 2] Hard-coded color values bypass design tokens
- **Principle:** H4 Consistency & Standards
- **Location:** `page.tsx:1091` (`text-blue-600 hover:text-blue-800`), `1164` (`bg-primary/10`), `1189` (`text-green-600`), `1360` (`bg-green-50 text-green-600`), `1379` (`bg-blue-50 text-blue-700`), `1415` (`bg-primary/10`)
- **Issue:** `frontend/CLAUDE.md` mandates CSS variables (`--primary`, `--destructive`, etc.) and forbids arbitrary blue/green values. The "Strategy not found" link uses raw `text-blue-600`.
- **User impact:** Theme and dark-mode behave inconsistently across pages; the Signal design system feels stitched together. Future palette changes won't propagate.
- **Fix:** Replace with semantic tokens (`text-primary`, `bg-success/10 text-success`, etc.) and add the success token to globals.css if missing.

### [Severity 2] Native `<input type="checkbox">` and native `<select>` mixed with shadcn primitives
- **Principle:** H4 Consistency
- **Location:** `:1478` (alert-enabled), `:1506` (alert-entry), `:1531` (notify-email), `:1611` (Canvas Mode native `<select>`)
- **Issue:** shadcn `Checkbox` and `Select` are installed (per `frontend/CLAUDE.md`) but the Settings sheet uses raw HTML controls — visually inconsistent with the rest of the app, missing focus rings, no dark-mode tuning.
- **User impact:** Form feels "half-built." Keyboard focus state is the OS default, not the design system's `focus-visible:ring-1 ring-ring`.
- **Fix:** Use `<Checkbox>` and shadcn `<Select>`.

### [Severity 2] Icon-only buttons without accessible names
- **Principle:** H13 Accessibility, H11 Signifiers
- **Locations:**
  - `:1106` Back link — only an inline SVG, no `aria-label`/text.
  - `:1273` "More actions" trigger — SVG only, no `sr-only` label.
  - `:1312` Settings gear (desktop) — SVG only.
  - `:1417` Tag remove `×` button — no `aria-label`.
- **User impact:** Screen reader announces "button" with no purpose. Sighted users get a tooltip on the back link only via implicit browser behavior — there isn't one set.
- **Fix:** Add `aria-label`/`sr-only` text. Replace inline SVGs with `lucide-react` icons (already used elsewhere) for consistency.

### [Severity 2] `Cmd+C` / `Cmd+V` hijacked globally outside text inputs
- **Principle:** H4 Consistency & Standards, H7 Flexibility
- **Location:** `page.tsx:956-974`
- **Issue:** Once focus is outside an input, Cmd+C copies *canvas selection* instead of any selected page text. Users selecting node labels or version timestamps to copy will silently copy nothing meaningful.
- **User impact:** Standard "select text → copy" interaction breaks subtly. Hard to diagnose because the OS clipboard *does* update — just with the wrong content.
- **Fix:** Skip the override when `window.getSelection()?.toString()` is non-empty, or scope the listener to the canvas DOM node (`reactFlowRef.current.domNode`).

### [Severity 2] Validation errors and global error share the same red banner; only top-of-page placement
- **Principle:** H9 Error Recovery, H1 Visibility
- **Location:** `page.tsx:1349-1358`
- **Issue:** When validation fails, the bar at the top of the editor reads "Strategy has validation errors. … (3 errors)" but the offending nodes are far below. Each node's error is propagated via `hasError`, which is great, but there's no "jump to first error" affordance and no count link.
- **User impact:** On large canvases users scroll/pan to find red nodes. Cognitive overhead for recovery.
- **Fix:** Make the error count clickable to focus the first failing node; consider summarizing the first 1-2 messages in the banner.

### [Severity 2] "Loading strategy…" is a plain centered string, not a skeleton
- **Principle:** H1 Visibility
- **Location:** `page.tsx:1078-1084`
- **Issue:** Other pages (dashboard, strategies list) use Skeleton placeholders. This editor — the most expensive page — uses unstyled text.
- **User impact:** Inconsistent perceived performance; feels broken on slow networks.
- **Fix:** Use a Skeleton matching the editor shell (top bar + canvas placeholder).

### [Severity 2] Autosave silently creates a new version every 10s of activity
- **Principle:** H1 Visibility, H6 Recognition
- **Location:** `page.tsx:529-549`, `:707-711`
- **Issue:** Each autosave POSTs to `/versions`. The version-history sheet will fill with autosaves indistinguishable from manual saves.
- **User impact:** Recognition collapses — users can't find "the version they meant to save." Pollutes recall.
- **Fix:** Distinguish autosave drafts from explicit versions (server-side `is_auto: true`), or have autosave PATCH a single draft slot.

### [Severity 2] Empty/blank name silently reverts with no feedback
- **Principle:** H9 Error Recovery, H5 Error Prevention
- **Location:** `page.tsx:430-435`
- **Issue:** Submitting an empty name closes the editor and reverts — no message explaining "name required."
- **User impact:** Users wonder if the save worked.
- **Fix:** Inline error: "Name is required."

### [Severity 2] `navigator.clipboard.writeText` without try/catch
- **Principle:** H9 Error Recovery
- **Location:** `:1025`
- **Issue:** Will throw in non-secure contexts/older browsers; the user still sees the "copied" toast.
- **User impact:** False success message → user pastes nothing.
- **Fix:** Wrap in try/catch and set a destructive `saveMessage` on failure.

### [Severity 2] `Sheet` triggers (history, settings, layout) have no visible focus indicator on the SVG-only buttons
- **Principle:** H13 Accessibility
- **Location:** `:1218`, `:1273`, `:1312`
- **Issue:** Without `focus-visible:ring-*` Tailwind classes, keyboard tabbing across the toolbar is invisible.
- **Fix:** Add `focus-visible:ring-1 focus-visible:ring-ring` per design system convention.

---

### [Severity 1] "OK" button label for name save reads as system jargon
- **Principle:** H2 Match Real World
- **Location:** `:1129`
- **Fix:** "Save" / "Cancel".

### [Severity 1] Inline SVGs duplicate icons already in `lucide-react`
- **Principle:** H4 Consistency
- **Location:** Back arrow, dots, gear, history, spinner, check, alert
- **Fix:** Use `ChevronLeft`, `MoreVertical`, `Settings`, `Clock`, `Check`, `AlertCircle` from lucide.

### [Severity 1] `prefers-reduced-motion` not respected on canvas auto-arrange animation (`duration: 300`)
- **Principle:** H7 Flexibility, H13 Accessibility
- **Location:** `:883`
- **Fix:** Set `duration: 0` when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.

### [Severity 1] `<button title="Click to edit name">` is the only signifier the strategy name is editable
- **Principle:** H11 Affordances
- **Location:** `:1144-1151`
- **Fix:** Add a small pencil icon on hover/focus.

---

## Strengths
1. **Solid history & undo system** (`:805-852`) — Cmd+Z/Y supported, snapshot debouncing works. *(H3 User Control, H15 Tolerance)*
2. **Inline node-level validation** — Errors propagate to `hasError` per node so users see issues at the source, not just in a top banner. *(H9 Error Recovery)*
3. **Keyboard shortcut discoverability** — `?` opens a shortcuts modal; the editor avoids being mouse-only. *(H7 Flexibility)*
4. **Mobile-aware layout** — Distinct mobile sheets for Inspector, Block Library, Layout Menu, History, with sensible drawer patterns. *(H12 Structure)*
5. **Autosave with visible status indicator** (saving / saved / failed) on mobile, plus relative timestamp. *(H1 Visibility)* — concept is right; execution needs the polish noted above.
6. **`isInputElement` filter** on the global keydown handler prevents keyboard shortcut interference inside text fields — a common gotcha handled correctly. *(H4 Consistency)*

---

## Changelog

### 2026-04-07 — Improvement pass (18 of 19 findings addressed)

All edits applied to `frontend/src/app/(app)/strategies/[id]/page.tsx`. Verified with `npx tsc --noEmit` and `npm run lint` (clean for the file).

| # | Severity | Finding | Action |
|---|---|---|---|
| 1 | 3 → Fixed | `Cmd/Ctrl+R` hijack | Switched the "run backtest" shortcut to **Cmd/Ctrl+Enter**. Cmd+R now refreshes the page normally. |
| 2 | 3 → Fixed | Unassociated form labels in Settings sheet | Added matching `id`/`htmlFor` for the threshold input; wrapped Alert Triggers in `<fieldset>`/`<legend>`. |
| 3 | 3 → Fixed | Touch targets below 44px in toolbar | Top-bar buttons now `h-9` on mobile, `sm:h-8` on desktop. Back link is a 36×36 hit area. |
| 4 | 3 → Fixed | Save button collapses to "…" | Now reads **"Saving…"** with a `Loader2` spinner. Save button is shown on mobile too; autosave indicator is visible at all viewports. |
| 5 | 2 → Fixed | Hard-coded color values | Replaced raw `text-blue-600`, `bg-blue-50`, `bg-green-50/text-green-600`, `border-green-200` with semantic tokens (`text-primary`, `bg-primary/5`, `border-primary/30`, `text-destructive`). |
| 6 | 2 → Fixed | Native checkbox/select mixed with shadcn | Alert form now uses shadcn `<Checkbox>`; Canvas Mode picker uses shadcn `<Select>`. |
| 7 | 2 → Fixed | Icon-only buttons missing accessible names | Added `aria-label` to back link, more-actions trigger, settings gear, history sheet trigger, and tag remove `×`. |
| 8 | 2 → Fixed | `Cmd+C`/`Cmd+V` hijacked globally | Skip the override when `window.getSelection()?.toString()` is non-empty so normal text copy works. |
| 9 | 2 → Fixed | Validation errors only shown at top of page | Banner now exposes a **"Jump to first error (N)"** button that selects the failing node and centers the canvas on it (respecting `prefers-reduced-motion`). |
| 10 | 2 → Fixed | "Loading strategy…" plain text | Replaced with a skeleton header + spinner. `aria-busy`/`aria-live` set on the loading container. |
| 11 | 2 → **Deferred** | Autosave silently spams version history | Requires a backend schema change (`is_auto: boolean` on the version model) to distinguish autosave drafts from explicit versions. Tracked as a follow-up. |
| 12 | 2 → Fixed | Empty name silently reverts | `handleNameSave` now sets an inline error: "Strategy name is required." |
| 13 | 2 → Fixed | `clipboard.writeText` no try/catch | `handleCopyExplanation` is now async with try/catch and a destructive fallback message. |
| 14 | 2 → Fixed | Sheet triggers missing focus rings | Added `focus-visible:ring-1 focus-visible:ring-ring` to history, more-actions, and settings buttons. |
| 16 | 1 → Fixed | "OK" button label jargon | Renamed to "Save" (with "Saving…" loading state). |
| 17 | 1 → Fixed | Inline SVGs duplicate `lucide-react` icons | Replaced with `ChevronLeft`, `MoreVertical`, `Settings`, `Clock`, `Check`, `AlertCircle`, `Loader2`, `Pencil`. |
| 18 | 1 → Fixed | `prefers-reduced-motion` ignored | Auto-arrange `fitView` and the new "jump to error" `setCenter` both honor `prefers-reduced-motion: reduce`. |
| 19 | 1 → Fixed | No affordance that the strategy name is editable | Editable name now shows a `Pencil` icon on hover/focus and has a descriptive `aria-label`. |

**Deferred follow-up:** Finding #11 — add `is_auto: boolean` (or equivalent) to the strategy version model so autosave drafts can be filtered out of (or visually distinguished in) the version history sheet.


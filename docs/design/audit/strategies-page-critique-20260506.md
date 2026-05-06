# Strategies Page Critique

Date: 2026-05-06
Page: Strategies

## Anti-Patterns Verdict

This does not scream AI-generated. The page uses familiar product UI patterns, restrained layout, clear table mechanics, and real task density. The bigger issue is the opposite: it is competent but a bit generic, and it leaks off-brand color in places that should stay quiet.

Deterministic scan note: I could not run `npx impeccable --json` because `npx` is unavailable in this workspace, and `frontend/node_modules` is not installed. I also could not produce the live `[Human]` overlay without a runnable app. This critique is source-based, using `frontend/src/app/(app)/strategies/page.tsx`, `frontend/src/app/(app)/strategies/new-strategy-modal.tsx`, and the loaded `PRODUCT.md` / `DESIGN.md`.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---:|---:|---|
| 1 | Visibility of System Status | 3 | Loading, error, and bulk states exist, but row actions are quiet |
| 2 | Match System / Real World | 3 | Trader terms mostly fit; `Max DD` is terse |
| 3 | User Control and Freedom | 3 | Clear filters and cancel exist; destructive flow lacks undo |
| 4 | Consistency and Standards | 2 | Off-system purple/blue/green/red badge colors creep into chrome |
| 5 | Error Prevention | 3 | Delete confirmation is solid; import/create validation is basic |
| 6 | Recognition Rather Than Recall | 2 | Many secondary actions hide in menus; filters lack prioritization |
| 7 | Flexibility and Efficiency | 3 | Bulk actions and sortable columns are good power-user affordances |
| 8 | Aesthetic and Minimalist Design | 2 | Too many controls and metrics compete at once |
| 9 | Error Recovery | 3 | Errors are plain and recoverable; some import errors lack next steps |
| 10 | Help and Documentation | 2 | Empty state and wizard help, but table metrics lack contextual help |
| **Total** |  | **26/40** | **Acceptable, needs hierarchy and system discipline** |

## Overall Impression

The page is functional and credible, but it feels more like an admin table than a strategy lab. The single biggest opportunity is to make the strategy list read as a decision surface: which strategies need attention, which are performing, which should be opened next.

## What's Working

The core management workflow is present: search, filters, sorting, import, templates, create, row actions, and bulk actions are all available from one screen.

The empty state is simple and task-oriented at `frontend/src/app/(app)/strategies/page.tsx:952`. It gives a clear first action without over-explaining.

The desktop and mobile representations are thoughtfully split instead of forcing a table onto small screens, especially around `frontend/src/app/(app)/strategies/page.tsx:1140`.

## Priority Issues

### [P1] The table has no opinion about what matters.

Why it matters: traders scan for "what should I trust or open," but the table shows 10 to 12 comparable columns at once: total return, multiple period returns, drawdown, win rate, trades, last run. That creates analysis drag.

Fix: make `Name`, `Total Return`, `Max DD`, and `Last Run` primary. Move period returns into an expandable detail row, comparison popover, or a compact trend cell.

Suggested command: `impeccable distill strategies page`.

### [P1] Off-brand colors weaken the design system.

Why it matters: the design system says canvas category colors should not appear in chrome, but tags use purple badges and monitor uses blue badges at `frontend/src/app/(app)/strategies/page.tsx:1050` and `frontend/src/app/(app)/strategies/page.tsx:1056`. Positive/negative values also rely heavily on raw green/red at `frontend/src/app/(app)/strategies/page.tsx:624`.

Fix: make tags neutral outline chips, make monitoring an icon plus neutral label, and reserve green/red for result values only with text labels or icons where needed.

Suggested command: `impeccable colorize strategies page`.

### [P2] Filters are too visually equal.

Why it matters: search is isolated above a full-width filter slab at `frontend/src/app/(app)/strategies/page.tsx:790`, while asset, performance, last run, tags, archived, and clear filters all compete in one row at `frontend/src/app/(app)/strategies/page.tsx:805`.

Fix: keep search and the two most-used filters visible, tuck archived and tags into "More filters," and show active filter chips below.

Suggested command: `impeccable layout strategies page`.

### [P2] Creation paths are split awkwardly.

Why it matters: the header has `New Strategy`, while the modal hides the guided wizard behind a link-style full-width button at `frontend/src/app/(app)/strategies/new-strategy-modal.tsx:157`. First-timers may choose the blank path accidentally.

Fix: make the creation dialog a two-choice entry: "Guided strategy" and "Blank canvas," with guidance about who each is for.

Suggested command: `impeccable onboard strategies page`.

## Persona Red Flags

Alex, power user: bulk select and sort are good, but row actions are menu-hidden and there are no visible keyboard accelerators for create, search focus, open selected, archive selected.

Jordan, first-timer: "Max DD," period returns, tags, monitor, import, templates, and wizard all appear without enough hierarchy. The first meaningful choice is not obvious.

Sam, accessibility-dependent user: many controls have labels, good. Risk remains around color-coded return meaning and status changes for row-level actions being visually subtle.

## Questions

1. Should this page optimize for quick strategy triage, or broad management of every strategy attribute?
2. Do you want the first pass to fix the top 3 issues only, or also reshape the creation flow?
3. Should tags remain visually colorful, or should they follow the design-system rule and become neutral chrome?

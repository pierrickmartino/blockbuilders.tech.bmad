# frontend/CLAUDE.md

## Commands
```bash
cd frontend
npm run dev          # dev server → localhost:3000
npm run build        # production build
npm run lint         # ESLint (must pass before commit)
npx tsc --noEmit     # TypeScript type-check (must pass before commit)
npm run storybook    # Storybook → localhost:6006
```

## shadcn/ui
- **Installed:** Button, Input, Select, Dialog, Card, Tabs, Badge, DropdownMenu, Checkbox
- Components in `src/components/ui/`; import from `@/components/ui/[component]`
- Use `cn()` from `@/lib/utils` for conditional class names
- Canvas nodes (`components/canvas/`) use **custom Tailwind only — no shadcn/ui**

## Tremor (`@tremor/react`)
- **Use for:** charts (AreaChart, LineChart, BarChart, SparkLineChart), KPIs (Card + Metric + BadgeDelta), Callouts, Tracker
- **Do NOT use for:** canvas nodes, forms, dialogs — keep shadcn/ui primitives there
- Import from `@tremor/react`; shells wrap with Tremor `Card` (override padding via `!p-*`)
- Chart color names use Tremor built-in palette: `blue`, `emerald`, `amber`, `red`, `violet`, `gray` — NOT semantic tokens (primary/success/etc.) because Tremor resolves to `text-${color}-500` classes
- `tremor.*` + `dark-tremor.*` tailwind keys alias our CSS vars (see `tailwind.config.ts`) so Tremor shells (backgrounds, borders, text) match the theme
- Installed with `--legacy-peer-deps` (Tremor 3.18 still declares React 18 peer). Works at runtime on React 19.
- Recharts is **removed** — do not reintroduce; use Tremor charts or (for candlesticks) `lightweight-charts`.

## Design system — read before writing any UI

Two source-of-truth files (relative to this directory):

| File | What it governs |
|---|---|
| `../docs/design_concept.json` | Brand identity, design philosophy (clarity, functional minimalism, progressive disclosure), color strategy, typography strategy |
| `../docs/design-system.json` | Design tokens (colors, spacing, radii, shadows), component specs (buttons, inputs, cards, badges, dialogs, tables), layout patterns, interaction states |

**Before implementing any UI:**
1. Read `../docs/design_concept.json` for the guiding philosophy of the feature area
2. Pull exact token values from `../docs/design-system.json` — never invent new values
3. Cross-check component specs in `../docs/design-system.json` before writing a new button, card, dialog, etc.
4. Keep `src/app/globals.css` and `tailwind.config.ts` as the runtime expression of those tokens — never diverge from them

## Colors
- Use CSS variables defined in `globals.css`: `--primary`, `--secondary`, `--muted`, `--destructive`, etc.
- Canvas node categories (from design system): input (purple), indicator (blue), logic (amber), signal (green), risk (red)
- Feedback: success (green), error (red), warning (yellow), info (blue)
- Always include `dark:` counterpart; never create arbitrary color values
- `!important` allowed only for react-flow handle overrides

## Typography
- Hierarchy (from `../docs/design-system.json`): page title (2xl/bold) → section (lg/semibold) → subsection (base/medium) → body (sm) → small (xs)
- System UI font stack; max 2–3 weights per view

## Spacing & layout
- 4px base scale (per design system); card padding `p-6`; form gaps `space-y-4`
- Page container: `container mx-auto max-w-6xl p-4 md:p-6`
- Mobile-first; breakpoints sm/640px md/768px lg/1024px; no horizontal scroll on core flows

## Component states & animation
- Focus: `focus-visible:ring-1 focus-visible:ring-ring`; Disabled: 50% opacity, no pointer events
- Clicks/toggles 150ms; modals/dropdowns 200ms; never >300ms

## Responsive / mobile
- Charts: responsive + touch-friendly via built-in library options (no custom gesture handling)
- Mobile parameter editing: shadcn/ui `Sheet` on <768px; keep block label visible and live-updating

## Validation & errors
- Inline contextual feedback (on-canvas cues) over hidden panel-only errors
- No new tooltip libraries — use native `title` or existing components

## Storybook
- Official component reference once a feature is implemented
- Reuse exact tokens from `../docs/design-system.json`, `../docs/design_concept.json`, `src/app/globals.css`, and `tailwind.config.ts` — no parallel theme
- Document variants, states, responsive behavior, and dark-mode per story

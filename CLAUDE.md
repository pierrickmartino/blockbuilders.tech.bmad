# CLAUDE.md

Instructions for Claude Code when working in this repository.

---

## 1. Purpose of this repo

You are helping build **Blockbuilders** – a web-based, no-code strategy lab where non-technical retail crypto traders can visually build and backtest simple strategies for a few major pairs.

This repo started with a deliberately constrained MVP. The project is now **iterating beyond MVP**, but we still preserve the MVP’s simplicity-first intent.

Your job is to **ship small, correct increments** while keeping the codebase **as small and simple as possible**.

---

## 2. Non-negotiable principles

When writing or editing code, **always** optimize for:

1. **KISS – Keep It Simple, Stupid**
   - Prefer the most straightforward solution that works.
   - Fewer moving parts, fewer abstractions, fewer dependencies.

2. **YAGNI – You Aren’t Gonna Need It**
   - Do **not** add abstractions, configs, or features “for later”.
   - If it’s not clearly required by the current story or current spec, don’t build it.

3. **Minimal code**
   - The fewer lines of code, the better **as long as readability is OK**.
   - Prefer:
     - Short, focused functions/components.
     - Reuse of existing utilities/components.
     - Early returns over deep nesting.
   - Avoid:
     - Over-engineering.
     - Unnecessary wrappers, indirection, or generic helpers.

4. **Responsive by default**
   - Assume users will access the app on **desktop, tablet, and mobile**.
   - Use Tailwind’s responsive utilities (`sm:`, `md:`, `lg:`…) instead of custom CSS whenever reasonable.
   - Layouts should degrade gracefully to a single column on mobile; no horizontal scroll for core flows.
   - Charts must stay responsive and touch-friendly; prefer built-in chart library options over custom gesture handling.

5. **ESLint & TypeScript correctness**
   - All code must:
     - Pass **ESLint**.
     - Compile in **TypeScript** with no `any` unless *absolutely* necessary.
   - If you introduce a pattern that would require weakening lint or TS rules, don’t do it. Simplify instead.

6. **Data transparency**
   - When a feature depends on market data quality, prefer explicit validation and stored metadata.
   - Warn users about known issues rather than silently hiding or failing.
7. **Plain-language errors**
   - Error messages must be in plain language, tell the user what went wrong, and suggest the next action.
   - Include a relevant help doc link when available.

Whenever you face a trade-off, resolve it in this order:

> **Correctness → Simplicity → Fewer lines → Performance (only if actually needed)**

---

## 3. Phases & spec precedence (MVP vs post-MVP)

This repo is **phase-aware**. The rules depend on which spec is active.

### 3.1. Source of truth (highest priority first)

When there is any conflict, follow this precedence order:

1. `docs/product.md` — **current product truth** (if present)
2. `docs/prd-*.md` — **feature-level PRDs** (if present)
3. `docs/phase2.md` — **current iteration scope** (if present)
4. `docs/mvp.md` — **MVP baseline + guardrails**
5. `docs/mvp_plan.md` — **backlog/story seed** (helpful, not authoritative)


**Doc hygiene checklist:**

When adding or changing features, update `docs/product.md` and create/update related `docs/prd-*.md` and `docs/tst-*.md` files per the table below:

| Feature change | Update sections | Notes |
|---|---|---|
| New PRD/feature | 17.1 (list it) + relevant sections | Also create matching `tst-*.md` |
| Dashboard / strategy list behavior | 9.3, 13 | UI notes + feature summary |
| Recently viewed shortcuts | 9.3, 13 | UI notes + feature summary |
| Strategy list quick actions | 9.3, 13 | Prefer visible one-click buttons; avoid new modals |
| Canvas feature-flags / SmartCanvas | 13, 16.1, 17 | Feature coverage, docs index, changelog |
| Canvas Health Bar (strategy completeness) | 4, 9.3, 13, 16.1, 17 | Include Entry/Exit/Risk states, feature flag, localStorage persistence, docs links |
| Bulk actions on lists | 9.3, 13 | Use checkbox + action dropdown; avoid extra confirmations |
| Backtest visualizations | 5.5, 13 | E.g., seasonality, trade distribution, position analysis |
| Backtest comparison views | 5.4–5.5, 13 | Feature summary |
| Backtest data exports | 5.5, 13 | Feature summary |
| Shareable backtest links | 5.5, 13 | Feature summary |
| Trade explanation detail | 5.5, 13 | Entry/exit breakdowns, indicator overlays, candle highlights |
| Backtest summary metrics | 5.4–5.5, 13, 17.1 | Docs links |
| Backtest narrative summaries | 5.4–5.5, 9.13, 13, 17.1 | Includes tracking events + docs |
| Low-sample / data-confidence warnings | 5.4–5.5, 9.13, 13, 17.1 | Includes tracking events |
| First-run backtest education ("What you learned") | 5.4, 9.4, 13, 17.1 | Docs links |
| Transaction cost analysis | 5.4–5.5, 13 | Feature summary |
| Product analytics / consent | 9.13, 13, 17.1 | Tracking, backend worker analytics, docs |
| Onboarding funnel dashboards | 9.13, 13, 17.1 | Tracking + docs |
| Structured logging / correlation IDs | 9.14, 13, 17.1 | Docs links |
| Canvas UX enhancements | 4, 13 | Feature summary |
| Node display modes (compact/expanded) | 4, 13 | Feature summary |
| Canvas undo/redo | 4, 13 | Feature summary |
| Keyboard shortcuts / help modal | 4, 13 | Feature summary |
| Mobile canvas UX | 4 (subsection), 13 | Keep status current |
| Canvas toolbar / control layout | 4 (mobile subsection), 13 | Feature summary |
| Editor header / autosave / history panel | 4.11, 13 | Feature summary |
| Market overview / price ticker / volatility | 9.9, 13 | UI notes + feature summary |
| Data quality / completeness timeline | 6.4, 13 | Feature summary |
| Backtest data range / start-date warnings | 5.1, 6.4, 13, 17.1 | Docs links |
| Backtest summary personalization (favorites/pinned) | 9.4, 13 | UI notes + feature summary |
| Billing / user tiers / limit overrides / pricing | 2.3–2.4, 13 | Feature summary |
| Public user profiles / followers / badges | 2.3, 13 | Feature summary |
| Indicator palette blocks | 9.3, 13 | Includes indicator or price-derived inputs |
| Digest email preferences | 2.3, 9.5, 11, 13, 17.1 | Global/per-strategy + docs |
| Post-signup/login routing / onboarding | 2.1, 9.2, 9.13, 11, 13, 17.1 | Includes analytics tracking + docs |
| Wizard completion (auto-save + auto-backtest) | 4.4, 9.3, 11, 13, 17.1 | Docs links |
| Wizard escape hatch (open canvas) | 2.1, 4.4, 9.2, 9.13, 11, 13, 17.1 | Link copy, blank-strategy creation, onboarding flag, analytics events, docs |
| Indicator palette visibility (essentials vs all) | 9.3, 13, 17.1 | Default subset, persistence, analytics events, docs |
| Plain-English indicator card names | 9.3, 13, 17.1 | Primary label, subtitle, tooltips, modes, WCAG 2.1 AA, docs |
| Strategy wizard indicator selection | 4.4, 9.3, 13, 17.1 | Essentials-only set, copy, excluded indicators, post-wizard toggle, docs |
| Block library (palette / search / categories / favorites) | 4, 9.3, 13 | Feature summary |
| Block parameter inspector / properties panel | 4, 9.3, 13 | Feature summary |
| Inline parameter popover on block tap | 4, 9.3, 13, 17.1 | Include feature-flag fallback to Inspector panel, popover positioning rules, and docs links |
| Inspector panel as secondary view | 4, 9.3, 13, 17.1 | Cover the popover Details-button handoff, same-block selection continuity, real-time sync between Inspector/popup/canvas label, and shortcut behavior when no popover is open |
| Mobile bottom sheet parameter editing | 4, 9.3, 13, 17.1 | Use existing shadcn/ui Sheet on <768px, keep selected block label visible and live-updating, handle keyboard with visualViewport, and document commit-on-close behavior |
| Canvas auto-layout / connection tidying | 4, 13 | Feature summary |
| Display/theme preferences (dark mode) | 2.3, 9.5, 13 | Feature summary |
| Strategy templates marketplace | 3.7, 13 | + 9.3, 11, 17.1 if content/difficulty/ordering changes |
| Progress dashboard | 9.11, 13 | Feature summary |

**Data & persistence patterns:**

- **Credits/add-ons:** Simple integer fields on user record (avoid extra tables).
- **Strategy metadata:** Non-execution data (e.g., notes) goes under top-level `metadata` key so interpreter ignores it.
- **Import/export:** JSON only, explicit validation, minimal format.
- **Strategy explanations:** Deterministic, derived from block JSON; store under `metadata.explanation` if needed.
- **Strategy tags:** Relational tables linked to strategies/users, **not** inside strategy version JSON.


### 3.2. Default behavior

- If the user explicitly says **“MVP only”**, treat `docs/mvp.md` as the single source of truth.
- Otherwise, assume **post-MVP iteration**, but:
  - You **must not** silently expand scope beyond what the active spec allows.
  - If a request clearly exceeds MVP but there is no Phase 2 spec yet, create/update `docs/phase2.md` **before** implementing large changes.
  - When adding a **new feature**, create/update a matching `docs/prd-<feature>.md` and reflect the change in `docs/product.md`.

> `docs/mvp.md` remains the baseline guardrail document even post-MVP: it anchors simplicity and protects against accidental overbuild.

---

## 4. Product scope guardrails

### 4.1. MVP guardrails (still enforced unless a Phase 2 spec overrides them)

Treat `docs/mvp.md` as the **single source of truth** for MVP scope.

When the user asks for something, check mentally: *is this clearly in scope for the MVP?*

#### In scope (MVP)

High-level, you are allowed to implement / extend:

- **Strategy Canvas (visual builder)**
  - Single asset per strategy.
  - Single timeframe per strategy.
  - Limited indicator set (MA, EMA, RSI, MACD, Bollinger Bands, ATR if included).
  - Simple logic blocks (comparisons, crossovers, AND/OR/NOT).
  - Fixed position sizing and simple TP/SL.

- **Backtesting**
  - OHLCV-based backtests over limited timeframes and pairs.
  - Simple, transparent execution assumptions (fixed fee, simple slippage).
  - Core outputs:
    - Equity curve.
    - Basic performance metrics.
    - Simple trade list.

- **Strategy & Result history**
  - Lists of strategies and backtest runs.
  - Re-opening and re-running past backtests.

- **Basic “Strategy Monitor” via scheduled re-backtests**
  - Scheduled re-runs (e.g. daily) of saved strategies on fresh data.
  - Simple in-app indication of new runs.

- **Auth & accounts**
  - Simple email/password accounts.
  - Private strategies and runs per user.

- **Soft usage limits**
  - Simple numeric caps (max strategies, max backtests/day).

#### Explicitly out of scope (MVP)

Even if it sounds cool or “easy”, **do not** introduce in MVP:

- Real-time trading or brokerage integration.
- True live / tick-by-tick simulated trading.
- Multi-asset or multi-timeframe strategies.
- Strategy marketplace, monetization, or complex sharing mechanics.
- Complex billing, usage-based pricing, or anything beyond simple flat-rate tiers defined in the active spec/PRD.
- Microservices, Kubernetes, gRPC, event buses beyond the simple queue.
- Advanced analytics (factor models, portfolio optimizers, etc.).

### 4.2. Post-MVP scope changes

Post-MVP features are allowed **only if** they are explicitly defined in the active spec (`product.md` / `phase2.md`).

**Asset coverage note:**
- Expanding supported crypto pairs beyond BTC/USDT and ETH/USDT is allowed only when it is explicitly listed in `docs/product.md` and the associated PRD.
- The single-asset, single-timeframe-per-strategy rule still applies.
- Multiple entry/exit conditions (entry OR exit rules) are allowed only when explicitly defined in the active spec/PRD.

If a user requests something that was MVP-out-of-scope:
- You may implement it **only** when a Phase 2+ spec:
  - explicitly includes it,
  - defines the minimal version to build,
  - and states what remains out of scope.

If the spec is missing, add a small “delta spec” section to `docs/phase2.md` first (goal, non-goals, acceptance criteria), then implement the smallest slice.

---

## 5. Tech stack expectations

### 5.2. Secure baseline versions

- Keep runtime and framework versions on the approved secure baseline:
  - Next.js **16.x** (latest patched minor/patch release in the 16 line)
  - FastAPI **0.129.x**
  - Python **3.12**
- When version upgrades are introduced, verify core flows still work end-to-end (OAuth callback, shared backtest links, existing app routes, login, strategy creation, and backtest run smoke test).
- Avoid broad refactors during stack upgrades; keep changes minimal and focused on compatibility/security.

### 5.3. Notification guidance

- Prefer **in-app notifications** over email for time-sensitive updates.
- Keep notification payloads minimal (just enough to render text + a deep link).
- Performance alerts may also send **email** if the user explicitly opts in.
- Price alerts may use **in-app**, **email**, or **webhook** delivery when the user explicitly opts in; no other channels.

Use and respect the existing stack rather than introducing new tools:

- **Frontend**
  - Next.js (App Router) + TypeScript.
  - Tailwind CSS for styling and responsiveness.
  - Keep components small, composable, and easily testable.

- **Backend**
  - FastAPI monolith (Python).
  - Single deployable unit, with a “worker mode” for jobs.
  - Postgres as the only database.
  - Redis for queue + simple caching.
  - S3-compatible storage for larger backtest artifacts.

### 5.1. Architecture rules

- Prefer **one simple module** over many micro-modules.
- Keep routing, handlers, services, and models small and focused.
- Avoid introducing additional infrastructure (message buses, new DBs, etc.).
- When in doubt, add code to existing modules rather than creating new ones, as long as it stays readable.

---

## 6. Coding style & patterns

### 6.1. General

- Prefer **pure functions** where possible.
- Keep functions and components short (<40–50 lines ideally).
- Avoid clever one-liners if they harm clarity.
- Use descriptive but concise names (`useBacktestRuns`, not `useBacktestRunsForUserAndMaybeMoreIfNeeded`).

### 6.2. Frontend specifics

- Use existing **design patterns** and **components** in the repo rather than inventing new ones.
- For responsiveness:
  - Mobile-first layouts (vertical stacking).
  - Use Tailwind's spacing, flex/grid, and typography utilities.
- Avoid:
  - Overly dynamic layouts that are hard to maintain.
  - New tooltip libraries; prefer native `title` or existing components for help text.
- Prefer **inline, contextual validation feedback** (e.g., on-canvas cues) over hidden or panel-only errors.

When asked to implement UI:

1. Start with **the simplest working layout**.
2. Add only the minimal responsive tweaks needed for a sane mobile/desktop experience.
3. Reuse existing utility classes and components.

#### 6.2.1. shadcn/ui Components

Use **shadcn/ui** for common UI elements. Components are in `frontend/src/components/ui/`.

**Installed components:** Button, Input, Select, Dialog, Card, Tabs, Badge, DropdownMenu

**Usage rules:**
- Use shadcn/ui for buttons, forms, modals, dropdowns, cards, badges
- Canvas nodes (`components/canvas/`) use custom Tailwind — do NOT use shadcn/ui there
- Import from `@/components/ui/[component]`
- Use `cn()` from `@/lib/utils` for conditional class names

#### 6.2.2. Design System Compliance

All frontend development **must** comply with the design documentation:

- `docs/design_concept.json` — **Design concept and creative direction** (brand identity, design philosophy, color strategy, typography strategy)
- `docs/design-system.json` — **Design system specification** (tokens, components, patterns, guidelines)

**Before implementing any frontend UI:**
1. Review the design concept for guiding principles (clarity over complexity, functional minimalism, progressive disclosure)
2. Use existing design tokens from the design system (colors, typography, spacing, border-radius, shadows)
3. Follow component specifications for buttons, inputs, cards, badges, dialogs, tables, etc.
4. Apply layout patterns defined in the system (page containers, grids, forms, lists, states)

**Color usage:**
- Use semantic colors via CSS variables (`--primary`, `--secondary`, `--muted`, `--destructive`, etc.)
- Canvas nodes use the five-category color system: input (purple), indicator (blue), logic (amber), signal (green), risk (red)
- Feedback colors: success (green), error (red), warning (yellow), info (blue)
- Never create new color values outside the token system

**Typography:**
- Use the defined hierarchy: page title (2xl/bold), section title (lg/semibold), subsection (base/medium), body (sm/normal), small (xs)
- Limit to 2-3 font weights per view
- Use system UI font stack (already configured in Tailwind)

**Spacing & Layout:**
- Follow the 4px base scale (0.5, 1, 1.5, 2, 3, 4, 6, 8 in Tailwind)
- Card padding: `p-6` (24px), form gaps: `space-y-4` (16px)
- Page container: `container mx-auto max-w-6xl p-4 md:p-6`
- Mobile-first responsive design with breakpoints: sm (640px), md (768px), lg (1024px)

**Component states:**
- Hover: subtle background change
- Focus: 1px ring in primary color (`focus-visible:ring-1 focus-visible:ring-ring`)
- Disabled: 50% opacity, no pointer events

**Animation:**
- Fast (150ms): button clicks, toggles
- Normal (200ms): modal open/close, dropdowns
- Never exceed 300ms for UI feedback

**Do NOT:**
- Create arbitrary color values when tokens exist
- Skip dark mode support (use `dark:` prefix)
- Ignore mobile responsiveness
- Add animations longer than 300ms
- Use `!important` except for react-flow handle overrides

### 6.3. Backend specifics

- Prefer explicit, flat **FastAPI routers** and simple dependency injection.
- Keep models minimal: only fields needed for the current spec.
- Don’t over-abstract:
  - No generic “repository” layer just for the sake of it.
  - No domain-driven-design ceremony.
- When adding a new endpoint:
  - Implement only the exact fields and behavior defined by the current feature.
  - Return concise, well-typed responses that match the frontend needs.

---

## 7. ESLint, formatting, and tooling

- Always write code that passes:
  - `npm run lint` (or equivalent for the repo).
  - TypeScript type checking.
- Do **not** disable ESLint rules globally to “get things passing”.
  - If a rule is too strict for a specific line, prefer refactoring.
  - If absolutely necessary, use **narrow** `// eslint-disable-next-line` with a clear reason.
- Follow the existing formatting setup (Prettier or similar if configured).
  - Don’t suggest or introduce alternative formatters.

If a feature would require weakening linting or type safety, rethink the approach. Simpler is better.

---

## 8. Tests

- Write tests that are:
  - Small.
  - Fast.
  - Focused on **critical paths** (e.g., backtest correctness, strategy validation).
- Avoid:
  - Over-mocking.
  - Complex test fixtures for trivially simple logic.
- If adding a test takes more code than the feature and adds little confidence, it’s probably not needed—**YAGNI applies to tests too**.

---

## 9. How to respond to user requests (Claude Code behavior)

When the user asks you to change or add something:

1. **Determine phase + spec**
   - If the request says “MVP only”, follow `docs/mvp.md`.
   - Otherwise follow spec precedence (product/phase2 → mvp baseline → mvp_plan seed).

2. **If it exceeds the active spec**
   - Don’t implement a large change “because it’s easy”.
   - First update/create `docs/phase2.md` with:
     - Goal
     - Non-goals
     - Acceptance criteria
     - MVP deltas (what’s changing vs `docs/mvp.md`, if applicable)

3. **Prefer patch-style changes**
   - Show **only the relevant diffs** or files when possible, not huge rewrites.
   - Reuse existing patterns instead of inventing new ones.

4. **Keep answers short and focused**
   - Prioritize code over prose.
   - Add brief comments only where they truly help understanding.

5. **Offer the simplest solution first**
   - If there’s a “fancy” solution and a simple one, always show the simple one.
   - Mention possible future abstractions only briefly, and do **not** implement them now.

---

## 10. Things you should almost never do

Avoid these unless the user explicitly insists *and* it clearly fits the active spec:

- Creating new global utilities or “core” abstractions.
- Introducing a new major library or framework.
- Creating complex custom hooks or HOCs when a simple inline implementation suffices.
- Adding highly generic types or deeply nested generics.
- Implementing unused configuration options “for future flexibility”.
- Over-documenting trivial code (comments for obvious things).

---

If you ever have to choose between:

- **A small, slightly repetitive solution**, and
- **A big, clever abstraction**,

you must choose the **small, repetitive solution**.

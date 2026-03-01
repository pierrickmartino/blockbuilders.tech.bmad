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

**Doc hygiene:** When you add a new `docs/prd-*.md`, also create a matching `docs/tst-*.md` test checklist and list the PRD in `docs/product.md` (Section 17.1). If you change dashboard or strategy list behavior, update the UI notes in `docs/product.md` Section 9.3 and the feature summary in Section 13. If you add or change recently viewed shortcuts on the dashboard, update the UI notes in `docs/product.md` Section 9.3 and the feature summary in Section 13. For strategy list quick actions, prefer a visible, one-click button that calls an existing endpoint—avoid adding new modal flows unless required. For bulk actions on strategy lists, keep the interaction to checkbox selection + a simple action dropdown, and avoid extra confirmation flows unless required for destructive actions. If you add or change backtest visualizations (including seasonality analysis, trade distribution analysis, or position analysis), update `docs/product.md` Section 5.5 and the feature summary in Section 13. If you add or change backtest comparison views, update `docs/product.md` Sections 5.4–5.5 and the feature summary in Section 13. If you add or change backtest data exports, update `docs/product.md` Section 5.5 and the feature summary in Section 13. If you add or change shareable backtest result links, update `docs/product.md` Section 5.5 and the feature summary in Section 13. If you add or change backtest trade explanation detail (entry/exit condition breakdowns, indicator overlays, condition candle highlights), update `docs/product.md` Section 5.5 and the feature summary in Section 13. If you add or change backtest summary metrics, update `docs/product.md` Section 5.4 and the feature summary in Section 13. If you add or change transaction cost analysis, update `docs/product.md` Sections 5.4–5.5 and the feature summary in Section 13. If you add or change product analytics tracking, backend worker analytics, or consent behavior, update `docs/product.md` Section 9.13, the feature summary in Section 13, and documentation links in Section 17.1. If you add or change onboarding funnel analytics dashboards, update `docs/product.md` Section 9.13, the feature summary in Section 13, and documentation links in Section 17.1. If you add or change structured logging or correlation ID tracing, update `docs/product.md` Section 9.14, the feature summary in Section 13, and documentation links in Section 17.1. For canvas UX enhancements, add/update the related section in `docs/product.md` and keep the feature summary in Section 13 current. For node display mode changes (compact/expanded), update `docs/product.md` Section 4 and keep the feature summary in Section 13 current. For canvas history/undo-redo changes, update the canvas section in `docs/product.md` and keep the feature summary in Section 13 current. For keyboard shortcuts or shortcut help modal changes, update the canvas section in `docs/product.md` and keep the feature summary in Section 13 current. For mobile-specific canvas UX, maintain a dedicated subsection in `docs/product.md` (Section 4) and keep its status reflected in Section 13. For canvas toolbar/control layout changes, update the mobile canvas subsection in `docs/product.md` and keep the feature summary in Section 13 current. For editor header simplification, autosave indicator behavior, or history panel access changes, update `docs/product.md` Section 4.11 and the feature summary in Section 13. For market overview, live price ticker, volatility metrics, or market sentiment indicators work, update the UI notes in `docs/product.md` Section 9.9 and the feature summary in Section 13. For data completeness or data quality timeline work, update `docs/product.md` Section 6.4 and the feature summary in Section 13. For backtest summary personalization (favorite/pinned metrics), update the UI notes in `docs/product.md` Section 9.4 and the feature summary in Section 13. For billing perks, user tiers, limit overrides, or pricing/discount adjustments, update `docs/product.md` Sections 2.3–2.4 and the feature summary in Section 13. If you add or change public user profiles, follower counts, or profile badges, update `docs/product.md` Section 2.3 and the feature summary in Section 13. If you add or change indicator palette blocks (indicator or price-derived inputs), update `docs/product.md` Section 9.3 and the feature summary in Section 13.
If you add or change indicator palette visibility modes (essentials vs all), also document the default indicator subset, persistence behavior, and analytics event requirements in the matching PRD/TST pair and `docs/product.md` Sections 9.3, 13, and 17.1.
If you add or change plain-English naming for indicator cards, document the user-facing primary labels, technical subtitles, tooltip behavior, Essentials-vs-All mode rules, and WCAG 2.1 AA contrast requirement in the matching PRD/TST pair and `docs/product.md` Sections 9.3, 13, and 17.1.
If you add or change the block library (palette UI, search, categories, favorites/recents), update `docs/product.md` Sections 4 and 9.3 and the feature summary in Section 13.
If you add or change the block parameter inspector/properties panel behavior, update `docs/product.md` Sections 4 and 9.3 and the feature summary in Section 13.
For canvas auto-layout or connection tidying improvements, update the related canvas section in `docs/product.md` and the feature summary in Section 13.
If you add or change display/theme preferences (including dark mode), update `docs/product.md` Sections 2.3 and 9.5 and the feature summary in Section 13.
If you add or change the strategy templates marketplace/library, update `docs/product.md` Section 3.7 and the feature summary in Section 13.
If you add or change the progress dashboard, update `docs/product.md` Section 9.11 and the feature summary in Section 13.
**Credits & add-ons:** If the spec calls for one-time usage credits or add-on capacity, keep tracking as **simple integer fields on the user record** and avoid extra tables or complex metering unless explicitly required.
**Strategy metadata:** If you need to store non-execution data in a strategy version JSON (e.g., notes), keep it under a top-level `metadata` key so the interpreter can ignore it safely.
**Strategy portability:** Keep import/export formats minimal and stable (JSON only), favoring explicit validation over clever transforms.
**Strategy explanations:** Keep explanation generation deterministic and derived from block JSON; store any generated text under `metadata.explanation` if persistence is required.
**Strategy tags:** Store tags in relational tables tied to strategies/users (not inside strategy version JSON) so the interpreter stays untouched.

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

- **Basic “paper trading” via scheduled re-backtests**
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
- True live / tick-by-tick paper trading.
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

**Do NOT migrate to shadcn/ui:**
- Canvas nodes (BaseNode.tsx, all node types) — specialized color-coded category system
- Components with complex internal state where migration adds no value

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

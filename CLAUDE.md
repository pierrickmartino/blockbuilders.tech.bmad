```markdown
# CLAUDE.md

Instructions for Claude Code when working in this repository.

---

## 1. Purpose of this repo

You are helping build **Blockbuilders** – a web-based, no-code strategy lab where non-technical retail crypto traders can visually build and backtest simple strategies for a few major pairs. The MVP is small, focused, and deliberately constrained.

Your job is to **implement exactly the MVP** and **keep the codebase as small and simple as possible**.

---

## 2. Non-negotiable principles

When writing or editing code, **always** optimize for:

1. **KISS – Keep It Simple, Stupid**
   - Prefer the most straightforward solution that works.
   - Fewer moving parts, fewer abstractions, fewer dependencies.

2. **YAGNI – You Aren’t Gonna Need It**
   - Do **not** add abstractions, configs, or features “for later”.
   - If it’s not clearly required by the current story or by `mvp.md`, don’t build it.

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

5. **ESLint & TypeScript correctness**
   - All code must:
     - Pass **ESLint**.
     - Compile in **TypeScript** with no `any` unless *absolutely* necessary.
   - If you introduce a pattern that would require weakening lint or TS rules, don’t do it. Simplify instead.

Whenever you face a trade-off, resolve it in this order:

> **Correctness → Simplicity → Fewer lines → Performance (only if actually needed)**

---

## 3. Product scope guardrails (MVP only)

Treat `mvp.md` as the **single source of truth** for product scope.

When the user asks for something, check mentally: *is this clearly in scope for the MVP?*

### 3.1. In scope (what you *can* build)

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

### 3.2. Explicitly out of scope (don’t build)

Even if it sounds cool or “easy”, **do not** introduce:

- Real-time trading or brokerage integration.
- True live / tick-by-tick paper trading.
- Multi-asset or multi-timeframe strategies.
- Strategy marketplace, monetization, or complex sharing mechanics.
- Complex billing, multi-plan pricing, or subscriptions logic.
- Microservices, Kubernetes, gRPC, event buses beyond the simple queue.
- Advanced analytics (factor models, portfolio optimizers, etc.).

If you’re tempted to add any of the above, **stop** and keep things within MVP scope.

---

## 4. Tech stack expectations

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

### 4.1. Architecture rules

- Prefer **one simple module** over many micro-modules.
- Keep routing, handlers, services, and models small and focused.
- Avoid introducing additional infrastructure (message buses, new DBs, etc.).
- When in doubt, add code to existing modules rather than creating new ones, as long as it stays readable.

---

## 5. Coding style & patterns

### 5.1. General

- Prefer **pure functions** where possible.
- Keep functions and components short (<40–50 lines ideally).
- Avoid clever one-liners if they harm clarity.
- Use descriptive but concise names (`useBacktestRuns`, not `useBacktestRunsForUserAndMaybeMoreIfNeeded`).

### 5.2. Frontend specifics

- Use existing **design patterns** and **components** in the repo rather than inventing new ones.
- For responsiveness:
  - Mobile-first layouts (vertical stacking).
  - Use Tailwind’s spacing, flex/grid, and typography utilities.
- Avoid:
  - Heavy third-party UI libraries unless already adopted.
  - Overly dynamic layouts that are hard to maintain.

When asked to implement UI:

1. Start with **the simplest working layout**.
2. Add only the minimal responsive tweaks needed for a sane mobile/desktop experience.
3. Reuse existing utility classes and components.

### 5.3. Backend specifics

- Prefer explicit, flat **FastAPI routers** and simple dependency injection.
- Keep models minimal: only fields needed for the current MVP.
- Don’t over-abstract:
  - No generic “repository” layer just for the sake of it.
  - No domain-driven-design ceremony.
- When adding a new endpoint:
  - Implement only the exact fields and behavior defined by the current feature.
  - Return concise, well-typed responses that match the frontend needs.

---

## 6. ESLint, formatting, and tooling

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

## 7. Tests

- Write tests that are:
  - Small.
  - Fast.
  - Focused on **critical paths** (e.g., backtest correctness, strategy validation).
- Avoid:
  - Over-mocking.
  - Complex test fixtures for trivially simple logic.
- If adding a test takes more code than the feature and adds little confidence, it’s probably not needed—**YAGNI applies to tests too**.

---

## 8. How to respond to user requests (Claude Code behavior)

When the user asks you to change or add something:

1. **Clarify scope mentally**
   - Is this clearly inside MVP and current architecture?
   - If it pushes toward complex, multi-phase features, gently steer back to a simpler, MVP-aligned version.

2. **Prefer patch-style changes**
   - Show **only the relevant diffs** or files when possible, not huge rewrites.
   - Reuse existing patterns instead of inventing new ones.

3. **Keep answers short and focused**
   - Prioritize code over prose.
   - Add brief comments only where they truly help understanding.

4. **Offer the simplest solution first**
   - If there’s a “fancy” solution and a simple one, always show the simple one.
   - Mention possible future abstractions only briefly, and do **not** implement them now.

---

## 9. Things you should almost never do

Avoid these unless the user explicitly insists *and* it clearly fits MVP:

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
```


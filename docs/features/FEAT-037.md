# PRD: Essentials-First Block Palette Toggle

## 1. Summary
Introduce an essentials-first mode for the canvas block palette so new users see only the 5 most common indicators by default. Users can switch to the full indicator list with a simple toggle, and the selected mode persists in localStorage. Existing users who already use non-essential indicators default to the full list to avoid disruption.

## 2. Problem Statement
The current indicator palette exposes too many options at once for first-time users. This creates decision fatigue and slows strategy creation.

## 3. Goals
- Reduce first-time cognitive load in the indicator palette.
- Preserve fast access to all indicators via a single toggle.
- Avoid backend impact by implementing the mode switch fully in the frontend.

## 4. Non-Goals
- Reorganizing indicator categories.
- Changing indicator math, parameters, or backend validation rules.

## 5. Target Users & User Stories
### 5.1 Target Users
- New users creating first strategies on the canvas.
- Existing users with advanced strategies using non-essential indicators.

### 5.2 User Stories
- As a new user, I want to see only core indicators first, so that I can start building without being overwhelmed.
- As an existing advanced user, I want my palette to stay fully visible after this change, so that my workflow is not interrupted.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Essentials/default indicator mode for new users.
- Toggle control to switch between essentials and full indicator lists.
- localStorage persistence for palette mode.
- Legacy-user fallback to default “all” mode when non-essential indicators are already present in their strategies.
- PostHog tracking event on mode change.

### 6.2 Out of Scope
- Server-side preference storage.
- New API endpoints or API schema changes.

### 6.3 Functional Requirements
- On first palette load for a new user, default mode is `essentials`.
- Essentials list contains exactly 5 indicators:
  - Moving Average (SMA)
  - Exponential Moving Average (EMA)
  - RSI
  - Bollinger Bands
  - MACD
- In essentials mode, all non-essential indicators are hidden (e.g., Stochastic, ADX, Ichimoku, OBV, Fibonacci, ATR, etc.).
- A toggle control labeled `Show all indicators` appears at the bottom of the indicator section.
- When toggled on, palette shows full indicator set.
- Toggle selection persists across sessions using localStorage.
- For existing users with at least one strategy containing a non-essential indicator, first load after release defaults to `all` mode.
- Palette mode switching triggers no additional API calls.
- On each mode change, emit PostHog event `palette_mode_changed` with property:
  - `mode: "essentials" | "all"`

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens strategy canvas and opens block palette.
2. Palette resolves initial mode (`all` for eligible legacy users, otherwise persisted mode, otherwise `essentials`).
3. User sees indicator section based on mode.
4. User clicks toggle to reveal or reduce indicator list.
5. Mode updates immediately and is persisted locally.

### 7.2 States
- Loading: Palette renders existing loading behavior; mode defaults once indicators are available.
- Empty: Not applicable (indicator list already exists).
- Error: If localStorage is unavailable, fallback to in-memory mode for session and continue.
- Success: Indicators render according to mode with toggle visible.

### 7.3 Design Notes
- Keep current palette layout and category structure.
- Add one small text toggle at the bottom of the indicator section:
  - Essentials mode: `Show all indicators`
  - All mode: `Show essentials only`
- Keep copy plain and consistent with existing palette tone.

## 8. Data Requirements
### 8.1 Data Model
- `palette_indicator_mode` — string (`"essentials" | "all"`) — stored in browser localStorage.
- `has_non_essential_indicator_usage` — boolean (derived at runtime from already-loaded strategy definitions or existing client-side strategy metadata) — used only for first-load default decision.

### 8.2 Calculations / Definitions (if applicable)
- **Essentials Set:** `{"sma","ema","rsi","bollinger","macd"}`
- **Non-essential indicator usage detected:** any indicator block outside the essentials set present in existing user strategies.
- **Initial mode selection order (first release-compatible):**
  1. Existing persisted localStorage value (if valid)
  2. Else if legacy usage detected: `all`
  3. Else: `essentials`

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new endpoints.
- Reuse existing strategy/canvas payloads already loaded by the editor.

### 9.2 Validation & Error Handling
- If localStorage read/write fails, app continues with non-persistent in-memory toggle state.
- Invalid stored value defaults to `essentials` unless legacy usage check requires `all`.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add a small mode state in palette component (`essentials`/`all`).
- Filter indicator blocks in render logic using static essentials set.
- Persist mode to localStorage on toggle.
- Resolve legacy default once per user/session from already-available strategy data (no extra fetch).
- Fire `palette_mode_changed` event after each user-triggered mode change.

### 10.2 Backend
- No changes.

## 11. Rollout Plan
- Phase 1: Implement mode toggle + local persistence + render filtering.
- Phase 2: Add legacy-user default logic + analytics event.
- Phase 3: QA checklist pass and release.

## 12. Acceptance Criteria
- [ ] Given a user opens the block palette, when palette loads, then default view shows exactly 5 indicators: SMA, EMA, RSI, Bollinger Bands, MACD.
- [ ] Given essentials mode, then all non-essential indicators (e.g., Stochastic, ADX, Ichimoku, OBV, Fibonacci, ATR) are hidden.
- [ ] Given the indicator section is shown, then a `Show all indicators` toggle is present at the bottom.
- [ ] Given a user clicks `Show all indicators`, when toggle activates, then full indicator set is revealed.
- [ ] Given a user changes toggle mode, then preference persists across sessions via localStorage.
- [ ] Given an existing user has strategies with non-essential indicators, when they first load the palette after release, then default mode is `all`.
- [ ] Given palette mode changes, when UI updates, then no additional API calls are made.
- [ ] Given palette mode changes, then PostHog event `palette_mode_changed` fires with property `mode` set to `essentials` or `all`.

## 13. Tracking Metrics (Optional)
- `palette_mode_changed` event count by mode.
- % of sessions staying in essentials mode vs switching to all.

## 14. Dependencies (Optional)
- Existing block palette component and indicator registry.
- Existing PostHog client wrapper.

## 15. Risks & Mitigations (Optional)
- Risk: Legacy-user detection may be incomplete if strategy metadata isn’t loaded yet.  
  Mitigation: Run detection after existing strategy payload load, then set default once before first interaction.
- Risk: localStorage availability issues (private mode/restrictions).  
  Mitigation: Graceful fallback to in-memory state.

## 16. Open Questions
- Should ATR remain non-essential for this release despite being common for some users?
- Should legacy detection inspect all strategies or only recently opened/current strategy in v1?

# PRD: Plain-English Indicator Labels

## 1. Summary
Add plain-English primary labels to Essentials-mode indicator cards so non-technical users can understand indicator purpose before using them. Keep technical names as subtitles, preserve existing hover tooltips, and enforce WCAG 2.1 AA contrast for both text levels.

## 2. Problem Statement
Current indicator names are technical-first, which increases confusion for new/non-technical users during strategy building.

## 3. Goals
- Improve first-time comprehension in Essentials mode with plain-English labels.
- Preserve technical clarity by keeping the original indicator name visible as subtitle.
- Keep implementation frontend-only and low-risk.

## 4. Non-Goals
- Renaming non-essential indicators in All mode.
- Changing indicator calculations, parameters, tooltip content, or backend APIs.

## 5. Target Users & User Stories
### 5.1 Target Users
- Non-technical users building strategies from the Essentials palette.
- Existing users who still need technical names visible.

### 5.2 User Stories
- As a non-technical user, I want indicator names in plain English so I can understand what they do before I use them.
- As an existing user, I want technical names to remain visible so I can still recognize indicators quickly.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Essentials-mode label mapping for the five essentials indicators.
- Two-level card text in Essentials mode: plain-English primary label + technical subtitle.
- Preserve existing hover tooltip behavior and copy.
- WCAG 2.1 AA contrast compliance for both label levels.
- No plain-English renaming for non-essential indicators in All mode.

### 6.2 Out of Scope
- Backend schema/API changes.
- New analytics events.
- Any change to indicator ordering, filtering logic, or toggle behavior already defined by Essentials-first mode.

### 6.3 Functional Requirements
- In Essentials mode, each essentials indicator card displays:
  - `Moving Average` / `SMA`
  - `Exponential Moving Average` / `EMA`
  - `Momentum Indicator` / `RSI`
  - `Volatility Bands` / `Bollinger Bands`
  - `Trend & Momentum` / `MACD`
- Existing hover tooltip remains present with the existing 1–2 sentence explanation.
- Both primary label and subtitle must meet WCAG 2.1 AA contrast ratio against card background (NFR-09).
- In All mode, non-essential indicators display existing technical names only.
- If All mode includes essentials indicators, they may keep dual-label rendering for consistency, but this is optional and should not block acceptance.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
1. User opens Strategy Editor block palette.
2. If palette mode is Essentials, indicator cards show plain-English primary label + technical subtitle.
3. User hovers/focuses a card and sees the existing tooltip explanation.
4. If user switches to All mode, non-essential indicators keep technical-only names.

### 7.2 States
- Loading: Existing palette loading behavior unchanged.
- Empty: Not applicable.
- Error: If label mapping is missing, fallback to technical name only.
- Success: Cards render with required labels by mode.

### 7.3 Design Notes
- Keep existing card layout; add subtitle as secondary text under the primary label in Essentials mode.
- Keep typography simple and legible.
- Maintain current tooltip component/trigger behavior.

## 8. Data Requirements
### 8.1 Data Model
- `plain_label_map` — frontend constant map from technical indicator key to plain-English label.
- No persisted user data changes.

### 8.2 Calculations / Definitions (if applicable)
- **Contrast requirement (NFR-09):** text colors for both label levels pass WCAG 2.1 AA against the card background.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- No new endpoints.
- No existing endpoint changes.

### 9.2 Validation & Error Handling
- Validate card rendering falls back safely to technical name if mapping is unavailable.
- No backend validation required.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Add a minimal label mapping constant for essentials indicators.
- Update indicator card renderer to show two text lines in Essentials mode.
- Keep existing tooltip wiring intact.
- Apply existing design tokens/classes that satisfy AA contrast.

### 10.2 Backend
- No changes.

## 11. Rollout Plan
- Phase 1: Add label map + card rendering update.
- Phase 2: Verify tooltip retention + mode behavior.
- Phase 3: Accessibility contrast validation and release.

## 12. Acceptance Criteria
- [ ] Given the block palette is in Essentials mode, when the user views indicator cards, then each card shows plain-English primary label with technical subtitle exactly as:
  - `Moving Average` / `SMA`
  - `Exponential Moving Average` / `EMA`
  - `Momentum Indicator` / `RSI`
  - `Volatility Bands` / `Bollinger Bands`
  - `Trend & Momentum` / `MACD`
- [ ] Given the user hovers/focuses an indicator card, the existing 1–2 sentence tooltip explanation remains visible and unchanged.
- [ ] Given the palette is in Essentials mode, both label levels meet WCAG 2.1 AA contrast ratios (NFR-09).
- [ ] Given the palette is switched to All mode, non-essential indicators display their existing technical names only (no plain-English rename).

## 13. Tracking Metrics (Optional)
- Optional UX metric: reduced first-time hover dwell time before adding an essentials indicator.

## 14. Dependencies (Optional)
- Existing Essentials palette mode implementation.
- Existing indicator tooltip content source/component.

## 15. Risks & Mitigations (Optional)
- Risk: Longer plain-English labels may wrap awkwardly on small widths.
  Mitigation: Use compact typography and predictable line-height; allow two-line primary label if needed.
- Risk: Subtitle contrast regression in dark/light themes.
  Mitigation: Validate both themes against AA before release.

## 16. Open Questions
- Should essentials indicators in All mode also use dual labels for consistency, or remain technical-only for strict mode distinction?
- Do we want localization-ready label keys in this phase, or defer until i18n is planned?

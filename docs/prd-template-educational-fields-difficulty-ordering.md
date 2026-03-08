# PRD: Template Educational Fields and Difficulty Ordering

## 1. Summary
Add educational copy and progression metadata to strategy templates so users can understand what each template teaches and browse templates in an intentional beginner-to-advanced order.

## 2. Problem Statement
Users can clone templates today, but they are not guided on concept difficulty and do not always understand the core trading idea behind each template.

## 3. Goals
- Add minimal schema fields needed to support educational copy and progression order.
- Display user-friendly difficulty labels in the templates list.
- Show a concise “What this teaches” section on template detail pages when content exists.

## 4. Non-Goals
- No personalized recommendations or adaptive ranking.
- No redesign of the template cards or detail page beyond a subtle badge and one content section.

## 5. Target Users & User Stories
### 5.1 Target Users
- New traders learning strategy concepts progressively.
- Returning users browsing templates and choosing based on skill level.

### 5.2 User Stories
- As a user browsing templates, I want templates ordered by difficulty progression, so that I can start simple and level up.
- As a user viewing template details, I want plain-English teaching context, so that I understand the concept before cloning.

## 6. Scope & Functional Requirements
### 6.1 In Scope
- Database migration adding `teaches_description`, `difficulty`, and `sort_order` to `strategy_templates`.
- Backfill existing templates with appropriate `difficulty` and `sort_order` values.
- Templates list ordering by `sort_order` ascending.
- Difficulty badge label mapping in UI.
- Conditional “What this teaches” section on template detail page.

### 6.2 Out of Scope
- Community voting/rating for difficulty.
- New template authoring UI for admins.

### 6.3 Functional Requirements
- Add `teaches_description TEXT`, `difficulty VARCHAR DEFAULT 'beginner'`, and `sort_order INT DEFAULT 0` columns to `strategy_templates`.
- Migration backfills all existing rows with non-null `difficulty` and deterministic `sort_order` values.
- Template list endpoint returns `difficulty` and `sort_order` fields and orders results by `sort_order ASC`.
- Template list UI shows difficulty badge labels using:
  - `beginner` -> “Start Here”
  - `intermediate` -> “Level Up”
  - `advanced` -> “Deep Dive”
- Template detail page renders “What this teaches” above Clone only when `teaches_description` is non-empty.

## 7. UX / UI Notes (Minimal)
### 7.1 User Flow
User opens Templates page, scans cards ordered by progression with subtle difficulty badges, opens a template detail, reads “What this teaches” (if authored), then clones.

### 7.2 States
- Loading
- Empty
- Error
- Success

### 7.3 Design Notes
- Badge/tag should be visually subtle and consistent with existing card styles.
- “What this teaches” content is 2-3 plain-English sentences.
- If content is missing, hide section without placeholder copy.

## 8. Data Requirements
### 8.1 Data Model
- `teaches_description` — TEXT — Educational explanation shown on detail page.
- `difficulty` — VARCHAR — Difficulty level enum-like value (`beginner`, `intermediate`, `advanced`), default `beginner`.
- `sort_order` — INT — Explicit ordering key for template list, default `0`.

### 8.2 Calculations / Definitions (if applicable)
- Difficulty badge copy mapping:
  - `beginner` => Start Here
  - `intermediate` => Level Up
  - `advanced` => Deep Dive
- List order: ascending by `sort_order`; ties can fall back to `name ASC`.

## 9. API / Backend Requirements (Minimal)
### 9.1 Endpoints
- `GET /strategy-templates` — Include `difficulty` and `sort_order`; order by `sort_order ASC`.
- `GET /strategy-templates/{id}` — Include `teaches_description` for detail rendering.

### 9.2 Validation & Error Handling
- `difficulty` values restricted to known set (`beginner`, `intermediate`, `advanced`) at schema/service boundary.
- Empty or null `teaches_description` is valid; frontend hides the section.

## 10. Implementation Notes (Minimal)
### 10.1 Frontend
- Reuse existing template card UI and add small difficulty badge.
- Reuse detail layout and insert “What this teaches” block above Clone with simple conditional rendering.

### 10.2 Backend
- Add migration + backfill in one change.
- Keep seed/backfill logic deterministic and minimal.

## 11. Rollout Plan
- Add migration and backfill existing templates.
- Ship API response updates and frontend rendering changes in same release.

## 12. Acceptance Criteria
- [ ] Given the database migration runs, when `teaches_description TEXT`, `difficulty VARCHAR DEFAULT 'beginner'`, and `sort_order INT DEFAULT 0` columns are added to `strategy_templates`, then existing templates are backfilled with appropriate difficulty labels and sort order.
- [ ] Given a user views the template list page, when the page renders, then templates are ordered by `sort_order` (ascending), grouping by difficulty, and each template shows a difficulty label: “Start Here” (beginner), “Level Up” (intermediate), “Deep Dive” (advanced), with a subtle badge/tag.
- [ ] Given a user views a template detail page, when the page renders, then a “What this teaches” section appears above Clone, containing 2-3 plain-English sentences explaining the concept, and if `teaches_description` is empty the section is hidden gracefully.

## 13. Tracking Metrics (Optional)
- Template detail-to-clone conversion rate — expected upward trend for beginner users.
- Distribution of clones across difficulty levels — expected broader progression over time.

## 14. Dependencies (Optional)
- Existing strategy templates API and frontend templates pages.
- Existing `strategy_templates` seed/backfill process.

## 15. Risks & Mitigations (Optional)
- Risk: Backfill difficulty values may not match intended learning progression.  
  Mitigation: Keep backfill mapping explicit in migration and review with product before deploy.

## 16. Open Questions
- Should ties on `sort_order` always fall back to name, created_at, or existing order?
- Should we enforce max length guidance for `teaches_description` to keep copy concise?

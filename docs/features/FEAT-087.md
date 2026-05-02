# PRD: Strategy Groups & Tags

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

## 1. Summary

Add lightweight tagging for strategies so users can organize and filter large strategy lists. Users create reusable tags (e.g., “Scalping,” “Swing,” “Experimental”) and assign multiple tags to each strategy. The strategy list and dashboard can be filtered by tags. This is a pure organization feature; it must not affect backtesting or strategy execution.

## 2. Goals

- Let users create custom tags and assign them to strategies.
- Support many-to-many tagging (strategy ↔ tag).
- Filter strategy lists by one or more tags.
- Keep the UX simple and fast, with minimal new UI surface area.

## 3. Non-Goals

- No automatic tag suggestions or AI labeling.
- No tag-based permissions or sharing.
- No changes to strategy execution, backtesting logic, or results.
- No complex folder hierarchy or nesting (flat tags only).

## 4. User Stories

1. As a user, I can add tags to a strategy so I can group strategies by style.
2. As a user, I can filter my strategy list by tag(s) so I can quickly find a subset.
3. As a user, I can reuse existing tags across multiple strategies.

## 5. UX Requirements

### 5.1. Strategy List/Dashboard

- Display tags as small chips next to each strategy name.
- Provide a multi-select tag filter in the list header.
- Filter behavior: show strategies that match **any** selected tag (OR logic).
- Include a “Clear filters” control.

### 5.2. Tag Management

- A simple tag input in the strategy metadata area:
  - Type a tag name and press Enter to add.
  - Shows existing tags as removable chips.
  - Autocomplete from existing tags (optional; only if already available in the UI library).
- Tag names are case-insensitive for uniqueness, but display with original casing.
- Tag names are limited to 24 characters.

## 6. Backend/API

### 6.1. Data Model

**strategy_tags**
- id (UUID, PK)
- user_id (UUID, FK to users)
- name (VARCHAR, unique per user, case-insensitive)
- created_at, updated_at

**strategy_tag_links**
- strategy_id (UUID, FK to strategies)
- tag_id (UUID, FK to strategy_tags)
- created_at
- Unique constraint: (strategy_id, tag_id)

### 6.2. Endpoints (Minimal)

- `GET /strategy-tags`
  - Returns all tags for the current user.
- `POST /strategy-tags`
  - Body: `{ "name": "Scalping" }`
  - Creates tag if it doesn’t exist (idempotent by name).
- `DELETE /strategy-tags/{id}` (optional)
  - Deletes tag and removes links.
- `PATCH /strategies/{id}`
  - Accepts `tag_ids: []` to set tags for the strategy.
- `GET /strategies`
  - Add filter: `tag_ids=uuid,uuid` (comma-separated).

## 7. Validation Rules

- Tag name required, trimmed, 1–24 characters.
- Only letters, numbers, spaces, dashes, underscores.
- Per-user uniqueness (case-insensitive).
- Max 20 tags per strategy.

## 8. Frontend Data Flow

- Load available tags once on strategy list page.
- Reuse existing strategy list fetch with `tag_ids` when filter is active.
- Strategy editor/save updates tags via `PATCH /strategies/{id}`.

## 9. Acceptance Criteria

- Users can add/remove tags on a strategy.
- Tags appear as chips in strategy list rows.
- Tag filter narrows the list to matching strategies.
- Backtests and strategy execution remain unchanged.

## 10. Rollout Notes

- Add migrations for new tables.
- Update list UI with a minimal filter control.
- Keep everything optional; existing users see no behavior change unless they add tags.

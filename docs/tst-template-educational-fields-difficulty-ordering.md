# Test Checklist -- Template Educational Fields and Difficulty Ordering

> Source PRD: `prd-template-educational-fields-difficulty-ordering.md`

## 1. Migration & Backfill

- [ ] Migration adds `strategy_templates.teaches_description` as TEXT
- [ ] Migration adds `strategy_templates.difficulty` as VARCHAR with default `beginner`
- [ ] Migration adds `strategy_templates.sort_order` as INT with default `0`
- [ ] Existing template rows are backfilled with non-null `difficulty`
- [ ] Existing template rows are backfilled with deterministic `sort_order`
- [ ] Backfill ordering reflects intended progression (beginner -> intermediate -> advanced)

## 2. API -- GET /strategy-templates

- [ ] Response includes `difficulty` for each template
- [ ] Response includes `sort_order` for each template
- [ ] Templates are returned ordered by `sort_order` ascending
- [ ] Ordering is stable and deterministic when sort_order values tie

## 3. Template List UI

- [ ] Templates render in ascending `sort_order`
- [ ] UI shows difficulty badge for each template card
- [ ] `beginner` templates display badge text `Start Here`
- [ ] `intermediate` templates display badge text `Level Up`
- [ ] `advanced` templates display badge text `Deep Dive`
- [ ] Difficulty badge styling is subtle and visually consistent with existing card/tag styles

## 4. API -- GET /strategy-templates/{id}

- [ ] Response includes `teaches_description`
- [ ] Empty `teaches_description` is returned as empty/null without API error

## 5. Template Detail UI

- [ ] “What this teaches” section is rendered above the Clone button when `teaches_description` is present
- [ ] Section content is plain English and fits 2-3 sentences
- [ ] When `teaches_description` is empty/null, section is hidden without blank space or placeholder

## 6. Edge Cases

- [ ] Unknown difficulty value (if present due to bad data) does not break page rendering
- [ ] Templates list still renders if one template has missing `teaches_description`
- [ ] Empty template set still shows existing empty-state UX

## 7. Regression Checks

- [ ] Existing clone action still works from template detail page
- [ ] Existing template card content (name, description, etc.) is unchanged apart from added difficulty badge
- [ ] Existing authentication/authorization behavior on template endpoints is unchanged

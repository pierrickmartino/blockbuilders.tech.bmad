# PRD: Strategy Templates Marketplace

## Summary
Launch a **curated library of pre-built strategy templates** (e.g., RSI oversold, MA crossover, Bollinger breakout) that users can clone and customize. Templates include plain-language logic descriptions, typical use cases, and suggested parameter ranges. The initial library is seeded by the Blockbuilders team and later accepts community submissions with approval.

## Goals
- Reduce time-to-first-backtest for new users.
- Teach common strategy patterns through readable, vetted templates.
- Keep the system minimal: simple template seeding + clone-to-edit.

## Non-Goals
- No paid marketplace, ratings, or reviews.
- No public profile pages for authors.
- No social feeds, comments, or “follow” mechanics.
- No multi-asset or multi-timeframe templates.

## User Stories
- As a new user, I can browse starter templates and understand how they work.
- As a user, I can clone a template into a new editable strategy in one click.
- As a user, I can see suggested parameter ranges to guide safe tweaks.

## Scope
### Core Behavior
- Add a **Templates** entry point in the strategy list area (tab or dedicated page).
- Show a list/grid of templates with:
  - Name
  - Short description
  - Logic summary (1–2 sentences)
  - Typical use cases
  - Suggested parameter ranges
- Each template has a **Clone** action that:
  - Creates a new strategy with the template’s definition JSON.
  - Prompts for (or auto-generates) a strategy name based on the template name.
  - Opens the new strategy in the canvas for editing.

### Template Seeding (Simple)
- Seed templates from a single source of truth (e.g., a JSON seed file or a minimal database table).
- Initial seed set maintained by Blockbuilders.
- Seed data includes the full strategy definition JSON plus display metadata.

### Community Submissions (Later)
- Phase 1: **Blockbuilders-only** templates (curated and published).
- Phase 2 (future): users can submit templates, but they remain **pending** until approved.
- Approval is a simple publish toggle (no complex moderation tooling in phase 1).

## UX/UI Notes
- Use existing list/card components for consistency with strategy list UI.
- Keep template cards lightweight: title, short description, and a visible **Clone** button.
- No modal-heavy flows; avoid multi-step wizards.

## Data & API
### Minimum Data Fields
- `id`
- `name`
- `description`
- `logic_summary`
- `use_cases` (array of strings)
- `parameter_ranges` (key/value or array form)
- `definition_json`
- `source` (enum: `blockbuilders`, `community`)
- `status` (enum: `published`, `pending`)
- `created_at`, `updated_at`

### Endpoints (Minimal)
- `GET /strategy-templates` → list published templates
- `GET /strategy-templates/{id}` → template detail
- `POST /strategy-templates/{id}/clone` → creates a new strategy from template

## Acceptance Criteria
- Users can access a Templates view from the strategy list area.
- At least three templates are available: RSI oversold, MA crossover, Bollinger breakout.
- Each template displays logic description, use cases, and parameter ranges.
- Cloning a template creates a new editable strategy and opens it on the canvas.
- The initial library is seeded and maintained by Blockbuilders (no community submissions yet).

## Implementation Notes (Minimal)
- Prefer a **single seed source** for templates to avoid migration-heavy complexity.
- Reuse existing strategy create/version logic for cloning.
- Keep template metadata strictly presentation-focused; no execution logic beyond definition JSON.

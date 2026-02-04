# Test Checklist -- Strategy Templates Marketplace

> Source PRD: `prd-strategy-templates-marketplace.md`

## 1. Templates Entry Point

- [ ] A "Templates" entry point is visible in the strategy list area (tab or dedicated page)
- [ ] Templates entry point is accessible to all authenticated users
- [ ] Navigation to Templates view works from the strategy list page
- [ ] Templates view loads without errors

## 2. Template List Display

- [ ] Templates are displayed in a list or grid format
- [ ] Each template card shows the template name
- [ ] Each template card shows a short description
- [ ] Each template card shows a logic summary (1-2 sentences)
- [ ] Each template card shows typical use cases
- [ ] Each template card shows suggested parameter ranges
- [ ] Each template card has a visible "Clone" button
- [ ] Template cards use existing list/card components consistent with strategy list UI
- [ ] Template cards are lightweight (no modal-heavy or multi-step wizard flows)

## 3. Seed Templates

- [ ] At least three templates are available: RSI oversold, MA crossover, Bollinger breakout
- [ ] RSI oversold template has a valid name, description, logic summary, use cases, and parameter ranges
- [ ] MA crossover template has a valid name, description, logic summary, use cases, and parameter ranges
- [ ] Bollinger breakout template has a valid name, description, logic summary, use cases, and parameter ranges
- [ ] Each seed template has a valid `definition_json` with blocks and connections
- [ ] All seed templates have `source` set to `blockbuilders`
- [ ] All seed templates have `status` set to `published`

## 4. Clone Action

- [ ] Clicking "Clone" on a template creates a new strategy
- [ ] Cloned strategy contains the template's definition JSON
- [ ] User is prompted for a strategy name (or an auto-generated name is provided based on the template name)
- [ ] After cloning, the new strategy opens in the canvas editor
- [ ] Cloned strategy is fully editable (independent from the template)
- [ ] Cloning the same template multiple times creates separate strategies each time
- [ ] Cloned strategy is owned by the authenticated user

## 5. API -- GET /strategy-templates

- [ ] Returns a list of published templates
- [ ] Does not return templates with `status: pending`
- [ ] Response includes all display fields (name, description, logic_summary, use_cases, parameter_ranges)
- [ ] Returns 401 for unauthenticated requests

## 6. API -- GET /strategy-templates/{id}

- [ ] Returns the full detail for a single published template
- [ ] Response includes `definition_json`
- [ ] Returns 404 for a non-existent template ID
- [ ] Returns 404 for a template with `status: pending`
- [ ] Returns 401 for unauthenticated requests

## 7. API -- POST /strategy-templates/{id}/clone

- [ ] Creates a new strategy from the template's definition JSON
- [ ] Returns the newly created strategy with its ID
- [ ] New strategy is created under the authenticated user's account
- [ ] Reuses existing strategy create/version logic
- [ ] Returns 404 for a non-existent template ID
- [ ] Returns 404 for a pending (unpublished) template
- [ ] Returns 401 for unauthenticated requests

## 8. Data Model

- [ ] Template record includes `id` field
- [ ] Template record includes `name` field
- [ ] Template record includes `description` field
- [ ] Template record includes `logic_summary` field
- [ ] Template record includes `use_cases` field (array of strings)
- [ ] Template record includes `parameter_ranges` field (key/value or array)
- [ ] Template record includes `definition_json` field
- [ ] Template record includes `source` field with enum values: blockbuilders, community
- [ ] Template record includes `status` field with enum values: published, pending
- [ ] Template record includes `created_at` and `updated_at` timestamps

## 9. Template Content Quality

- [ ] Each template logic summary is plain-language and readable by non-technical users
- [ ] Use cases are relevant and practical
- [ ] Suggested parameter ranges are reasonable for the strategy type
- [ ] Definition JSON for each template is valid and can be opened in the canvas without errors
- [ ] Template definitions use only supported block types and connections

## 10. Edge Cases

- [ ] Cloning a template when user is at their strategy limit returns a clear error message
- [ ] Cloning a template with a very long name handles name generation gracefully
- [ ] Templates page with no published templates shows an appropriate empty state
- [ ] Template list handles many templates (e.g., 50+) with pagination or scroll
- [ ] Clone action while offline or during network error shows a clear error message

## 11. Security and Auth

- [ ] All template endpoints require authentication
- [ ] Cloned strategies are private to the user who cloned them
- [ ] Template data does not expose internal system IDs or sensitive metadata
- [ ] Users cannot modify or delete templates through public API (read-only + clone only)

## 12. Community Submissions (Future Phase)

- [ ] Community-submitted templates default to `status: pending`
- [ ] Pending templates are not visible in the public template list
- [ ] Publishing a template changes its status to `published`
- [ ] This phase is not yet implemented (verify no community submission UI exists)

## 13. Non-Goals Verification

- [ ] No paid marketplace, pricing, or purchase flow for templates
- [ ] No ratings or reviews on templates
- [ ] No public profile pages for template authors
- [ ] No social feeds, comments, or follow mechanics
- [ ] No multi-asset or multi-timeframe templates
- [ ] Template metadata is presentation-focused only (no execution logic beyond definition JSON)

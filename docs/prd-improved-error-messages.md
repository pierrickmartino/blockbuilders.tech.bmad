# PRD: Improved Error Messages

**Status:** Draft
**Owner:** Product
**Last Updated:** 2026-01-01

## 1. Summary
Rewrite validation and error messages in plain language with actionable suggestions and links to relevant help docs. Replace jargon like “Invalid strategy definition” with clear guidance such as “Your entry signal needs a connection. Try connecting an indicator to the entry block.” This reduces frustration and support tickets.

## 2. Goals
- Make every validation and error state understandable to non-technical users.
- Provide a clear next step in every message.
- Link users to the most relevant help doc when available.
- Keep copy concise and consistent.

## 3. Non-Goals
- Adding new validation rules.
- Changing validation logic or backend behavior.
- Building a new help center or documentation system.

## 4. Scope
**In scope**
- Strategy validation errors returned by `POST /strategies/{id}/validate`.
- Common backtest/run errors surfaced in the UI (data gaps, invalid params).
- UI copy for inline canvas errors, panels, and toast/alert surfaces.

**Out of scope**
- Auth/billing errors (handled separately).
- Internationalization or multi-language support.

## 5. Copy Guidelines
- Format: **What happened** + **What to do next**.
- Avoid jargon; use block names as users see them (e.g., “Entry Signal”).
- Keep to 1–2 short sentences.
- Suggest the most likely fix first.
- Add a help link when a doc exists.

## 6. Help Doc Links
Use existing docs; no new help system.
- Strategy basics: `STRATEGY_GUIDE.md`
- Product overview: `docs/product.md`
- Validation feedback overview: `docs/prd-visual-strategy-validation-feedback.md`

## 7. Example Error Copy
| Current | New (Plain Language) | Help Link |
| --- | --- | --- |
| Invalid strategy definition | Something in this strategy is missing. Check the highlighted blocks and connect missing inputs. | STRATEGY_GUIDE.md |
| Missing entry signal | Your strategy needs an Entry Signal. Add one and connect it to an indicator or logic block. | STRATEGY_GUIDE.md |
| Entry signal has no input | Your Entry Signal needs a connection. Try connecting an indicator or logic block to the Entry Signal. | STRATEGY_GUIDE.md |
| Missing exit condition | Add at least one exit rule (Exit Signal, Stop Loss, Take Profit, etc.). | STRATEGY_GUIDE.md |
| Invalid parameter range | A parameter is out of range. Adjust it to the allowed range shown in the panel. | docs/product.md |
| Data gap detected | We’re missing candles for this range. Try a shorter date range or a supported pair. | docs/product.md |

## 8. Acceptance Criteria
- All validation and common error states are rewritten in plain language.
- Each error includes an actionable suggestion.
- Each error includes a help link when a relevant doc exists.
- Copy is consistent across inline canvas errors, panels, and alerts.

## 9. Success Metrics
- Fewer strategy validation support tickets.
- Reduced retries without changes after a validation failure.
- Higher completion rate from “validate” to “run backtest.”

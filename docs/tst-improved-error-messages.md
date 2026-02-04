# Test Checklist -- Improved Error Messages

> Source PRD: `prd-improved-error-messages.md`

## 1. Strategy Validation Errors

- [ ] "Invalid strategy definition" is rewritten to plain language: explains what is missing and suggests checking highlighted blocks
- [ ] "Missing entry signal" is rewritten to guide user to add an Entry Signal and connect it
- [ ] "Entry signal has no input" is rewritten to suggest connecting an indicator or logic block to the Entry Signal
- [ ] "Missing exit condition" is rewritten to suggest adding at least one exit rule (Exit Signal, Stop Loss, Take Profit, etc.)
- [ ] "Invalid parameter range" is rewritten to tell the user to adjust to the allowed range shown in the panel
- [ ] Each rewritten message uses block names as users see them in the UI (e.g., "Entry Signal", not internal identifiers)

## 2. Backtest / Run Errors

- [ ] "Data gap detected" is rewritten to suggest trying a shorter date range or a supported pair
- [ ] Common backtest parameter errors include plain-language explanations
- [ ] Invalid parameter errors include the valid range or expected format

## 3. Message Format Compliance

- [ ] Every error message follows the format: "What happened" + "What to do next"
- [ ] Messages are 1--2 short sentences
- [ ] Messages avoid jargon and technical terms
- [ ] Messages suggest the most likely fix first
- [ ] No error message is left as a raw technical string or code

## 4. Help Doc Links

- [ ] Strategy validation errors link to `STRATEGY_GUIDE.md`
- [ ] Data-related errors link to `docs/product.md`
- [ ] Help links are only shown when a relevant doc exists
- [ ] Help links are clickable and navigate to the correct document
- [ ] No broken or dead help links

## 5. UI Surface Consistency

- [ ] Inline canvas errors use the new plain-language copy
- [ ] Panel error messages use the new plain-language copy
- [ ] Toast/alert surfaces use the new plain-language copy
- [ ] Error copy is consistent across all surfaces (same error shows the same message everywhere)

## 6. Validation Endpoint (POST /strategies/{id}/validate)

- [ ] All validation error responses use the new message format
- [ ] Response includes the plain-language error text
- [ ] Response includes the help doc link when applicable
- [ ] No validation logic is changed (only the message copy)

## 7. Negative & Edge Cases

- [ ] Multiple simultaneous validation errors each show their own plain-language message
- [ ] Very long error messages do not break the UI layout
- [ ] Auth and billing errors are NOT affected by this change (handled separately)
- [ ] No new validation rules are introduced (scope limited to message rewrites)
- [ ] Backend validation behavior remains unchanged (same triggers, same conditions)

## 8. Content Quality

- [ ] All messages are grammatically correct
- [ ] All messages use consistent tone and style
- [ ] No messages reference internal code, variable names, or API field names
- [ ] Messages are understandable by non-technical retail traders

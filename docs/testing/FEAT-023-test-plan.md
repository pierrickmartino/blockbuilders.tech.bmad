# TST: Canvas Escape Hatch from Wizard

- [ ] Verify wizard flow shows a subtle link with exact copy: “I want to build manually”.
- [ ] Verify clicking “I want to build manually” creates a new blank strategy for the current user.
- [ ] Verify after click success, user is routed directly to that strategy’s empty canvas editor.
- [ ] Verify the opened strategy is blank (no wizard-generated blocks prefilled).
- [ ] Verify PostHog event `wizard_skipped` fires exactly once on successful skip.
- [ ] Verify `users.has_completed_onboarding` becomes `true` after successful skip.
- [ ] Verify returning login after successful skip routes user to dashboard (onboarded behavior).
- [ ] Failure handling checks:
  - [ ] Simulate strategy-creation failure and verify user remains in wizard.
  - [ ] Verify plain-language error message is shown with retry guidance.
  - [ ] Verify `wizard_skipped` is not fired on failure.
  - [ ] Verify `has_completed_onboarding` is not set to true on failure.
- [ ] Regression checks:
  - [ ] Main wizard CTA flow still works unchanged.
  - [ ] Existing `wizard_first_run_started` event still fires on first-run wizard entry.

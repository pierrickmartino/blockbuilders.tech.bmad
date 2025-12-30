# PRD: Auth UX/UI Improvements (Sign-in / Sign-up)

**Status:** Done  
**Owner:** Product  
**Area:** Frontend (Auth pages/components) + backend auth enablement  
**Primary users:** New and returning users signing into Blockbuilders  
**Target release:** Phase 2

---

## Summary

Improve the sign-in / sign-up experience to be faster, clearer, mobile-first, and accessible. Add OAuth (Google, GitHub) and password reset support to enable the UX changes.

---

## Goals

- Make auth flows quick to complete with clear form states.
- Keep form above the fold on desktop and mobile.
- Provide accessible, keyboard-friendly interactions.
- Add resilient validation, loading states, and double-submit prevention.

---

## Non-goals

- Changing core auth semantics, JWT format, or security model beyond OAuth/password reset support.
- Adding onboarding, profile setup, or billing steps.
- Introducing a new UI library or design system.

---

## User stories

- As a returning user, I can sign in quickly with a standard email/password form.
- As a new user, I can create an account without confusion or extra steps.
- As a user, I can use Google or GitHub to sign in.
- As a user who forgot a password, I can request a reset easily.
- As a keyboard-only or screen reader user, I can complete auth without blockers.

---

## UX/UI requirements

### Layout & flow

- Single auth panel with a clear toggle:
  - "Sign in" / "Create account"
- Form stays above the fold on desktop and mobile.
- Secondary content (value props/social proof) is optional:
  - Show on desktop if space allows.
  - Hidden on mobile.

### Form clarity

- Visible labels above inputs (no placeholder-only labels).
- Password rules show only when the password field is focused.
- Real-time validation with gentle, field-level errors.
- Validate on blur and/or after first submit attempt (avoid red errors on initial render).

### CTA & hierarchy

- One primary button per mode:
  - Sign in: "Sign in"
  - Create account: "Create account"
- Primary CTA is full-width on mobile.
- Secondary link to switch modes:
  - "Don’t have an account? Create one"
  - "Already have an account? Sign in"
- "Forgot password?" link in Sign in mode:
  - Opens a lightweight reset view or modal.
  - Email-only input with inline validation.
  - Confirm state: "If an account exists for this email, we’ve sent reset instructions."

### Trust & reassurance

- Add 1–2 short microcopy lines near CTA:
  - "No credit card required."
  - "We never share your data."
- OAuth buttons for Google and GitHub below primary CTA:
  - "Continue with Google"
  - "Continue with GitHub"

### Accessibility & polish

- Strong focus states on all interactive elements.
- Full keyboard navigation with logical tab order.
- Enter submits the form when valid.
- Proper `autocomplete` attributes.
- Submit behavior:
  - Loading state on submit.
  - Disable primary button while submitting.
  - Prevent double submit.

---

## Functional requirements

### Sign in

- Fields: email, password.
- Validation:
  - Email: required, valid email format.
  - Password: required.
- Autocomplete:
  - Email: `autocomplete="email"`
  - Password: `autocomplete="current-password"`

### Create account

- Fields: email, password.
- Validation:
  - Email: required, valid email format.
  - Password: required.
- Password rules (UI only, shown on focus):
  - Align with backend constraints.
  - If unknown, use generic guidance: "Use a strong password you don’t reuse elsewhere."
- Autocomplete:
  - Email: `autocomplete="email"`
  - Password: `autocomplete="new-password"`

### Password reset

- Trigger: "Forgot password?" link in Sign in mode.
- Input: email only, with validation.
- Confirmation message after submit (even if email not found):
  - "If an account exists for this email, we’ve sent reset instructions."

### OAuth

- Buttons for Google and GitHub.
- Appears below the primary CTA in both modes.

---

## Backend requirements

- Config/env:
  - Add OAuth client IDs/secrets and redirect URIs in `backend/app/core/config.py` via `.env`.
- Auth routes:
  - Add OAuth start + callback routes.
  - Add password reset request + confirm routes in `backend/app/api/auth.py`.
- User model/migrations:
  - Add provider identity fields or a join table (e.g., `provider`, `provider_user_id`).
  - Add reset-token fields.
  - Create Alembic migrations in `backend/alembic/versions`.
- Account linking:
  - Match by verified email before creating a new user record.
- Session/token handling:
  - Reuse `create_access_token` in `backend/app/core/security.py`.
- Security:
  - Validate OAuth state/nonce.
  - Rate-limit reset requests.
  - Expire reset tokens.

---

## Acceptance criteria

### Layout & responsiveness

- Auth view uses a single panel with Sign in / Create account toggle.
- On mobile, the form is above the fold (no required scrolling to reach CTA).
- Secondary content is hidden on mobile.

### Form behavior

- All inputs have visible labels above them.
- Password rules appear only when password input is focused.
- Real-time validation shows field-level errors.
- Errors appear on blur and/or after submit attempt (no immediate errors on initial render).

### CTA & mode switch

- Exactly one primary CTA per mode.
- Primary CTA is full-width on mobile.
- Secondary link switches modes without leaving the auth page.
- "Forgot password?" link is available in Sign in mode and leads to an email-only reset flow.

### Trust & reassurance

- Microcopy near CTA is present and unobtrusive (1–2 short lines).
- OAuth buttons for Google and GitHub appear below the primary CTA.

### Accessibility & polish

- Focus states are clearly visible.
- Fully keyboard navigable; toggle + inputs + CTA all reachable and usable.
- Correct `autocomplete` attributes implemented.
- Submit shows loading state and disables CTA to prevent double submit.

---

## Implementation notes

- Reuse existing form components/utilities already in the repo.
- Keep logic local to the auth page/component.
- If a form library is present, use it; otherwise keep validation simple and explicit.
- Use a single component that renders different fields based on mode to reduce duplication.

---

## QA checklist

- Test on desktop and mobile viewports.
- Keyboard-only flow works end-to-end.
- Password manager autofill works correctly.
- Toggle changes mode with clear behavior for typed values.
- Loading state prevents multiple requests.
- Errors are readable and consistently placed.

---

## Metrics (optional)

- Decrease auth form abandonment.
- Increase successful sign-ups per visit to auth page.
- Reduce repeated failed submissions (double clicks).

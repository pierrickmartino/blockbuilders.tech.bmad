# UX/UI Improvements for Sign-in / Sign-up

## Layout & flow
- Use a single auth panel with a clear toggle: “Sign in” / “Create account.”
- Keep the form above the fold on desktop and mobile.
- Treat any value props or social proof as optional secondary content; hide on mobile.

## Form clarity
- Use visible labels above inputs (no placeholder-only labels).
- Show password rules inline only on focus.
- Provide real-time validation with gentle, field-level errors.

## CTA & hierarchy
- One primary button per state; make it full-width on mobile.
- Provide a secondary link to switch modes (sign in ↔ create account).

## Trust & reassurance
- Add short microcopy like “No credit card required” or “We never share your data.”
- If OAuth is available, place buttons below the primary CTA.

## Accessibility & polish
- Strong focus states and full keyboard navigation support.
- Proper `autocomplete` attributes for password managers.
- Loading state on submit and disabled button to prevent double submit.

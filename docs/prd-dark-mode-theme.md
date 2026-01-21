# PRD: Dark Mode (Theme Preference)

## Summary
Add a user-selectable dark mode with a simple theme preference (system/light/dark). The preference is saved per user and applied across the app, including canvas, charts, and forms.

## Goals
- Provide a low-light interface option for extended sessions.
- Keep implementation minimal and consistent with existing Tailwind styling.
- Persist the user’s theme choice across sessions/devices.

## Non-Goals
- Multiple theme palettes or custom color pickers.
- Per-page theme overrides.
- Advanced theming engine or design token overhaul.

## User Stories
- As a user, I can switch the app to dark mode in settings.
- As a user, my theme choice is remembered on future visits.
- As a user, charts and the strategy canvas remain readable in dark mode.

## Scope
### Theme Preference
- Add a `theme_preference` field on the user profile: `system`, `light`, `dark`.
- Default to `system` for new users.
- Save and load preference via existing profile endpoints (`GET/PUT /users/me`).

### UI Coverage (Must Support)
- Global layout: nav, headers, sidebars, cards.
- Forms: inputs, selects, buttons, dialogs, dropdowns.
- Strategy canvas: background grid, node cards, ports, selection highlights.
- Charts: axis, gridlines, tooltips, and line colors.

### Settings UI
- Add a simple toggle/select in `/profile` under Display Preferences.
- Options: System, Light, Dark.

## UX/UI Notes
- Use Tailwind’s `dark` variant with a single class toggle on the root element.
- Keep contrast high for readability (text, borders, chart lines).
- Preserve existing status colors (success/error/warning) with dark-friendly shades.

## Data Model
- Add `theme_preference` to the `users` table.
  - Type: enum or string (`system`, `light`, `dark`)
  - Default: `system`

## API
- Extend existing `GET /users/me` and `PUT /users/me` to include `theme_preference`.
- No new endpoints required.

## Frontend Behavior
- On app load:
  - Read user profile preference (if logged in).
  - Apply theme class to the root element.
- If `system`, follow `prefers-color-scheme` and update on changes.
- Persist updates immediately when the user changes the setting.

## Acceptance Criteria
- Theme toggle exists in Profile > Display Preferences.
- Selected theme persists after refresh and login.
- Canvas, charts, and forms are legible and styled appropriately in dark mode.
- No additional theme settings or complexity introduced.

## Implementation Notes (Minimal)
- Use Tailwind’s built-in dark mode (`class` strategy).
- Store the preference on the user record; no extra tables.
- Reuse existing component classes; only add dark variants where needed.

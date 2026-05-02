# Test Checklist – Dark Mode (Theme Preference)

> Source PRD: `prd-dark-mode-theme.md`

---

## 1. Theme Preference Data Model & API

### 1.1 Data Model

- [x] `theme_preference` field exists on the `users` table
- [x] The field accepts values: `system`, `light`, `dark`
- [x] The default value for new users is `system`
- [ ] The field rejects invalid values (e.g., `midnight`, empty string, `null`)

### 1.2 GET /users/me

- [x] `GET /users/me` response includes `theme_preference` field
- [x] The returned value matches what was previously saved
- [x] For new users who have not set a preference, `system` is returned

### 1.3 PUT /users/me

- [x] `PUT /users/me` with `theme_preference: "dark"` saves successfully
- [x] `PUT /users/me` with `theme_preference: "light"` saves successfully
- [x] `PUT /users/me` with `theme_preference: "system"` saves successfully
- [x] `PUT /users/me` with an invalid `theme_preference` value returns a validation error
- [x] No new API endpoints are introduced (existing profile endpoints are extended)

---

## 2. Settings UI

### 2.1 Theme Toggle Location

- [x] A theme preference control exists in `/profile` under Display Preferences
- [x] The control offers three options: System, Light, Dark
- [x] The current user preference is pre-selected when the page loads

### 2.2 Theme Toggle Interaction

- [x] Selecting "Dark" switches the app to dark mode immediately
- [x] Selecting "Light" switches the app to light mode immediately
- [x] Selecting "System" follows the OS/browser `prefers-color-scheme` setting
- [x] The preference is persisted immediately when the user changes the setting (no separate save button needed)

---

## 3. Frontend Theme Application

### 3.1 On App Load

- [x] On load (logged-in user), the app reads the user's `theme_preference` from the profile
- [x] The correct theme class is applied to the root element based on the preference
- [x] If the preference is `system`, the app follows `prefers-color-scheme` media query

### 3.2 System Preference Tracking

- [x] When preference is `system` and the OS switches from light to dark mode, the app updates in real time
- [x] When preference is `system` and the OS switches from dark to light mode, the app updates in real time
- [x] When preference is explicitly `light` or `dark`, OS theme changes do not affect the app

### 3.3 Persistence Across Sessions

- [x] After selecting dark mode, refreshing the page retains dark mode
- [x] After selecting dark mode, logging out and logging back in retains dark mode
- [x] The theme preference is tied to the user account (not just browser local storage)

---

## 4. UI Coverage – Dark Mode Styling

### 4.1 Global Layout

- [x] Navigation bar is styled appropriately in dark mode (readable text, appropriate background)
- [x] Headers are legible in dark mode
- [x] Sidebars have appropriate dark mode styling
- [x] Cards and card content are readable in dark mode

### 4.2 Forms & Controls

- [x] Input fields have appropriate dark mode background, text, and border colors
- [x] Select/dropdown components are readable in dark mode
- [x] Buttons maintain appropriate contrast in dark mode
- [x] Dialog/modal components have dark mode styling
- [x] Dropdown menus are readable in dark mode

### 4.3 Strategy Canvas

- [x] Canvas background grid is visible and appropriate in dark mode
- [x] Node cards are readable with proper contrast in dark mode
- [x] Node ports/handles are visible in dark mode
- [x] Selection highlights are distinguishable in dark mode
- [x] Connection edges between nodes are visible in dark mode

### 4.4 Charts

- [x] Chart axes are readable in dark mode
- [ ] Chart gridlines are visible but not overpowering in dark mode
- [x] Chart tooltips have appropriate dark mode styling
- [x] Chart line/bar colors maintain sufficient contrast in dark mode
- [x] Equity curve chart is fully readable in dark mode

### 4.5 Status Colors

- [x] Success (green) color remains distinguishable in dark mode
- [x] Error (red) color remains distinguishable in dark mode
- [x] Warning (yellow/amber) color remains distinguishable in dark mode
- [x] Info (blue) color remains distinguishable in dark mode

---

## 5. Contrast & Readability

- [x] Text on dark backgrounds meets readable contrast ratios
- [x] Borders are visible against dark backgrounds
- [x] Placeholder text in inputs is readable in dark mode
- [x] Disabled elements are distinguishable from enabled elements in dark mode
- [x] Links are distinguishable from regular text in dark mode

---

## 6. Light Mode Regression

- [x] Switching to light mode after being in dark mode restores all original light styling
- [x] No dark mode artifacts remain when switching back to light mode
- [x] Existing light mode styling is not broken by the introduction of dark mode

---

## 7. Implementation Constraints

- [x] Tailwind's `dark` variant with the `class` strategy is used (class toggle on root element)
- [x] No additional theme settings or complexity beyond the three-option toggle
- [x] No extra database tables are introduced (single field on users table)
- [x] Existing component classes are reused; only dark variants are added where needed
- [x] No multiple theme palettes or custom color pickers are introduced
- [x] No per-page theme overrides are supported

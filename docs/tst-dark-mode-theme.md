# Test Checklist – Dark Mode (Theme Preference)

> Source PRD: `prd-dark-mode-theme.md`

---

## 1. Theme Preference Data Model & API

### 1.1 Data Model

- [ ] `theme_preference` field exists on the `users` table
- [ ] The field accepts values: `system`, `light`, `dark`
- [ ] The default value for new users is `system`
- [ ] The field rejects invalid values (e.g., `midnight`, empty string, `null`)

### 1.2 GET /users/me

- [x] `GET /users/me` response includes `theme_preference` field
- [ ] The returned value matches what was previously saved
- [ ] For new users who have not set a preference, `system` is returned

### 1.3 PUT /users/me

- [x] `PUT /users/me` with `theme_preference: "dark"` saves successfully
- [x] `PUT /users/me` with `theme_preference: "light"` saves successfully
- [x] `PUT /users/me` with `theme_preference: "system"` saves successfully
- [x] `PUT /users/me` with an invalid `theme_preference` value returns a validation error
- [ ] No new API endpoints are introduced (existing profile endpoints are extended)

---

## 2. Settings UI

### 2.1 Theme Toggle Location

- [ ] A theme preference control exists in `/profile` under Display Preferences
- [ ] The control offers three options: System, Light, Dark
- [ ] The current user preference is pre-selected when the page loads

### 2.2 Theme Toggle Interaction

- [ ] Selecting "Dark" switches the app to dark mode immediately
- [ ] Selecting "Light" switches the app to light mode immediately
- [ ] Selecting "System" follows the OS/browser `prefers-color-scheme` setting
- [ ] The preference is persisted immediately when the user changes the setting (no separate save button needed)

---

## 3. Frontend Theme Application

### 3.1 On App Load

- [ ] On load (logged-in user), the app reads the user's `theme_preference` from the profile
- [ ] The correct theme class is applied to the root element based on the preference
- [ ] If the preference is `system`, the app follows `prefers-color-scheme` media query

### 3.2 System Preference Tracking

- [ ] When preference is `system` and the OS switches from light to dark mode, the app updates in real time
- [ ] When preference is `system` and the OS switches from dark to light mode, the app updates in real time
- [ ] When preference is explicitly `light` or `dark`, OS theme changes do not affect the app

### 3.3 Persistence Across Sessions

- [ ] After selecting dark mode, refreshing the page retains dark mode
- [ ] After selecting dark mode, logging out and logging back in retains dark mode
- [ ] The theme preference is tied to the user account (not just browser local storage)

---

## 4. UI Coverage – Dark Mode Styling

### 4.1 Global Layout

- [ ] Navigation bar is styled appropriately in dark mode (readable text, appropriate background)
- [ ] Headers are legible in dark mode
- [ ] Sidebars have appropriate dark mode styling
- [ ] Cards and card content are readable in dark mode

### 4.2 Forms & Controls

- [ ] Input fields have appropriate dark mode background, text, and border colors
- [ ] Select/dropdown components are readable in dark mode
- [ ] Buttons maintain appropriate contrast in dark mode
- [ ] Dialog/modal components have dark mode styling
- [ ] Dropdown menus are readable in dark mode

### 4.3 Strategy Canvas

- [ ] Canvas background grid is visible and appropriate in dark mode
- [ ] Node cards are readable with proper contrast in dark mode
- [ ] Node ports/handles are visible in dark mode
- [ ] Selection highlights are distinguishable in dark mode
- [ ] Connection edges between nodes are visible in dark mode

### 4.4 Charts

- [ ] Chart axes are readable in dark mode
- [ ] Chart gridlines are visible but not overpowering in dark mode
- [ ] Chart tooltips have appropriate dark mode styling
- [ ] Chart line/bar colors maintain sufficient contrast in dark mode
- [ ] Equity curve chart is fully readable in dark mode

### 4.5 Status Colors

- [ ] Success (green) color remains distinguishable in dark mode
- [ ] Error (red) color remains distinguishable in dark mode
- [ ] Warning (yellow/amber) color remains distinguishable in dark mode
- [ ] Info (blue) color remains distinguishable in dark mode

---

## 5. Contrast & Readability

- [ ] Text on dark backgrounds meets readable contrast ratios
- [ ] Borders are visible against dark backgrounds
- [ ] Placeholder text in inputs is readable in dark mode
- [ ] Disabled elements are distinguishable from enabled elements in dark mode
- [ ] Links are distinguishable from regular text in dark mode

---

## 6. Light Mode Regression

- [ ] Switching to light mode after being in dark mode restores all original light styling
- [ ] No dark mode artifacts remain when switching back to light mode
- [ ] Existing light mode styling is not broken by the introduction of dark mode

---

## 7. Implementation Constraints

- [ ] Tailwind's `dark` variant with the `class` strategy is used (class toggle on root element)
- [ ] No additional theme settings or complexity beyond the three-option toggle
- [ ] No extra database tables are introduced (single field on users table)
- [ ] Existing component classes are reused; only dark variants are added where needed
- [ ] No multiple theme palettes or custom color pickers are introduced
- [ ] No per-page theme overrides are supported

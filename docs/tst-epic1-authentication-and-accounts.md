# Test Checklist – Authentication & Accounts (Epic 1)

> Source PRD: `prd-epic1-authentication-and-accounts.md`

---

## 1. Signup (S1.1)

### 1.1 API Tests – `POST /auth/signup`

- [x] Successful signup with valid email and password returns HTTP 200/201 with auth token and user object (`id`, `email`, `default_fee`, `default_slippage`)
- [ ] User record is created in the `users` table with hashed password (not plaintext)
- [x] Password is hashed using a modern algorithm (bcrypt or argon2)
- [ ] Default fee and slippage values are set on the created user record
- [x] Invalid email format returns a validation error with a clear message
- [x] Password shorter than 8 characters returns a validation error with a clear message
- [x] Missing email field returns a validation error
- [x] Missing password field returns a validation error
- [x] Duplicate email returns a clear, non-technical error (e.g., "Email already registered")
- [ ] Signup is transactional: no partial user creation on failure
- [x] Signup request completes in under 500ms under normal load

### 1.2 UI Tests – Signup Form

- [x] Signup page/modal displays email field, password field, and "Create account" button
- [x] Inline validation is shown for invalid email format before submission
- [x] Inline validation is shown for password that is too short
- [x] On successful signup, auth token/session is stored securely (cookie or localStorage)
- [x] On successful signup, user is redirected to the main app (strategy list or empty state)
- [x] On error (e.g., duplicate email), inline error message is displayed
- [x] Form is accessible and works on mobile viewports

---

## 2. Login & Session Persistence (S1.2)

### 2.1 API Tests – `POST /auth/login`

- [x] Successful login with correct email and password returns auth token and minimal user info
- [x] Incorrect password returns generic "Invalid email or password" message (does not reveal which field is wrong)
- [x] Non-existent email returns generic "Invalid email or password" message
- [x] Empty email field returns a validation error
- [ ] Empty password field returns a validation error
- [x] Login request completes in under 500ms under normal load

### 2.2 Session Persistence

- [ ] Auth token/cookie is automatically attached to all subsequent API calls
- [x] Session remains valid across page refreshes
- [ ] Session remains valid across browser restarts (within a reasonable lifetime, e.g., days)
- [ ] Expired session triggers a 401 response from protected endpoints
- [ ] On receiving a 401 response, the frontend redirects to the login page

### 2.3 API Tests – Logout (`POST /auth/logout`)

- [ ] Logout endpoint invalidates the session (if server-side sessions are used)
- [ ] After logout, previously valid token/session no longer grants access to protected endpoints
- [ ] Calling logout with an already-invalid token does not cause a server error

### 2.4 UI Tests – Logout

- [x] "Logout" action is visible in the UI (e.g., top-right menu)
- [x] Clicking logout clears stored tokens/cookies
- [ ] After logout, user is redirected to the login page
- [ ] After logout, navigating to a protected page redirects to login

---

## 3. Auth Protection (FR-2.4)

- [x] Strategy endpoints (`GET /strategies/`, `POST /strategies/`, etc.) require authentication and return 401 for unauthenticated requests
- [x] Backtest endpoints require authentication and return 401 for unauthenticated requests
- [x] Authenticated user can only see their own strategies (results are filtered by `user_id`)
- [x] Authenticated user can only see their own backtest runs (results are filtered by `user_id`)
- [x] Accessing another user's strategy by ID returns 404 (not 403, for security obfuscation)
- [x] Accessing another user's backtest run by ID returns 404

---

## 4. Account Settings – Fee & Slippage Defaults (S1.3)

### 4.1 API Tests – `GET /users/me`

- [x] Returns the current user's `id`, `email`, `default_fee_percent`, `default_slippage_percent`
- [ ] Returns timestamps (`created_at`, `updated_at`) if included
- [x] Requires authentication; returns 401 if unauthenticated

### 4.2 API Tests – `PUT /users/me`

- [x] Successfully updates `default_fee_percent` with a valid value (e.g., 0.1)
- [x] Successfully updates `default_slippage_percent` with a valid value (e.g., 0.05)
- [x] Updates are persisted and reflected in subsequent `GET /users/me` calls
- [x] Rejects negative values with a validation error
- [x] Rejects values exceeding the max (e.g., > 5%) with a validation error
- [x] Partial update works: sending only `default_fee_percent` does not reset `default_slippage_percent`
- [x] Requires authentication; returns 401 if unauthenticated

### 4.3 UI Tests – Account Settings Page

- [x] Settings page is accessible from a top-right menu or similar navigation
- [x] Email is displayed as read-only
- [x] Input fields for "Default trading fee (%)" and "Default slippage (%)" are present and editable
- [x] Save button is present and functional
- [x] Success feedback (toast or inline message) is shown after saving
- [ ] Error feedback is shown if save fails (e.g., invalid values)
- [x] Settings page is responsive and usable on mobile viewports

### 4.4 Integration – Defaults Used by Backtests

- [ ] When creating a new backtest without explicit fee/slippage overrides, the user's defaults are pre-filled in the backtest form
- [x] User-set defaults are applied by the backend if no overrides are provided in the backtest creation request

---

## 5. Security

- [ ] Passwords are never stored or returned in plaintext
- [x] Password hashes are stored using bcrypt or argon2
- [x] Login does not reveal whether the email or password is incorrect (generic error message)
- [ ] Brute force protection: repeated failed login attempts are rate-limited or delayed
- [ ] Auth tokens are not exposed in URLs or logs
- [ ] All auth-related responses use proper HTTP status codes (200, 201, 400, 401, 404)

---

## 6. Privacy & Data Isolation

- [x] Strategies list endpoint returns only the authenticated user's strategies
- [x] Backtests list endpoint returns only the authenticated user's runs
- [x] Accessing a resource by ID verifies ownership against the authenticated user
- [ ] No cross-user data leakage in any API response

---

## 7. Edge Cases

- [x] Signup with an email that has leading/trailing whitespace is handled (trimmed or rejected consistently)
- [ ] Signup with mixed-case email is handled consistently (e.g., case-insensitive lookup)
- [x] Very long email or password does not cause a server crash (reasonable max length enforcement)
- [ ] Concurrent signup requests with the same email do not create duplicate users
- [x] Login immediately after signup succeeds
- [x] Setting fee/slippage to 0 is accepted (zero is a valid value)
- [x] Setting fee/slippage to exactly the max boundary value (e.g., 5.0) is accepted

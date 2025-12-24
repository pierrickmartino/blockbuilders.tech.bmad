# PRD – Authentication & Accounts (Epic 1)  

---

## 1. Context & Scope

This PRD describes the **Authentication & Accounts** epic for Blockbuilders, covering:

- Email/password signup
- Login & session persistence
- Basic account settings for default **fee** and **slippage** assumptions

All of this is for the MVP as defined in `mvp.md`. fileciteturn0file0

Epic source: **Epic 1 – Authentication & Accounts** from `mvp_plan.md`. fileciteturn0file1  

---

## 2. Goals & Non-Goals

### 2.1 Goals

1. Let a user **create an account** using email and password.
2. Let a user **log in and stay logged in** across visits (within a sensible session lifetime).
3. Allow a user to configure **default fee % and slippage %** used by backtests. fileciteturn0file1  
4. Ensure that **strategies and backtest results are private per user**. fileciteturn0file0  

### 2.2 Non-Goals (MVP)

- No social login / OAuth (Google, GitHub, etc.).
- No multi-factor authentication.
- No advanced account/profile fields beyond what’s needed for fee/slippage defaults.
- No full billing/subscription management (covered in later phases).
- No complex session analytics or audit logging.

---

## 3. Users & Use Cases

### 3.1 Primary user

- **Retail crypto tinkerer** (non-technical, no coding skills). fileciteturn0file0  
- Wants to:
  - Create an account.
  - Sign back in later and find **their own** strategies and runs.
  - Configure backtest assumptions (fee, slippage) once and reuse them.

### 3.2 Key Use Cases

1. **First-time visit**
   - User signs up with email/password.
   - Immediately lands in the app as an authenticated user.

2. **Returning visit**
   - User opens the app.
   - If session still valid, user is automatically recognized.
   - Otherwise, user logs in via login form.

3. **Adjusting assumptions**
   - User opens Settings.
   - Sets default fee and slippage.
   - Later backtests use these defaults unless explicitly overridden in backtest configuration. fileciteturn0file1  

---

## 4. User Stories (Epic 1)

From `mvp_plan.md`: fileciteturn0file1  

1. **S1.1 – Email/password signup**  
   > As a new user, I want to create an account with email and password, so that I can save my strategies and runs.

2. **S1.2 – Login & session persistence**  
   > As a user, I want to log in and stay logged in, so that I can come back and see my work without re-authenticating every minute.

3. **S1.3 – Basic account settings (fee & slippage defaults)**  
   > As a user, I want to set my default trading fee and slippage assumptions, so that my backtests match my usual exchange conditions.

---

## 5. Functional Requirements

### 5.1 Signup

**FR-1.1 – Signup endpoint**

- **Endpoint:** `POST /auth/signup`
- **Request body (minimal):**
  - `email` (string, required)
  - `password` (string, required)
- **Behavior:**
  - Validate email format.
  - Validate password (simple minimum length, e.g. 8 characters).
  - Reject if email already exists with clear, non-technical error message.
  - Store password **hashed** using a modern algorithm (e.g. bcrypt/argon2).
  - Create a `users` row with default settings (fee, slippage).
- **Response:**
  - On success: return auth token (JWT or session cookie) and a minimal user object (`id`, `email`, `default_fee`, `default_slippage`).
  - On error: validation errors and/or “email already registered” message.

**FR-1.2 – Frontend signup form**

- Simple page or modal with:
  - Email field
  - Password field
  - “Create account” button
- Show inline validation and error messages.
- On success:
  - Store token/session via secure mechanism.
  - Redirect to main app (e.g. strategy list or “no strategies yet” screen).

---

### 5.2 Login & Session Persistence

**FR-2.1 – Login endpoint**

- **Endpoint:** `POST /auth/login`
- **Request body:**
  - `email` (string)
  - `password` (string)
- **Behavior:**
  - Validate credentials against stored hashed password.
  - On success: issue JWT or session token. (MVP allows either **session-based or JWT-based auth**. fileciteturn0file0)
  - On failure: generic “Invalid email or password” message (do not reveal which one is wrong).
- **Response:**
  - Auth token / auth cookie.
  - Minimal user info.

**FR-2.2 – Session persistence**

- Frontend must:
  - Automatically attach auth token/cookie to all API calls that require authentication. fileciteturn0file1  
  - Detect 401 responses and redirect to login page.
- Session should remain valid for a reasonable period (e.g. days) unless user logs out.

**FR-2.3 – Logout**

- Provide a simple “Logout” action in the UI.
- Frontend:
  - Clears any stored tokens.
  - Redirects to login page.
- Backend:
  - If using server-side sessions, provide `POST /auth/logout` to invalidate session.

**FR-2.4 – Auth protection for core resources**

- All **strategy** and **backtest** endpoints must require a valid authenticated user and **scope results to that user only** (e.g. filter by `user_id`). fileciteturn0file0  

---

### 5.3 Account Settings (Fee & Slippage Defaults)

**FR-3.1 – User settings endpoint**

- **Endpoint:** `GET /users/me`
  - Returns:
    - `id`
    - `email`
    - `default_fee_percent` (e.g. 0.1)
    - `default_slippage_percent` (e.g. 0.05)
    - Timestamps (`created_at`, `updated_at`) if helpful.
- **Endpoint:** `PUT /users/me`
  - Request body:
    - `default_fee_percent` (float, optional)
    - `default_slippage_percent` (float, optional)
  - Behavior:
    - Validate values are non-negative and within sensible max (e.g. <= 5%).
    - Update user settings.

**FR-3.2 – Account settings UI**

- **Page:** “Account Settings” or “Profile”
  - Editable fields:
    - “Default trading fee (%)”
    - “Default slippage (%)”
  - Save button with success/error feedback.
- Subsequent backtest creation should:
  - Pre-fill fee and slippage from these defaults **if the user does not override them** in the backtest form. fileciteturn0file1  

---

## 6. Data Model (MVP-level)

### 6.1 `users` Table

Derived from core data model in `mvp.md`. fileciteturn0file0  

Minimum fields:

- `id` (UUID / integer PK)
- `email` (unique)
- `password_hash`
- `default_fee_percent` (float, nullable with sensible default)
- `default_slippage_percent` (float, nullable with sensible default)
- `created_at`, `updated_at`

Relationships:

- `strategies.user_id` → `users.id`
- `backtest_runs.user_id` → `users.id`

---

## 7. UX & Flows (Simple)

### 7.1 Signup Flow

1. User clicks **“Sign up”**.
2. Enters email & password.
3. Submits form.
4. On success:
   - App sets auth session/token.
   - Redirect to app home (strategy list).
   - Optionally show a “Welcome” message.
5. On failure:
   - Show inline error (e.g. “Email already registered”).

### 7.2 Login Flow

1. User visits app without valid session.
2. Redirect to **Login**.
3. User enters email & password.
4. On success:
   - App sets auth session/token.
   - Redirect to app home (strategy list).
5. On failure:
   - Show inline error (“Invalid email or password”).

### 7.3 Settings Flow

1. User opens **Account Settings** from top-right menu (or similar).
2. Sees:
   - Email (read-only).
   - Inputs for default fee and slippage.
3. Edits values and clicks **Save**.
4. Success toast / inline message.
5. Future backtest UIs use these as pre-filled defaults.

---

## 8. Privacy, Security & Constraints

### 8.1 Privacy

- All strategies and backtests are **per-user** and must never leak across users:
  - List endpoints for strategies/backtests **must filter** by authenticated user.
  - Access by ID must verify the record belongs to the current user. fileciteturn0file0  

### 8.2 Security

- Passwords always stored as secure hashes.
- Use HTTPS in all environments where real users are involved.
- Limit sign-up and login brute force attempts (simple rate limiting or delay on repeated failures is sufficient for MVP).

### 8.3 Simplicity Constraints

- Stick to **one simple auth mechanism** (JWT or session cookies) for MVP.
- Avoid extra complexity like roles/permissions; all users have the same role.
- No complex profile fields beyond what is essential for MVP.

---

## 9. Non-Functional Requirements (Auth Scope)

Based on global MVP non-functional requirements. fileciteturn0file0  

- **Performance**
  - Signup and login requests should typically complete in < 500 ms under normal load.
- **Reliability**
  - Auth endpoints must give clear error messages (invalid credentials, email taken).
  - No partial user creation (transactional).
- **Simplicity in Operations**
  - Authentication implemented in the existing **FastAPI monolith**.
  - No separate auth service or additional infrastructure.

---

## 10. Acceptance Criteria

The epic is **Done** when:

1. A new user can sign up from the frontend, receive a token/session, and be redirected into the app (S1.1).
2. A returning user can log in, retain a session across page refreshes, and access only their own strategies/backtests (S1.2).
3. A logged-in user can view and update default fee/slippage, and new backtests use those defaults in the UI (S1.3).
4. Unauthenticated users:
   - Cannot access strategy or backtest endpoints.
   - Are redirected to login when hitting protected pages.
5. Basic automated tests exist for:
   - Signup, login, invalid login.
   - Authenticated vs unauthenticated access to a protected endpoint.
   - Updating and reading `/users/me` settings.

---

## 11. Open Questions / Future Enhancements (Non-blocking)

- Password reset / “forgot password” flow (may be added later if needed).
- Email verification for new accounts.
- Session timeout duration and refresh strategy.
- Optional: display of last login time to the user.

These do **not** block the MVP; they can be handled in future iterations if needed.

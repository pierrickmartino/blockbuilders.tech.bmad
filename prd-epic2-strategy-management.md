# PRD – Strategy Management (Epic 2)

> This PRD covers **Epic 2 – Strategy Management** (S2.1–S2.4) from `mvp_plan.md`, aligned with the MVP requirements defined in `mvp.md`.

---

## 1. Context & Scope

Blockbuilders is a **no-code strategy lab** where a retail crypto trader builds and backtests simple, single-asset strategies.

This epic delivers the **CRUD + versioning** around “strategies”:

- Create a strategy (name, asset, timeframe).
- See a list of your strategies.
- Edit metadata, duplicate, and archive.
- Store and access strategy **versions** (JSON definition).

The **visual canvas itself** (blocks, drag-and-drop) is handled in **Epic 3 – Strategy Canvas**; this epic only ensures strategies exist, can be managed, and can persist their JSON logic.

---

## 2. Goals & Non-Goals

### 2.1 Goals

1. **Let a logged-in user manage their strategies**:
   - Create, view, edit, duplicate, archive.
2. **Enforce MVP constraints**:
   - **Single asset per strategy**, **single timeframe per strategy**, and assets/timeframes limited to MVP-supported sets.
3. **Provide basic versioning**:
   - Each save of strategy logic creates a new version (JSON payload), with timestamps and a simple way to view/select versions.
4. **Prepare for backtests & scheduling**:
   - Strategies must be easily referenced by backtests and later by scheduled re-backtests.

### 2.2 Non-Goals

- No **multi-asset** or **multi-timeframe** strategies.
- No strategy sharing/marketplace.
- No complex tagging or folder hierarchy.
- No advanced search/filters (simple text search & sorting only).
- No usage limits implementation (Epic 7 will enforce those).

---

## 3. User Stories in Scope (from `mvp_plan.md`)

### S2.1 – Create a blank strategy

> As a user, I want to create a new blank strategy with a name, asset, and timeframe, so that I have a starting point for building my logic.

### S2.2 – List my strategies

> As a user, I want to see a list of my strategies, so that I can quickly open, manage, and understand what I’ve already built.

### S2.3 – Edit, duplicate, archive a strategy

> As a user, I want to edit, duplicate, and archive a strategy, so that I can iterate safely without losing old work.

### S2.4 – Strategy versioning

> As a user, I want each save to create a version of my strategy, so that I can roll back or compare past ideas.

---

## 4. Product Requirements

### 4.1 Strategy Concept

A **strategy** is:

- Owned by a **single user**.
- Defined for **one asset** (e.g. BTC/USDT) and **one timeframe** (e.g. 1h).
- Has:
  - Human-friendly **name**.
  - Status: **active** or **archived**.
  - An associated set of **versions**, each with a JSON definition of the logic (used by Strategy Canvas & backtests).

Assets/timeframes must be chosen from a **small, curated list** aligned with the MVP: e.g. BTC/USDT, ETH/USDT, and a few more; 1h and 4h timeframes.

---

### 4.2 Create Strategy (S2.1)

**UI flow**

1. User is logged in.
2. User clicks **“New strategy”** button from:
   - Strategies list page.
3. Modal or separate page appears with form:
   - **Name** (required, text).
   - **Asset** (required, select from supported assets).
   - **Timeframe** (required, select from supported timeframes).
4. User submits:
   - On success:
     - Strategy is created.
     - User is redirected to the **Strategy Editor page** for that strategy (`/strategies/{id}`), which in Epic 3 will show the canvas.
   - On validation error:
     - Inline error messages (e.g. “Name is required”, “Invalid asset”).

**Functional requirements**

- **Endpoint**: `POST /strategies/`
  - Auth required.
  - Request body:
    - `name: string`
    - `asset: string` (must be in allowed set)
    - `timeframe: string` (must be in allowed set)
  - Behaviour:
    - Create row in `strategies` linked to current user.
    - Default `is_archived = false`.
  - Response:
    - Strategy object (id, name, asset, timeframe, is_archived, created_at, updated_at).

- Validate:
  - Non-empty name.
  - Asset/timeframe are allowed.
  - The number of strategies per user is **not** enforced here (usage limits later).

---

### 4.3 List Strategies (S2.2)

**UI**

- Page `/strategies` showing a table of **current user’s** strategies (non-archived by default).
- Columns:
  - Name
  - Asset
  - Timeframe
  - Last modified date
  - Auto-update flag (placeholder column, will hook into Epic 6; for now just shows value).
- Actions per row:
  - **Open** (click row or “Open” button → Strategy Editor).
  - Secondary actions: **Duplicate**, **Archive** (via simple dropdown or icon menu).

**Interactions**

- Simple search box that filters by name (client-side or via query parameter).
- Simple sorting by:
  - Last modified (default desc).
  - Name.

**Functional requirements**

- **Endpoint**: `GET /strategies/`
  - Returns **only the authenticated user’s strategies**.
  - Query params:
    - `search` (optional; filters by case-insensitive name substring).
    - `include_archived` (optional, default `false`).
  - Response: list of strategy objects.

---

### 4.4 Edit, Duplicate, Archive (S2.3)

#### 4.4.1 Edit strategy metadata

**What can be edited**

- `name`
- (Optionally) `asset` and `timeframe` if there is **no backtest yet**, otherwise keep it simple and **disallow changing asset/timeframe** to avoid confusion.

**UI**

- In Strategy Editor page:
  - Name editable inline (e.g. text field at top).
  - Asset/timeframe displayed as labels; if editable, use small inline dropdowns.

**Functional requirements**

- **Endpoint**: `PATCH /strategies/{id}`
  - Body (all optional):
    - `name: string`
    - `asset: string`
    - `timeframe: string`
  - Validation:
    - User must own the strategy.
    - If asset/timeframe changes are allowed, still enforce allowed sets.
  - Response: updated strategy.

---

#### 4.4.2 Archive / Unarchive

**Behaviour**

- Archive: removes strategy from default list, but keeps it in DB for history/undo.
- Unarchive: allows to bring it back.

**UI**

- On strategies list:
  - Row action: “Archive”.
- Provide a simple **“Show archived”** toggle or filter to see archived strategies (for unarchiving).

**Functional requirements**

- Strategy has field `is_archived: boolean`.
- **Endpoint**:
  - Use `PATCH /strategies/{id}` with body `{ "is_archived": true }` / `{ "is_archived": false }`.
- When `GET /strategies/` is called with default params, **exclude archived** strategies.

---

#### 4.4.3 Duplicate strategy

**Behaviour**

- Create a **new strategy** with:
  - Same asset, timeframe, and name with “(copy)” or similar suffix.
  - Copies the **latest strategy version** (logic JSON) into the first version of the new strategy.

**UI**

- In strategies list:
  - Row action: “Duplicate”.
- On success:
  - Redirect user to the new strategy’s editor page.

**Functional requirements**

- **Endpoint**: `POST /strategies/{id}/duplicate`
  - Validates ownership.
  - Reads latest `strategy_versions` row for original strategy (if exists).
  - Creates new strategy row with:
    - Name = `"{original_name} (copy)"` (or similar).
    - Same asset/timeframe.
  - Creates **one version** for the new strategy with same JSON as original latest version.
- Response: new strategy object.

---

### 4.5 Strategy Versioning (S2.4)

This connects to a key MVP requirement: **each save creates a new version with timestamp, and we show basic version history.**

#### 4.5.1 Data model

- Table: `strategy_versions`
  - `id`
  - `strategy_id` (FK to `strategies`)
  - `version_number` (integer, monotonic per strategy, starting at 1)
  - `definition` (JSON; full graph from Strategy Canvas)
  - `created_at` (timestamp)

#### 4.5.2 Saving a version

**Trigger**

- From Strategy Editor page, when the user clicks **“Save”** (Epic 3 will define how the canvas works; this epic just defines the storage semantics).

**Functional requirements**

- **Endpoint**: `POST /strategies/{id}/versions`
  - Auth + ownership required.
  - Body:
    - `definition: object` (strategy canvas JSON).
  - Behaviour:
    - Find current max `version_number` for that strategy; new version = max + 1 (or 1 if none).
    - Insert new row in `strategy_versions`.
    - Update `strategies.updated_at` to now.
  - Response:
    - Newly created version (id, version_number, created_at).

> Note: No “update in place” of a version – each save creates a new row. This keeps the model simple.

---

#### 4.5.3 Listing and selecting versions

**UI requirements**

- On Strategy Editor page:
  - A simple dropdown or side panel listing versions:
    - e.g. `v3 – 2025-01-10 14:22`
  - Selecting a version:
    - Loads its `definition` JSON into canvas (Epic 3) and updates editor state.
  - Indicate current version clearly.

**Functional requirements**

- **Endpoint**: `GET /strategies/{id}/versions`
  - Returns:
    - List of versions sorted by `created_at` descending.
- **Endpoint**: `GET /strategies/{id}/versions/{version_number}`
  - Returns:
    - Single version including `definition`.

---

### 4.6 Permissions & Security

- All endpoints are **auth-protected**.
- A strategy is always scoped to a **single user** (no shared strategies in MVP).
- If a user tries to access, edit, duplicate, or see versions of another user’s strategy:
  - Return `404` (not found) or `403` (forbidden); choose one consistent pattern (prefer `404` for simplicity/obfuscation).

---

## 5. Data Model (Minimal Fields)

Aligning with `mvp.md`’s core tables.

### 5.1 `strategies` table

Minimum columns:

- `id` (PK)
- `user_id` (FK to `users`)
- `name` (text)
- `asset` (text; one of supported)
- `timeframe` (text; one of supported)
- `is_archived` (boolean; default false)
- `auto_update_enabled` (boolean; default false, provided for Epic 6)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 5.2 `strategy_versions` table

- `id` (PK)
- `strategy_id` (FK to `strategies`)
- `version_number` (int)
- `definition` (JSONB)
- `created_at` (timestamp)

Indexes:

- `(strategy_id, version_number)` unique.
- Optional: index on `(user_id, is_archived)` via join with strategies for faster listing, but can be added later if needed.

---

## 6. Non-Functional Requirements

- **Simplicity first**:
  - Single backend (FastAPI monolith) and DB as described in MVP architecture.
- **Performance**:
  - Listing strategies for a user should be fast (< 200–300 ms) under typical conditions (as per MVP), but strategies volume is expected to be low in early beta.
- **Reliability**:
  - Version saves are **append-only**; no partial overwrite.
  - Archive/duplicate operations must either succeed fully or return a clear error.

---

## 7. Open Simplifications / Defaults

To keep this epic simple:

1. **No pagination** on `/strategies/` for MVP. If needed, add later.
2. **No “compare versions” UI** – only list & load.
3. **No tags** or complex metadata beyond what’s specified.
4. **No soft limits enforcement** yet – but design allows counting strategies per user later.


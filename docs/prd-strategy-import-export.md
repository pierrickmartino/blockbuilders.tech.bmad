# PRD: Strategy Import/Export

**Status:** Proposed
**Owner:** Product
**Last Updated:** 2026-01-01

---

## 1. Summary
Add a simple data portability feature that lets users export a strategy to a JSON file and import a JSON file to create a new strategy. This enables backup, sharing outside the platform, and migration between accounts with minimal UI.

---

## 2. Goals
- Allow users to download a JSON file containing a strategy and its latest definition.
- Allow users to upload a JSON file to create a new strategy.
- Validate imported JSON and show clear errors before creating anything.
- Keep the implementation minimal with no new dependencies.

## 3. Non-Goals
- No in-app sharing links or public strategy marketplace.
- No importing backtest runs, results, or notifications.
- No multi-strategy bundle export/import.
- No schema version upgrades or migrations (fail fast if unsupported).

---

## 4. Target Users
- Traders who want a backup of their work.
- Users moving strategies between accounts.
- Users sharing strategies outside the platform.

---

## 5. User Stories
1. As a user, I can export a strategy to a JSON file for safekeeping.
2. As a user, I can import a JSON file to create a new strategy.
3. As a user, I get clear validation errors if the file is invalid.

---

## 6. UX Flow (Minimal)

**Export:**
1. User opens a strategy (or strategy list) and clicks “Export”.
2. Browser downloads a `.json` file with a clear name (e.g., `strategy-{name}-{date}.json`).

**Import:**
1. User clicks “Import Strategy” from the strategy list.
2. User selects a `.json` file.
3. Frontend parses the file and shows a quick summary (name, asset, timeframe).
4. User confirms import.
5. System creates a new strategy + version and navigates to it.

---

## 7. Data Model (Export File)
The file is a single JSON object with a minimal, stable structure.

```json
{
  "schema_version": 1,
  "exported_at": "2026-01-01T12:00:00Z",
  "strategy": {
    "name": "My Strategy",
    "asset": "BTC/USDT",
    "timeframe": "4h"
  },
  "definition_json": {
    "blocks": [],
    "connections": []
  }
}
```

**Field rules:**
- `schema_version`: required, integer (currently `1`).
- `exported_at`: required, ISO timestamp string.
- `strategy.name`: required, string, trimmed.
- `strategy.asset`: required, must be in allowed assets list.
- `strategy.timeframe`: required, must be supported timeframe.
- `definition_json`: required, must match the existing strategy definition format.

---

## 8. Validation
**Frontend validation (fast checks):**
- JSON parses successfully.
- Required top-level fields exist.
- `schema_version` is supported.
- `strategy` fields are non-empty strings.

**Backend validation (authoritative):**
- `asset` and `timeframe` are allowed values.
- `definition_json` passes existing strategy validation rules.
- Imported strategy always creates a **new** record (never overwrite).

---

## 9. Minimal API Approach
Use existing endpoints where possible to keep code small:
- **Export:** frontend fetches strategy + latest version, then builds JSON file client-side.
- **Import:** frontend parses JSON, then calls:
  1. `POST /strategies` to create the strategy.
  2. `POST /strategies/{id}/versions` to save `definition_json`.

If the backend currently validates on version save, reuse that; otherwise, add the smallest validation check to reject invalid imports before saving.

---

## 10. UI Placement (Minimal)
- **Strategy list page:** add “Import Strategy” and “Export” action (per strategy).
- **Strategy detail page:** add “Export” action near strategy name or overflow menu.

---

## 11. Acceptance Criteria
- ✅ User can export a strategy as a JSON file.
- ✅ User can import a valid JSON file and a new strategy is created.
- ✅ Import rejects invalid JSON with a clear error message.
- ✅ Imported strategy is independent and never overwrites an existing one.
- ✅ Export includes only strategy metadata + latest definition JSON (no runs or results).

---

## 12. Implementation Notes
- Keep file format minimal and stable; do not include extra fields unless required.
- Use existing strategy validation rules; do not add new complex validators.
- Prefer client-side file handling to avoid new backend endpoints.

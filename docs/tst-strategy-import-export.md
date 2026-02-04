# Test Checklist -- Strategy Import/Export

> Source PRD: `prd-strategy-import-export.md`

## 1. Export -- File Generation

- [ ] Clicking "Export" on a strategy downloads a `.json` file
- [ ] Downloaded file name follows the pattern `strategy-{name}-{date}.json`
- [ ] Exported file contains `schema_version` field set to integer `1`
- [ ] Exported file contains `exported_at` field as a valid ISO 8601 timestamp
- [ ] Exported file contains `strategy.name` matching the strategy name
- [ ] Exported file contains `strategy.asset` matching the strategy asset
- [ ] Exported file contains `strategy.timeframe` matching the strategy timeframe
- [ ] Exported file contains `definition_json` with the latest version's `blocks` and `connections`
- [ ] Exported file does NOT include backtest runs, results, or notification data
- [ ] Exported file does NOT include user IDs or account-specific metadata
- [ ] Exported JSON is valid and parseable

## 2. Export -- UI Placement

- [ ] "Export" action is available per strategy on the strategy list page
- [ ] "Export" action is available on the strategy detail/editor page (near strategy name or overflow menu)
- [ ] Export action triggers a browser file download without navigating away

## 3. Import -- Valid File

- [ ] "Import Strategy" button is visible on the strategy list page
- [ ] Clicking "Import Strategy" opens a file picker that accepts `.json` files
- [ ] After selecting a valid file, a summary is shown (name, asset, timeframe)
- [ ] User can confirm or cancel the import after seeing the summary
- [ ] Confirming import creates a new strategy via `POST /strategies`
- [ ] Confirming import creates a new strategy version via `POST /strategies/{id}/versions`
- [ ] After import, user is navigated to the newly created strategy
- [ ] Imported strategy is fully independent (new ID, not linked to the original)
- [ ] Importing the same file twice creates two separate strategies (never overwrites)

## 4. Import -- Frontend Validation

- [ ] Importing a non-JSON file shows a clear error message
- [ ] Importing a malformed JSON file shows a clear error message
- [ ] Importing JSON missing `schema_version` shows a clear error message
- [ ] Importing JSON with unsupported `schema_version` (e.g., 999) shows a clear error message
- [ ] Importing JSON missing `strategy` object shows a clear error message
- [ ] Importing JSON with empty `strategy.name` shows a clear error message
- [ ] Importing JSON with empty `strategy.asset` shows a clear error message
- [ ] Importing JSON with empty `strategy.timeframe` shows a clear error message
- [ ] Importing JSON missing `definition_json` shows a clear error message
- [ ] Importing JSON missing `exported_at` shows a clear error message
- [ ] Validation errors are shown before any API call is made

## 5. Import -- Backend Validation

- [ ] Backend rejects import with `asset` not in the allowed assets list (HTTP 400)
- [ ] Backend rejects import with `timeframe` not in the supported timeframes (HTTP 400)
- [ ] Backend rejects import with invalid `definition_json` (fails existing strategy validation rules)
- [ ] Backend error response includes a clear, plain-language message
- [ ] Imported strategy always creates a new record (never updates an existing strategy)

## 6. Data Model -- Export File Format

- [ ] `schema_version` is required and must be an integer
- [ ] `exported_at` is required and must be an ISO timestamp string
- [ ] `strategy.name` is required, string, and trimmed
- [ ] `strategy.asset` is required and must be in the allowed assets list
- [ ] `strategy.timeframe` is required and must be a supported timeframe
- [ ] `definition_json` is required and contains `blocks` and `connections`

## 7. Round-Trip Integrity

- [ ] Exporting a strategy and importing the same file recreates an equivalent strategy
- [ ] Exported definition_json, when imported, produces the same canvas layout (blocks and connections)
- [ ] Strategy name, asset, and timeframe are preserved through export/import
- [ ] Importing an exported strategy and then re-exporting produces a structurally equivalent file

## 8. Edge Cases

- [ ] Exporting a strategy with no blocks (empty definition) produces a valid file
- [ ] Importing a strategy with no blocks creates a valid empty strategy
- [ ] Exporting a strategy with note nodes includes notes in definition_json
- [ ] Importing a file with very long strategy name handles truncation or validation gracefully
- [ ] Importing a file with extra unexpected fields does not cause errors (extra fields are ignored)
- [ ] Importing a zero-byte file shows a clear error message
- [ ] Importing a very large file (e.g., >10MB) is handled gracefully (error or size limit)

## 9. Security and Auth

- [ ] Export is only available for strategies owned by the authenticated user
- [ ] Import requires authentication (unauthenticated requests return 401)
- [ ] Imported strategy is created under the authenticated user's account
- [ ] No cross-user data leakage through import/export
- [ ] Exported file does not contain sensitive user data (passwords, tokens, email)

## 10. Non-Goals Verification

- [ ] No in-app sharing link is generated during export
- [ ] Backtest runs and results are NOT included in the export file
- [ ] Multi-strategy bundle export is NOT supported (single strategy per file)
- [ ] Schema version migration is NOT performed (unsupported versions fail fast)
